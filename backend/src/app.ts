import express, { type Application } from 'express';
import cors from 'cors';
import productRoutes from './modules/catalog/product.routes.js';
import { productController } from './modules/catalog/product.controller.js';
import { errorHandler } from './middleware/errorHandler.js';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'smart-electronics-store-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Catalog Module Routes (UC17: Tìm kiếm sản phẩm, UC16: Xem chi tiết)
app.use('/api/products', productRoutes);

// Direct aliases to facilitate both Frontend and API testing conventions
app.get('/api/search', (req, res, next) => productController.searchProducts(req, res, next));
app.get('/api/categories', (req, res, next) => productController.getCategories(req, res, next));
app.get('/api/brands', (req, res, next) => productController.getBrands(req, res, next));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Đường dẫn ${req.method} ${req.originalUrl} không tồn tại`,
    },
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
