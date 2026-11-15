import { Router } from 'express';
import { productController } from './product.controller.js';

const router = Router();
router.get('/filters', (req, res, next) => productController.getTechnicalFilters(req, res, next));
router.get('/suggestions', (req, res, next) => productController.getSuggestions(req, res, next));

/**
 * Route danh mục và thương hiệu (đặt trước /:id để tránh bị nuốt bởi route param)
 */
router.get('/categories', (req, res, next) => productController.getCategories(req, res, next));
router.get('/brands', (req, res, next) => productController.getBrands(req, res, next));

/**
 * Route tìm kiếm sản phẩm - UC17: Tìm kiếm và lọc sản phẩm
 * Hỗ trợ cả /api/products/search và /api/products
 * Query params: q, category, brand, minPrice, maxPrice, inStock, sort, page, limit
 */
router.get('/search', (req, res, next) => productController.searchProducts(req, res, next));
router.get('/', (req, res, next) => productController.searchProducts(req, res, next));

/**
 * Route chi tiết sản phẩm - UC16: Xem chi tiết sản phẩm
 */
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));

export default router;
