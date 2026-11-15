# SE

Bộ khung mã nguồn cho dự án SE.

## Chạy luồng tìm kiếm PA4

Xem [README màn hình tìm kiếm sản phẩm](frontend/README.md) để biết chức năng, cấu trúc frontend, API sử dụng và kịch bản trình diễn.

Frontend React + TypeScript gọi API Node.js/Express ở cổng `5000`, truy vấn PostgreSQL ở cổng `5434`.

Xem [hướng dẫn chạy, kịch bản demo và kiểm thử UC17/UC16](docs/integration/search-demo.md). Nếu database đã có dữ liệu, khởi động bằng `docker compose up -d --wait`, sau đó chạy `npm ci` và `npm run dev` trong từng thư mục `backend` và `frontend` ở hai terminal riêng.

Mở `http://localhost:5173`. Healthcheck `http://localhost:5000/api/health` phải trả `dataSource: postgresql` để xác nhận demo dùng database thật. Catalog là dữ liệu snapshot; tồn kho phục vụ mô phỏng.

## Khung thư mục ban đầu

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

Các thư mục rỗng có tệp `.gitkeep` để Git lưu lại cấu trúc.
Module catalog và giao diện tìm kiếm đã được triển khai, có script chạy/build và kiểm tra tích hợp.
Các module nghiệp vụ còn lại tiếp tục được phát triển từ khung thư mục này.

Sao chép `.env.example` thành `.env` tại từng ứng dụng khi cần cấu hình
môi trường. Không đưa thông tin bí mật vào các tệp mẫu hoặc commit `.env`.
