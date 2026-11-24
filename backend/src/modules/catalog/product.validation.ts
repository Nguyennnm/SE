import { AppError } from '../../middleware/errorHandler.js';
import type { ProductSearchParams } from './Product.model.js';
import { specKeys } from './product.facets.js';

export function validateSearchParams(query: Record<string, any>): ProductSearchParams {
  const params: ProductSearchParams = {};
  if (query.groupBy !== undefined) {
    if (query.groupBy !== 'product' && query.groupBy !== 'variant') {
      throw new AppError('groupBy phải là product hoặc variant.', 400, 'INVALID_GROUP_BY');
    }
    params.groupBy = query.groupBy;
  }

  // 1. Keyword search (q)
  if (query.q !== undefined && query.q !== null) {
    params.q = String(query.q).trim();
  } else if (query.keyword !== undefined && query.keyword !== null) {
    params.q = String(query.keyword).trim();
  }

  if (params.q && params.q.length > 200) {
    throw new AppError('Từ khóa tối đa 200 ký tự.', 400, 'INVALID_QUERY');
  }
  // Repeated or comma-separated facet values; OR within a group, AND across groups.
  const list = (value: unknown) => (Array.isArray(value) ? value : [value]).flatMap(v => String(v).split(',')).map(v => v.trim()).filter(Boolean);
  for (const key of specKeys) {
    if (query[key] !== undefined) {
      const values = [...new Set(list(query[key]))];
      if (!values.length || values.length > 30 || values.some(v => v.length > 80 || (['ram', 'storage', 'screenSize', 'refreshRate'].includes(key) && (!Number.isFinite(Number(v)) || Number(v) <= 0)))) {
        throw new AppError(`Bộ lọc ${key} không hợp lệ.`, 400, 'INVALID_SPEC_FILTER');
      }
      params[key] = ['ram', 'storage', 'screenSize', 'refreshRate'].includes(key) ? values.map(v => String(Number(v))) : values;
    }
  }
  if (query.ids !== undefined) {
    const ids = list(query.ids);
    if (ids.length > 200 || ids.some(id => !/^[a-zA-Z0-9-]+$/.test(id))) throw new AppError('Danh sách sản phẩm không hợp lệ.', 400, 'INVALID_IDS');
    params.ids = ids;
  }

  // 2. Category filter
  if (query.category) {
    params.category = String(query.category).trim();
  }

  // 3. Brand filter (supports single or comma-separated or array)
  if (query.brand) {
    if (Array.isArray(query.brand)) {
      params.brand = query.brand.map((b) => String(b).trim());
    } else {
      const parts = String(query.brand)
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);
      params.brand = parts.length > 1 ? parts : parts[0];
    }
  }

  // 4. Min Price
  if (query.minPrice !== undefined && query.minPrice !== '') {
    const min = Number(query.minPrice);
    if (!Number.isFinite(min) || min < 0) {
      throw new AppError('Giá tối thiểu (minPrice) không hợp lệ, phải là số >= 0', 400, 'INVALID_PRICE_FILTER');
    }
    params.minPrice = min;
  }

  // 5. Max Price
  if (query.maxPrice !== undefined && query.maxPrice !== '') {
    const max = Number(query.maxPrice);
    if (!Number.isFinite(max) || max < 0) {
      throw new AppError('Giá tối đa (maxPrice) không hợp lệ, phải là số >= 0', 400, 'INVALID_PRICE_FILTER');
    }
    params.maxPrice = max;
  }

  // Kiểm tra tính logic của khoảng giá
  if (params.minPrice !== undefined && params.maxPrice !== undefined) {
    if (params.minPrice > params.maxPrice) {
      throw new AppError('Giá tối thiểu (minPrice) không thể lớn hơn giá tối đa (maxPrice)', 400, 'INVALID_PRICE_RANGE');
    }
  }

  // 6. inStock filter
  if (query.inStock !== undefined) {
    params.inStock = query.inStock === 'true' || query.inStock === '1' || query.inStock === true;
  }

  // 7. Sort
  if (query.sort) {
    const sortVal = String(query.sort).toLowerCase();
    if (['relevant', 'best_selling', 'asc', 'desc', 'rating'].includes(sortVal)) {
      params.sort = sortVal as any;
    } else {
      params.sort = 'relevant';
    }
  } else {
    params.sort = 'relevant';
  }

  // 8. Pagination
  if (query.page !== undefined) {
    const page = Number(query.page);
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new AppError('Trang (page) phải là số nguyên dương >= 1', 400, 'INVALID_PAGE');
    }
    params.page = Math.floor(page);
  } else {
    params.page = 1;
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError('Số lượng sản phẩm mỗi trang (limit) phải từ 1 đến 100', 400, 'INVALID_LIMIT');
    }
    params.limit = Math.floor(limit);
  } else {
    params.limit = 10;
  }

  return params;
}
