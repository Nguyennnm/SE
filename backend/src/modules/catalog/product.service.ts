import { isDatabaseConnected, query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';
import { facetGroups, matchesSpecs, specKeys, type FacetRow } from './product.facets.js';
import {
  MOCK_TEST_PRODUCTS,
  type Product,
  type ProductImage,
  type ProductSearchParams,
  type ProductSearchResult,
  type ProductVariant,
} from './Product.model.js';

// Tiện ích chuẩn hóa chuỗi tiếng Việt tìm kiếm không dấu / có dấu (bản mock)
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * SQL: bỏ dấu tiếng Việt để so sánh không phân biệt có dấu/không dấu.
 * Cần extension `unaccent` (xem database/migrations/005_enable_unaccent.sql).
 * `translate(..., 'đ', 'd')` là lưới an toàn vì một số bản unaccent không đổi 'đ' -> 'd'.
 */
const stripAccents = (expr: string) =>
  `translate(unaccent(lower(${expr})), 'đ', 'd')`;

function requireMockMode(): void {
  if (!env.ALLOW_MOCK_DATA) {
    throw new AppError('Chưa kết nối được PostgreSQL. Vui lòng kiểm tra database và cấu hình kết nối.', 503, 'DATABASE_UNAVAILABLE');
  }
}

/**
 * Apply specifications, price and availability to the SAME SKU first.
 * Pick the cheapest eligible variant for each product. Count, displayed price,
 * stock and returned variants all refer to the same eligible set.
 */
const searchCte = (conditions: string[]) => `
WITH eligible_variants AS (
  SELECT v.*, GREATEST(COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0), 0) AS available
  FROM product_variants v
  LEFT JOIN inventory_items i ON i.variant_id = v.id
  WHERE ${conditions.join(' AND ')}
),
rep_variant AS (
  SELECT DISTINCT ON (v.product_id) v.product_id, v.id AS variant_id,
    v.sku, v.variant_name, v.selling_price_vnd, v.ram_gb, v.storage_gb, v.available
  FROM eligible_variants v
  ORDER BY v.product_id, v.selling_price_vnd ASC NULLS LAST, v.id ASC
),
variant_stats AS (
  SELECT v.product_id, COUNT(*) AS variant_count, COALESCE(SUM(v.available), 0) AS total_available,
    BOOL_OR(v.available > 0) AS has_stock
  FROM eligible_variants v GROUP BY v.product_id
)`;

export class ProductService {
  /**
   * UC17: Tìm kiếm và lọc sản phẩm
   * Tuân thủ quy tắc BR04 (AND logic cho tất cả bộ lọc)
   */
  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    // 1. Nếu cơ sở dữ liệu PostgreSQL đang hoạt động -> Truy vấn qua SQL
    if (isDatabaseConnected()) {
      return this.searchDatabase(params, page, limit, offset);
    }

    // 2. Fallback / Test Data mode (phục vụ kiểm thử TC17-01 đến TC17-05 theo TestPlan-TestCase.pdf)
    requireMockMode();
    return this.searchMockData(params, page, limit, offset);
  }

  /**
   * Truy vấn sản phẩm từ cơ sở dữ liệu PostgreSQL
   */
  private async searchDatabase(
    params: ProductSearchParams,
    page: number,
    limit: number,
    offset: number
  ): Promise<ProductSearchResult> {
    const whereConditions: string[] = ['p.is_active = TRUE'];
    const values: any[] = [];
    let paramIndex = 1;
    const variantConditions = ['v.is_active = TRUE'];
    if (specKeys.some(key => params[key]?.length)) {
      const rows = await this.getFacetRows(params.category);
      const ids = rows.filter(row => matchesSpecs(row, params)).map(row => row.id);
      variantConditions.push(`v.id = ANY($${paramIndex++}::bigint[])`);
      values.push(ids);
    }
    for (const [key, operator] of [['minPrice', '>='], ['maxPrice', '<=']] as const) {
      if (params[key] !== undefined) {
        variantConditions.push(`v.selling_price_vnd ${operator} $${paramIndex++}`);
        values.push(params[key]);
      }
    }
    if (params.inStock) variantConditions.push('COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0) > 0');
    const cte = searchCte(variantConditions);
    const variantValues = [...values];
    whereConditions.push('rv.variant_id IS NOT NULL');
    if (params.ids) {
      whereConditions.push(`p.id::text = ANY($${paramIndex++}::text[])`);
      values.push(params.ids);
    }

    // 1. Tìm kiếm từ khóa (Keyword q) — không phân biệt có dấu/không dấu (BR04).
    //    So khớp trên tên model, thương hiệu, danh mục và tên biến thể.
    for (const word of params.q?.trim().split(/\s+/).filter(Boolean) ?? []) {
      // Treat wildcard characters as literal input; each word must match.
      const kw = `%${word.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      const like = `${stripAccents(`$${paramIndex}`)}`;
      whereConditions.push(
        `(${stripAccents('p.model_name')} LIKE ${like} ` +
          `OR ${stripAccents('b.name')} LIKE ${like} ` +
          `OR ${stripAccents('c.name')} LIKE ${like} ` +
          `OR EXISTS (SELECT 1 FROM eligible_variants v2 WHERE v2.product_id = p.id ` +
          `AND ${stripAccents('v2.variant_name')} LIKE ${like}))`
      );
      values.push(kw);
      paramIndex++;
    }

    // 2. Lọc danh mục (Category) - BR04 (AND logic)
    if (params.category && params.category !== 'Tất cả') {
      whereConditions.push(
        `(c.code = $${paramIndex} OR ${stripAccents('c.name')} = ${stripAccents(`$${paramIndex}`)})`
      );
      values.push(params.category);
      paramIndex++;
    }

    // 3. Lọc thương hiệu (Brand) - BR04 (AND logic), không phân biệt dấu
    if (params.brand) {
      const brands = Array.isArray(params.brand) ? params.brand : [params.brand];
      if (brands.length > 0) {
        whereConditions.push(
          `EXISTS (SELECT 1 FROM unnest($${paramIndex}::text[]) AS wanted ` +
            `WHERE ${stripAccents('b.name')} = ${stripAccents('wanted')})`
        );
        values.push(brands);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Sắp xếp (Sort) — chỉ dùng các giá trị cố định trong code, không nối chuỗi từ người dùng
    let orderBy = 'p.id DESC';
    if (params.sort === 'asc') {
      orderBy = 'rv.selling_price_vnd ASC NULLS LAST, p.id DESC';
    } else if (params.sort === 'desc') {
      orderBy = 'rv.selling_price_vnd DESC NULLS LAST, p.id DESC';
    } else if (params.sort === 'rating') {
      orderBy = 'rating DESC NULLS LAST, p.id DESC';

    } else if (params.sort === 'relevant') {
      orderBy = 'p.id DESC';
    }

    // Đếm tổng số lượng bản ghi thỏa mãn (dùng đúng CTE + WHERE như truy vấn dữ liệu)
    const countSql = `
      ${cte}
      SELECT COUNT(*) as total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN rep_variant rv ON rv.product_id = p.id
      LEFT JOIN variant_stats vs ON vs.product_id = p.id
      ${whereClause}
    `;

    const countResult = await query<{ total: string }>(countSql, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Truy vấn dữ liệu chi tiết.
    // rating/review_count = NULL: schema hiện chưa có bảng đánh giá (UC26
    // nằm ngoài phạm vi PA4), nên KHÔNG bịa số 4.6/50 như bản cũ.
    const dataSql = `
      ${cte}
      SELECT
        p.id,
        p.slug,
        p.model_name,
        p.model_name as name,
        c.name as category,
        c.code as category_code,
        b.name as brand,
        rv.selling_price_vnd as price,
        rv.selling_price_vnd as selling_price_vnd,
        COALESCE(vs.total_available, 0) as stock,
        NULL::double precision as rating,
        NULL::integer as review_count,
        p.is_active,
        p.specifications,
        p.short_description,
        p.description,
        p.warranty_months,
        (SELECT image_url FROM product_images img WHERE img.product_id = p.id AND img.is_primary = TRUE LIMIT 1) as image_url
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN rep_variant rv ON rv.product_id = p.id
      LEFT JOIN variant_stats vs ON vs.product_id = p.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const dataResult = await query<Product>(dataSql, values);
    const items = dataResult.rows;

    // Đính kèm danh sách biến thể cho từng sản phẩm (1 truy vấn duy nhất
    // cho cả trang) để hình dạng kết quả khớp với bản mock và TC17-01
    // kiểm tra được `variants.length > 0` cả khi chạy với DB thật.
    if (items.length > 0) {
      const ids = items.map((p) => Number(p.id));
      const variantsRes = await query<ProductVariant & { product_id: number }>(
        `${cte}
         SELECT v.product_id, v.id, v.sku, v.variant_name, v.ram_gb, v.storage_gb,
                v.selling_price_vnd, v.price_vnd, v.is_active,
                v.specifications, v.short_description, v.available AS stock
         FROM eligible_variants v
         WHERE v.product_id = ANY($${variantValues.length + 1}::bigint[])
         ORDER BY v.product_id, v.selling_price_vnd ASC NULLS LAST, v.id ASC`,
        [...variantValues, ids]
      );
      const byProduct = new Map<number, ProductVariant[]>();
      for (const v of variantsRes.rows) {
        const arr = byProduct.get(v.product_id) ?? [];
        arr.push(v);
        byProduct.set(v.product_id, arr);
      }
      for (const item of items) {
        item.variants = byProduct.get(Number(item.id)) ?? [];
      }
    }

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Tìm kiếm trên dữ liệu Mock (Đảm bảo 100% khớp các ca kiểm thử TC17-01 đến TC17-05)
   */
  private searchMockData(
    params: ProductSearchParams,
    page: number,
    limit: number,
    offset: number
  ): ProductSearchResult {
    let filtered = [...MOCK_TEST_PRODUCTS];
    if (params.ids) filtered = filtered.filter(p => params.ids!.includes(String(p.id)));
    if (specKeys.some(key => params[key]?.length)) {
      filtered = filtered.flatMap(p => {
        const variants = p.variants?.length ? p.variants : [{ sku: String(p.id), variant_name: p.name, price_vnd: p.price, selling_price_vnd: p.price, stock: p.stock, is_active: p.is_active, ram_gb: parseInt(p.specifications?.ram), storage_gb: parseInt(p.specifications?.storage), specifications: p.specifications }];
        const matching = variants.filter(v => matchesSpecs({ ram_gb: v.ram_gb ?? null, storage_gb: v.storage_gb ?? null, specifications: { ...p.specifications, ...v.specifications } }, params)
          && (params.minPrice === undefined || (v.selling_price_vnd ?? v.price_vnd) >= params.minPrice)
          && (params.maxPrice === undefined || (v.selling_price_vnd ?? v.price_vnd) <= params.maxPrice)
          && (!params.inStock || v.stock > 0))
          .sort((a, b) => (a.selling_price_vnd ?? a.price_vnd) - (b.selling_price_vnd ?? b.price_vnd));
        return matching.length ? [{ ...p, variants: matching, price: matching[0].selling_price_vnd ?? matching[0].price_vnd, stock: matching.reduce((sum, v) => sum + v.stock, 0) }] : [];
      });
    }

    // Chỉ hiển thị sản phẩm đang kinh doanh trong tìm kiếm công khai
    filtered = filtered.filter((p) => p.is_active);

    // 1. Tìm kiếm từ khóa (q)
    if (params.q && params.q.trim() !== '') {
      const qNorm = normalizeText(params.q);
      const searchWords = qNorm.split(/\s+/).filter(Boolean);

      filtered = filtered.filter((p) => {
        const searchableText = normalizeText(
          `${p.name} ${p.model_name} ${p.brand} ${p.category} ${p.code || ''} ${p.short_description || ''}`
        );
        // Mỗi từ khóa tìm kiếm đều phải xuất hiện trong thông tin sản phẩm
        return searchWords.every((word) => searchableText.includes(word));
      });
    }

    // 2. Lọc danh mục (AND logic theo BR04)
    if (params.category && params.category !== 'Tất cả') {
      const catNorm = normalizeText(params.category);
      filtered = filtered.filter(
        (p) =>
          normalizeText(p.category) === catNorm ||
          normalizeText(p.category_code) === catNorm
      );
    }

    // 3. Lọc thương hiệu (AND logic theo BR04)
    if (params.brand) {
      const brandsList = Array.isArray(params.brand)
        ? params.brand.map(normalizeText)
        : [normalizeText(params.brand)];

      if (brandsList.length > 0) {
        filtered = filtered.filter((p) => brandsList.includes(normalizeText(p.brand)));
      }
    }

    // 4. Lọc khoảng giá (minPrice & maxPrice) - AND logic theo BR04
    if (params.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= params.minPrice!);
    }

    if (params.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= params.maxPrice!);
    }

    // 5. Lọc chỉ xem còn hàng (inStock) - BR09
    if (params.inStock) {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    // Sắp xếp
    if (params.sort === 'asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (params.sort === 'desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (params.sort === 'rating') {
      filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * UC16: Xem chi tiết sản phẩm theo ID hoặc Slug
   * Xử lý trường hợp ngừng kinh doanh (TC16-02)
   */
  async getProductById(idOrSlug: string): Promise<Product> {
    if (isDatabaseConnected()) {
      const productSql = `
        SELECT
          p.id,
          p.slug,
          p.model_name,
          p.model_name as name,
          c.name as category,
          c.code as category_code,
          b.name as brand,
          p.specifications,
          p.short_description,
          p.description,
          p.warranty_months,
          p.is_active,
          (SELECT MIN(v.selling_price_vnd) FROM product_variants v
            WHERE v.product_id = p.id AND v.is_active = TRUE) as price,
          (SELECT image_url FROM product_images img
            WHERE img.product_id = p.id AND img.is_primary = TRUE LIMIT 1) as image_url
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        WHERE p.id::text = $1 OR p.slug = $1
      `;
      const res = await query<Product>(productSql, [idOrSlug]);
      const product = res.rows[0];
      if (!product) {
        throw new AppError(`Không tìm thấy sản phẩm với mã: ${idOrSlug}`, 404, 'PRODUCT_NOT_FOUND');
      }
      if (!product.is_active) {
        throw new AppError(`Sản phẩm này đã ngừng kinh doanh hoặc tạm khóa`, 400, 'PRODUCT_DISCONTINUED');
      }

      // Biến thể kèm tồn khả dụng từng SKU (BR03/BR09) — bản cũ SELECT p.*
      // nên không trả về biến thể/tồn kho, làm test UC16-01 fail với DB thật.
      const variantsRes = await query<ProductVariant & { product_id: number }>(
        `SELECT v.id, v.sku, v.variant_name, v.ram_gb, v.storage_gb,
                v.selling_price_vnd, v.price_vnd, v.is_active,
                v.specifications, v.short_description,
                COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0) AS stock
         FROM product_variants v
         LEFT JOIN inventory_items i ON i.variant_id = v.id
         WHERE v.product_id = $1 AND v.is_active = TRUE
         ORDER BY v.selling_price_vnd ASC NULLS LAST, v.id ASC`,
        [Number(product.id)]
      );

      const imagesRes = await query<ProductImage>(
        `SELECT id, image_url, alt_text, is_primary
         FROM product_images
         WHERE product_id = $1
         ORDER BY display_order ASC, id ASC`,
        [Number(product.id)]
      );

      const stock = variantsRes.rows.reduce(
        (sum, v) => sum + Math.max(0, Number(v.stock) || 0),
        0
      );

      return {
        ...product,
        selling_price_vnd: product.price ?? undefined,
        stock,
        // Chưa có bảng đánh giá (UC26 ngoài phạm vi PA4): trả NULL thay vì bịa 4.6/50
        rating: null,
        review_count: null,
        variants: variantsRes.rows,
        images: imagesRes.rows,
      };
    }

    // Fallback Mock
    requireMockMode();
    const product = MOCK_TEST_PRODUCTS.find(
      (p) => String(p.id) === idOrSlug || p.code === idOrSlug || p.slug === idOrSlug
    );

    if (!product) {
      throw new AppError(`Không tìm thấy sản phẩm với mã: ${idOrSlug}`, 404, 'PRODUCT_NOT_FOUND');
    }

    if (!product.is_active) {
      throw new AppError(`Sản phẩm ${product.name} đã ngừng kinh doanh`, 400, 'PRODUCT_DISCONTINUED');
    }

    return product;
  }

  /**
   * Lấy danh sách tất cả các danh mục
   */
  async getCategories(): Promise<Array<{ code: string; name: string }>> {
    if (isDatabaseConnected()) {
      const res = await query('SELECT code, name FROM categories ORDER BY id ASC');
      return res.rows;
    }
    requireMockMode();
    return [
      { code: 'laptop', name: 'Laptop' },
      { code: 'phone', name: 'Điện thoại' },
      { code: 'tablet', name: 'Máy tính bảng' },
    ];
  }

  /**
   * Lấy danh sách thương hiệu theo danh mục
   */
  async getFacetRows(category?: string): Promise<FacetRow[]> {
    if (isDatabaseConnected()) {
      const result = await query<FacetRow>(`
        SELECT v.id, v.product_id, c.code AS category_code, b.name AS brand,
          v.ram_gb, v.storage_gb, p.specifications || v.specifications AS specifications
        FROM product_variants v JOIN products p ON p.id = v.product_id
        JOIN categories c ON c.id = p.category_id JOIN brands b ON b.id = p.brand_id
        WHERE p.is_active AND v.is_active
          AND ($1::text IS NULL OR c.code = $1 OR unaccent(lower(c.name)) = unaccent(lower($1)))`,
        [category && category !== 'Tất cả' ? category : null]);
      return result.rows;
    }
    requireMockMode();
    return MOCK_TEST_PRODUCTS.filter(p => p.is_active && (!category || category === 'Tất cả' || p.category_code === category || p.category === category)).flatMap((p, index) =>
      (p.variants?.length ? p.variants : [{ id: index + 1, ram_gb: parseInt(p.specifications?.ram) || null, storage_gb: parseInt(p.specifications?.storage) || null, specifications: p.specifications }]).map((v, i) => ({
        id: Number(v.id) || index * 100 + i + 1, product_id: index + 1, category_code: p.category_code, brand: p.brand,
        ram_gb: v.ram_gb ?? null, storage_gb: v.storage_gb ?? null, specifications: { ...p.specifications, ...v.specifications },
      })));
  }

  async getBrands(category?: string): Promise<string[]> {
    if (isDatabaseConnected()) {
      const result = await query<{ name: string }>(`SELECT DISTINCT b.name FROM brands b
        JOIN products p ON p.brand_id = b.id JOIN categories c ON c.id = p.category_id
        WHERE p.is_active AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.is_active)
          AND ($1::text IS NULL OR c.code = $1 OR unaccent(lower(c.name)) = unaccent(lower($1))) ORDER BY b.name`,
        [category && category !== 'Tất cả' ? category : null]);
      return result.rows.map(row => row.name);
    }
    return [...new Set((await this.getFacetRows(category)).map(row => row.brand))].sort();
  }

  async getTechnicalFilters(category?: string) {
    return facetGroups(await this.getFacetRows(category), category);
  }

}

export const productService = new ProductService();
