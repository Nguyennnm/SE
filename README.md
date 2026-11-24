# Smart Electronics Store (SE) — PA4

Ứng dụng bán thiết bị điện tử phục vụ đồ án Nhập môn Công nghệ phần mềm. Frontend dùng **React + Vite**, Backend dùng **Express + TypeScript**, Database dùng **PostgreSQL** trong Docker.

## Trạng thái chức năng (24/11/2026)

| Phần | Trạng thái ở nhánh `feature/database-new-catalog` |
| --- | --- |
| UC17 — Tìm kiếm, lọc, phân trang từng SKU | Đã tích hợp |
| UC16 — Trang chi tiết sản phẩm, chọn cấu hình/màu | Đã tích hợp |
| UC19 — Giỏ hàng khách, tăng/giảm/xóa SKU, mã `TECH500K` | Đã tích hợp |
| Sắp xếp **Bán chạy (30 ngày)** | Đã tích hợp Frontend → API → view PostgreSQL |
| `orders`, `order_items`, `product_sales_30d` | Có migration `009_orders_best_selling.sql` |
| Checkout/thanh toán/ghi nhận đơn từ giao diện | **Chưa triển khai**; giỏ hàng không phải đơn đã bán |

PR #4 đã được merge vào `main` và bao gồm code Search + Product Detail + Cart. **Bán chạy và migration 009 hiện thuộc nhánh `feature/database-new-catalog`, chưa mặc nhiên có trên `main`.** Người phát triển/kiểm thử cần checkout đúng nhánh.

Tài liệu chi tiết: [Frontend](frontend/README.md) · [Database](docs/database/README_PA4.md) · [Kịch bản Search/Detail](docs/integration/search-demo.md).

## Chạy web trên Windows 11 — đã có PostgreSQL local

> **Không chạy lại `setup_windows.ps1` trên database đã có catalog/giỏ hàng/đơn hàng.** Script cài đặt mới có bước import dùng `TRUNCATE ... CASCADE`, có thể xóa dữ liệu liên quan. Hãy backup database trước khi áp dụng migration.

Từ thư mục gốc repo:

```powershell
cd 'D:\Học tập\SE\SE'
git switch feature/database-new-catalog
git pull --ff-only origin feature/database-new-catalog

docker ps -a
# Nếu container đã tồn tại nhưng đang dừng:
docker start ses-phongvu-pa4-db
```

Kiểm tra nguồn dữ liệu:

```powershell
docker exec ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store -c "SELECT to_regclass('public.product_sales_30d') AS sales_view;"
```

Nếu `sales_view` là `NULL`, máy này **chưa áp dụng migration 009**. Sau khi backup, chạy từ thư mục gốc:

```powershell
docker cp .\database\migrations\009_orders_best_selling.sql ses-phongvu-pa4-db:/tmp/009_orders_best_selling.sql
docker exec ses-phongvu-pa4-db psql -X -v ON_ERROR_STOP=1 -U ses_user -d smart_electronics_store -f /tmp/009_orders_best_selling.sql
```

Migration 009 tạo `orders`, `order_items`, view `product_sales_30d`. **Mỗi PostgreSQL local riêng cần áp dụng một lần**; `git pull` không thay đổi schema hay dữ liệu Docker Volume. Máy dùng chung PostgreSQL đã nâng cấp thì không cần chạy lại.

Nếu các bảng Cart từ PR #4 còn thiếu, xem hướng dẫn migration 007/008 ở [README Database](docs/database/README_PA4.md). Với **database hoàn toàn mới/trống**, xem phần cài đặt sạch trong README Database; kiểm tra phiên bản PostgreSQL phù hợp với Docker Volume trước khi khởi tạo.

### Chạy Backend và Frontend

Mở 2 terminal độc lập:

```powershell
# Terminal Backend
cd 'D:\Học tập\SE\SE\backend'
npm ci
npm run dev
```

```powershell
# Terminal Frontend
cd 'D:\Học tập\SE\SE\frontend'
npm ci
npm run dev
```

Mở **http://localhost:5173**. API health: **http://localhost:5000/api/health** phải có `database: connected`, `dataSource: postgresql`. Nếu Vite báo cổng khác, mở đúng URL do Vite in ra.

