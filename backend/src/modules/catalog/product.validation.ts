import { AppError } from '../../middleware/errorHandler.js';
import type { ProductSearchParams } from './Product.model.js';

export function validateSearchParams(query: Record<string, any>): ProductSearchParams {
  const params: ProductSearchParams = {};

  // 1. Keyword search (q)
  if (query.q !== undefined && query.q !== null) {
    params.q = String(query.q).trim();
  } else if (query.keyword !== undefined && query.keyword !== null) {
    params.q = String(query.keyword).trim();
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
    if (isNaN(min) || min < 0) {
      throw new AppError('Giá tối thiểu (minPrice) không hợp lệ, phải là số >= 0', 400, 'INVALID_PRICE_FILTER');
    }
    params.minPrice = min;
  }

  // 5. Max Price
  if (query.maxPrice !== undefined && query.maxPrice !== '') {
    const max = Number(query.maxPrice);
    if (isNaN(max) || max < 0) {
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
    if (['relevant', 'asc', 'desc', 'rating'].includes(sortVal)) {
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
    if (isNaN(page) || page < 1) {
      throw new AppError('Trang (page) phải là số nguyên dương >= 1', 400, 'INVALID_PAGE');
    }
    params.page = Math.floor(page);
  } else {
    params.page = 1;
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new AppError('Số lượng sản phẩm mỗi trang (limit) phải từ 1 đến 100', 400, 'INVALID_LIMIT');
    }
    params.limit = Math.floor(limit);
  } else {
    params.limit = 10;
  }

  return params;
}
