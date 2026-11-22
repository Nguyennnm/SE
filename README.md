# SE

Bộ khung mã nguồn cho dự án SE.

## Cấu trúc thư mục

```
├── backend
│   ├── src
│   │   ├── config
│   │   │   ├── database.ts
│   │   │   └── env.ts
│   │   ├── middleware
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── roleGuard.ts
│   │   ├── modules
│   │   │   ├── ai-advisor
│   │   │   │   └── .gitkeep
│   │   │   ├── auth
│   │   │   │   └── .gitkeep
│   │   │   ├── catalog
│   │   │   │   ├── Product.model.ts
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── product.routes.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   └── product.validation.ts
│   │   │   ├── customer
│   │   │   │   └── .gitkeep
│   │   │   ├── inventory
│   │   │   │   └── .gitkeep
│   │   │   ├── promotion
│   │   │   │   └── .gitkeep
│   │   │   ├── reporting
│   │   │   │   └── .gitkeep
│   │   │   ├── sales
│   │   │   │   └── .gitkeep
│   │   │   └── warranty
│   │   │       └── .gitkeep
│   │   ├── shared
│   │   │   └── .gitkeep
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── database
│   ├── migrations
│   │   └── .gitkeep
│   ├── seed
│   │   └── seed-products.sql
│   └── schema.sql
├── docs
│   ├── architecture
│   │   └── .gitkeep
│   ├── testing
│   │   └── .gitkeep
│   └── use-cases
│       └── .gitkeep
├── frontend
│   ├── public
│   │   └── .gitkeep
│   ├── src
│   │   ├── assets
│   │   │   └── .gitkeep
│   │   ├── components
│   │   │   └── .gitkeep
│   │   ├── hooks
│   │   │   └── .gitkeep
│   │   ├── pages
│   │   │   └── .gitkeep
│   │   ├── services
│   │   │   ├── apiClient.ts
│   │   │   └── productApi.ts
│   │   ├── types
│   │   │   └── .gitkeep
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
├── tests
│   ├── e2e
│   │   └── .gitkeep
│   ├── integration
│   │   └── .gitkeep
│   └── unit
│       └── .gitkeep
├── .gitignore
└── README.md
```
```

Các thư mục rỗng có tệp `.gitkeep` để Git lưu lại cấu trúc.
Các tệp TypeScript và SQL hiện là chỗ giữ để triển khai sau.
`package.json` và `tsconfig.json` là cấu hình mẫu; chưa khai báo thư viện,
lệnh chạy hay lệnh kiểm thử. Cần bổ sung khi chọn công cụ cho từng phần.

Sao chép `.env.example` thành `.env` tại từng ứng dụng khi cần cấu hình
môi trường. Không đưa thông tin bí mật vào các tệp mẫu hoặc commit `.env`.


## Database: đơn hàng và sản phẩm bán chạy (demo)

Phần Database trên nhánh `feature/database-new-catalog` có migration
`database/migrations/006_orders_best_selling.sql` tạo bảng `orders`, `order_items`
và view `product_sales_30d`. Số lượng bán được tính từ đơn `confirmed`/`completed`
trong 30 ngày, tổng hợp theo `product_id`, **không tính giỏ hàng hoặc đơn đang chờ**.

- **Database local mới:** Chạy `setup_windows.ps1` một lần để import catalog và áp dụng migration 006. Seed đơn demo là bước tùy chọn riêng, không chạy tự động.
- **Database local đã có catalog:** Chỉ chạy migration 006 trực tiếp; **không chạy lại `setup_windows.ps1`** do SQL import catalog có thể TRUNCATE dữ liệu.
- **Seed tùy chọn:** `database/seed/seed_demo_orders_best_selling.sql` tạo 6 đơn hàng demo đã hoàn tất, không phản ánh doanh số thật hoặc tự trừ tồn kho.
- **Kiểm thử:** `database/06_check_best_selling.sql` kiểm tra xếp hạng và vòng đời trạng thái đơn hàng; các đơn test được rollback.

Xem **[README Database — Mục 9](docs/database/README_PA4.md#9-đơn-hàng-demo-và-bán-chạy-trong-30-ngày)** để biết đầy đủ lệnh chạy PowerShell, cấu trúc bảng, query và quy tắc tích hợp Backend.

**Chưa phải tính năng Frontend hoàn chỉnh:** Backend/Frontend Search cần tích hợp `sort=best_selling` và người phụ trách đặt hàng cần thống nhất schema `orders` trước khi merge.
