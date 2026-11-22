import type { Request, Response, NextFunction } from 'express';
import { productService } from './product.service.js';
import { validateSearchParams } from './product.validation.js';
import { successResponse } from '../../shared/response.js';

export class ProductController {
  async getPriceRange(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(successResponse(await productService.getPriceRange())); }
    catch (error) { next(error); }
  }
  async getTechnicalFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const { groupBy } = validateSearchParams({ groupBy: req.query.groupBy });
      res.json(successResponse(await productService.getTechnicalFilters(category, groupBy), 'Thông số lọc theo danh mục'));
    } catch (error) { next(error); }
  }

  async getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = validateSearchParams(req.query);
      if (!params.q || params.q.length < 2) { res.json(successResponse([])); return; }
      const result = await productService.searchProducts({ ...params, page: 1, limit: 5 });
      res.json(successResponse(result.items, 'Gợi ý sản phẩm'));
    } catch (error) { next(error); }
  }
  /**
   * GET /api/products (hoặc /api/products/search)
   * Phục vụ Use Case UC17: Tìm kiếm và lọc sản phẩm
   */
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Kiểm tra và chuẩn hóa các tham số đầu vào (Validation)
      const validParams = validateSearchParams(req.query);

      // 2. Thực hiện tìm kiếm thông qua ProductService
      const result = await productService.searchProducts(validParams);

      // 3. Xử lý phản hồi kết quả (Thỏa mãn TC17-01, TC17-02, TC17-03, TC17-04)
      const message =
        result.total === 0
          ? 'Không tìm thấy sản phẩm phù hợp với tiêu chí tìm kiếm'
          : `Tìm thấy ${result.total} sản phẩm phù hợp`;

      res.status(200).json(
        successResponse(result.items, message, {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      // Bắt lỗi chuyển cho middleware errorHandler xử lý (Thỏa mãn TC17-05)
      next(error);
    }
  }

  /**
   * GET /api/products/:id
   * Phục vụ Use Case UC16: Xem chi tiết sản phẩm
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const product = await productService.getProductById(id);
      res.status(200).json(successResponse(product, 'Lấy chi tiết sản phẩm thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/categories
   * Lấy danh mục sản phẩm phục vụ bộ lọc
   */
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await productService.getCategories();
      res.status(200).json(successResponse(categories, 'Lấy danh sách danh mục thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/brands
   * Lấy thương hiệu theo danh mục
   */
  async getBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const brands = await productService.getBrands(category);
      res.status(200).json(successResponse(brands, 'Lấy danh sách thương hiệu thành công'));
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
