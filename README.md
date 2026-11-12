# SE

Bộ khung mã nguồn cho dự án SE.

## Cấu trúc thư mục

```text
frontend/
  public/
  src/
    assets/
    components/
    pages/
    hooks/
    services/
      apiClient.ts
      productApi.ts
    types/
    App.tsx
    main.tsx
  .env.example
  package.json
  tsconfig.json
backend/
  src/
    config/
      database.ts
      env.ts
    modules/
      auth/
      catalog/
        product.routes.ts
        product.controller.ts
        product.service.ts
        Product.model.ts
        product.validation.ts
      sales/
      inventory/
      warranty/
      customer/
      promotion/
      reporting/
      ai-advisor/
    middleware/
      authMiddleware.ts
      roleGuard.ts
      errorHandler.ts
    shared/
    app.ts
    server.ts
  .env.example
  package.json
  tsconfig.json
database/
  schema.sql
  migrations/
  seed/
    seed-products.sql
tests/
  unit/
  integration/
  e2e/
docs/
  architecture/
  use-cases/
  testing/
.gitignore
README.md
```

Các thư mục rỗng có tệp `.gitkeep` để Git lưu lại cấu trúc.
Các tệp TypeScript và SQL hiện là chỗ giữ để triển khai sau.
`package.json` và `tsconfig.json` là cấu hình mẫu; chưa khai báo thư viện,
lệnh chạy hay lệnh kiểm thử. Cần bổ sung khi chọn công cụ cho từng phần.

Sao chép `.env.example` thành `.env` tại từng ứng dụng khi cần cấu hình
môi trường. Không đưa thông tin bí mật vào các tệp mẫu hoặc commit `.env`.
