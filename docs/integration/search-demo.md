# Demo UC17: tìm kiếm sản phẩm; UC16: xem thông tin

Frontend React gọi API Express ở cổng 5000. API truy vấn PostgreSQL trên cổng 5434 (Docker). Chế độ mặc định không tự đổi sang dữ liệu mock khi PostgreSQL lỗi.

## Chạy local

Từ thư mục gốc repo, tạo `.env` nếu chưa có và kiểm tra thông tin PostgreSQL:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d --wait
```

Nếu database đã được nhập dữ liệu thì dùng lại database đó. Với database mới hoàn toàn, làm theo `docs/database/README_PA4.md` để cài schema, migrations và catalog. `setup_windows.ps1` reset catalog, không chạy lại trên dữ liệu đang dùng.

Terminal backend:

```powershell
cd backend
npm ci
npm run dev
```

Terminal frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Mở http://localhost:5173. Mặc định UI gọi `http://localhost:5000/api`; có thể đặt `VITE_API_URL` trong `frontend/.env`. Backend đọc `backend/.env` trước, rồi `.env` gốc repo. Biến môi trường của tiến trình được ưu tiên.

## Xác nhận đang dùng PostgreSQL

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Phải thấy `database: connected` và `dataSource: postgresql`. API tìm kiếm trả 503 với mã `DATABASE_UNAVAILABLE` nếu PostgreSQL không kết nối được. Chỉ dùng `ALLOW_MOCK_DATA=true` trong `backend/.env` khi chủ động kiểm thử mock; khởi động lại backend sau khi đổi.

## Kịch bản trình diễn

1. Nhập `iPhone 16`, nhấn Enter hoặc nút tìm kiếm. Mở Network để thấy request `/api/products/search?q=...`.
2. Chọn danh mục điện thoại, thương hiệu Apple, giá tối đa 30 triệu. Kết quả phải thỏa tất cả bộ lọc.
3. Chọn giá tăng dần, chuyển trang. Số lượng/tổng trang do API trả về.
4. Nhập từ khóa không tồn tại: UI hiển thị trạng thái không có kết quả.
5. Chọn tất cả danh mục, bỏ từ khóa, chọn máy tính bảng: sản phẩm chưa có giá hiển thị “Chưa có giá”. Không hiển thị giá 0 hay phần trăm giảm bịa.
6. Bấm sản phẩm: UI gọi `/api/products/:id`, hiển thị cấu hình/SKU và giá, tồn kho của từng biến thể. Nếu URL ảnh lỗi, hiển thị hình vector dự phòng.
7. Dừng backend: tìm lại để thấy thông báo lỗi và nút thử lại. Bật backend rồi bấm thử lại.

Đánh giá chưa có trong database được hiển thị là “Chưa có đánh giá”. Giá là snapshot catalog, tồn kho là dữ liệu mô phỏng.

## Kiểm tra

```powershell
cd backend
npm run build
npm test
npm run test:integration
cd ../frontend
npm run build
# Cần backend đang chạy ở terminal riêng:
npm run test:integration
```

Kết quả test API phải ghi chế độ DATABASE để chứng minh truy vấn PostgreSQL. Các kiểm tra SQL/JSON riêng không thay thế việc thử luồng UI.

## Kết quả kiểm tra ngày 15/11/2026

- PostgreSQL 16 qua Docker, database mới được kiểm tra trống trước khi nhập.
- Sau nhập: 368 sản phẩm, 703 SKU, 4.775 ảnh; 144 SKU không có giá.
- Build TypeScript/backend và production frontend: thành công.
- Bộ test có sẵn: 7/7 đạt ở chế độ DATABASE.
- Bộ integration bổ sung: kiểm tra 503 khi chưa kết nối, nguồn dữ liệu PostgreSQL, phân trang, tìm tiếng Việt, lọc kết hợp, sắp xếp, dữ liệu NULL và lỗi đầu vào.
- Kiểm tra lớp gọi API frontend và React render: đạt với metadata, phân trang, bộ lọc, giá/đánh giá NULL, chi tiết, kết quả rỗng, lỗi API và hủy request.
- Chưa xác nhận trực quan bằng browser automation vì browser access host không khả dụng; cần mở trang để rà soát bố cục và thao tác khi demo.