## Sắp xếp Bán chạy (30 ngày)

Frontend mặc định chọn `sort=best_selling`, thay cho nhãn *Phù hợp nhất* (API vẫn giữ `sort=relevant` cho tương thích ngược). Backend **sắp xếp trước `LIMIT/OFFSET`** theo tổng `sold_30d` của từng **Product**, có thứ tự phụ ổn định theo Product ID/SKU. Tùy chọn giá tăng/giảm vẫn hoạt động.

- `sold_30d`: tổng `order_items.quantity` trong 30 × 24 giờ, chỉ tính đơn `confirmed`/`completed` có `confirmed_at` hợp lệ; không tính `pending`, `cancelled` hay giỏ hàng.
- Nhiều SKU trong cùng một Product dùng **chung** số đã bán của Product.
- `demo_sold_30d`: phần doanh số từ đơn demo; UI ghi rõ khi có số liệu. Đây **không phải doanh số thực của Phong Vũ**.
- Nếu chưa có đơn: số đã bán là 0 cho tất cả sản phẩm và sắp theo thứ tự phụ; website vẫn chạy bình thường khi view đã tồn tại.

**Seed tùy chọn cho demo**, tạo 6 đơn hoàn tất với số lượng lần lượt **5, 4, 3, 2, 1, 1** (tổng 16) cho 6 Product đủ điều kiện:

```powershell
docker cp .\database\seed\seed_demo_orders_best_selling.sql ses-phongvu-pa4-db:/tmp/seed_demo_orders_best_selling.sql
docker exec ses-phongvu-pa4-db psql -X -v ON_ERROR_STOP=1 -U ses_user -d smart_electronics_store -f /tmp/seed_demo_orders_best_selling.sql
```

Seed có mã đơn cố định để tránh chèn trùng khi chạy lại; thời điểm xác nhận **không tự gia hạn**, nên sau 30 ngày doanh số demo sẽ không còn nằm trong cửa sổ 30 ngày. Seed **không trừ tồn kho**.

## Kiểm thử

Sau khi PostgreSQL và migration 009 đã hoạt động:

```powershell
cd 'D:\Học tập\SE\SE\backend'
npm run build
npm run test:best-selling
npm run test:integration
npm run test:cart-integration
```

```powershell
cd 'D:\Học tập\SE\SE\frontend'
npm run build
npm run test:integration
npm run test:discovery
```

Bài test `test:best-selling` đọc view PostgreSQL, đối chiếu thứ hạng Product/SKU và phân trang, không tạo đơn; `test:cart-integration` tạo/xóa giỏ hàng test. Các lệnh trên là **hướng dẫn thực thi**, không phải kết quả đã tự động chạy trong môi trường của mọi thành viên.

**Kiểm thử tay gợi ý:** Search → chọn `Bán chạy (30 ngày)` → kiểm tra vị trí và nhãn demo → đổi sang giá tăng/giảm → Detail đúng SKU → Cart thêm/sửa/xóa. Giỏ hàng không làm tăng `sold_30d` hoặc tự giảm tồn kho.

## Cộng tác và lưu ý dữ liệu

- Mỗi thành viên có **PostgreSQL Docker local riêng**: đơn hàng, giỏ và số liệu bán chạy **không tự đồng bộ qua Git**. Muốn demo trên nhiều máy với số liệu giống nhau, dùng Backend/Database chung.
- Catalog là snapshot, tồn kho mô phỏng; thiếu giá, bảo hành hoặc đánh giá thì giữ nguyên dữ liệu thiếu, không bịa.
- Không commit `.env`, password, backup PostgreSQL, `.venv`, hay thư mục ảnh local `frontend/public/images/` nếu chưa kiểm tra quyền sử dụng.
- Chạy `git status` trước khi chuyển nhánh. Không dùng `git clean -fd` trên thư mục ảnh chưa được Git theo dõi.
- **Chưa có Checkout:** phần schema `orders` cần thống nhất với thành viên làm Backend/Sales trước khi đưa giao dịch thật vào hệ thống.

Xem [README Database](docs/database/README_PA4.md) để biết các migration, SQL kiểm tra và giới hạn dữ liệu.
