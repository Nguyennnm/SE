import { isDatabaseConnected, query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  MOCK_TEST_PRODUCTS,
  type Product,
  type ProductSearchParams,
  type ProductSearchResult,
} from './Product.model.js';

// Tiện ích chuẩn hóa chuỗi tiếng Việt tìm kiếm không dấu / có dấu
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

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

    // 1. Tìm kiếm từ khóa (Keyword q)
    if (params.q) {
      const kw = `%${params.q.toLowerCase()}%`;
      whereConditions.push(
        `(lower(p.model_name) LIKE $${paramIndex} OR lower(b.name) LIKE $${paramIndex} OR lower(c.name) LIKE $${paramIndex} OR lower(v.variant_name) LIKE $${paramIndex})`
      );
      values.push(kw);
      paramIndex++;
    }

    // 2. Lọc danh mục (Category) - BR04 (AND logic)
    if (params.category && params.category !== 'Tất cả') {
      whereConditions.push(
        `(c.code = $${paramIndex} OR lower(c.name) = lower($${paramIndex}))`
      );
      values.push(params.category);
      paramIndex++;
    }

    // 3. Lọc thương hiệu (Brand) - BR04 (AND logic)
    if (params.brand) {
      if (Array.isArray(params.brand) && params.brand.length > 0) {
        whereConditions.push(`b.name = ANY($${paramIndex}::text[])`);
        values.push(params.brand);
        paramIndex++;
      } else if (typeof params.brand === 'string') {
        whereConditions.push(`lower(b.name) = lower($${paramIndex})`);
        values.push(params.brand);
        paramIndex++;
      }
    }

    // 4. Lọc khoảng giá (minPrice, maxPrice) - BR04 (AND logic)
    if (params.minPrice !== undefined) {
      whereConditions.push(`v.selling_price_vnd >= $${paramIndex}`);
      values.push(params.minPrice);
      paramIndex++;
    }

    if (params.maxPrice !== undefined) {
      whereConditions.push(`v.selling_price_vnd <= $${paramIndex}`);
      values.push(params.maxPrice);
      paramIndex++;
    }

    // 5. Lọc chỉ xem còn hàng (inStock) - BR09 (Tồn khả dụng > 0)
    if (params.inStock) {
      whereConditions.push(`(i.quantity_on_hand - i.quantity_reserved) > 0`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Sắp xếp (Sort)
    let orderBy = 'p.id DESC';
    if (params.sort === 'asc') {
      orderBy = 'v.selling_price_vnd ASC NULLS LAST';
    } else if (params.sort === 'desc') {
      orderBy = 'v.selling_price_vnd DESC NULLS LAST';
    } else if (params.sort === 'relevant') {
      orderBy = 'p.id ASC';
    }

    // Đếm tổng số lượng bản ghi thỏa mãn
    const countSql = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory_items i ON i.variant_id = v.id
      ${whereClause}
    `;

    const countResult = await query<{ total: string }>(countSql, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Truy vấn dữ liệu chi tiết
    const dataSql = `
      SELECT DISTINCT ON (p.id)
        p.id,
        p.slug,
        p.model_name,
        p.model_name as name,
        c.name as category,
        c.code as category_code,
        b.name as brand,
        COALESCE(v.selling_price_vnd, 0) as price,
        COALESCE(v.selling_price_vnd, 0) as selling_price_vnd,
        COALESCE(i.quantity_on_hand - i.quantity_reserved, 0) as stock,
        4.6 as rating,
        50 as review_count,
        p.is_active,
        p.specifications,
        p.short_description,
        (SELECT image_url FROM product_images img WHERE img.product_id = p.id AND img.is_primary = TRUE LIMIT 1) as image_url
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory_items i ON i.variant_id = v.id
      ${whereClause}
      ORDER BY p.id, ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const dataResult = await query<Product>(dataSql, values);

    return {
      items: dataResult.rows,
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
      filtered.sort((a, b) => b.rating - a.rating);
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
      const sql = `
        SELECT p.*, c.name as category, b.name as brand
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        WHERE p.id::text = $1 OR p.slug = $1
      `;
      const res = await query<Product>(sql, [idOrSlug]);
      const product = res.rows[0];
      if (!product) {
        throw new AppError(`Không tìm thấy sản phẩm với mã: ${idOrSlug}`, 404, 'PRODUCT_NOT_FOUND');
      }
      if (!product.is_active) {
        throw new AppError(`Sản phẩm này đã ngừng kinh doanh hoặc tạm khóa`, 400, 'PRODUCT_DISCONTINUED');
      }
      return product;
    }

    // Fallback Mock
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
    return [
      { code: 'laptop', name: 'Laptop' },
      { code: 'phone', name: 'Điện thoại' },
      { code: 'tablet', name: 'Máy tính bảng' },
    ];
  }

  /**
   * Lấy danh sách thương hiệu theo danh mục
   */
  async getBrands(category?: string): Promise<string[]> {
    if (isDatabaseConnected()) {
      let sql = 'SELECT DISTINCT b.name FROM brands b';
      const values: any[] = [];
      if (category && category !== 'Tất cả') {
        sql += ' JOIN products p ON p.brand_id = b.id JOIN categories c ON c.id = p.category_id WHERE c.code = $1 OR lower(c.name) = lower($1)';
        values.push(category);
      }
      sql += ' ORDER BY b.name ASC';
      const res = await query<{ name: string }>(sql, values);
      return res.rows.map((r) => r.name);
    }

    const set = new Set<string>();
    for (const p of MOCK_TEST_PRODUCTS) {
      if (!category || category === 'Tất cả' || p.category === category || p.category_code === category) {
        set.add(p.brand);
      }
    }
    return Array.from(set);
  }
}

export const productService = new ProductService();
