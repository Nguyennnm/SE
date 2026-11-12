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
