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
8. Chọn laptop, lọc RAM 16 GB + SSD 512 GB + Windows. Mở chi tiết để kiểm tra SKU đang xem giữ đúng cấu hình đã lọc.
9. Chuyển sang điện thoại: các hãng chỉ bán laptop và bộ lọc nhu cầu laptop biến mất. Hãng/thông số chọn trước đó được xóa để không giữ điều kiện không tương thích.
10. Gõ `ip` và chờ gợi ý hiện theo bộ lọc hiện tại. Dùng ↑/↓ và Enter hoặc chuột để chọn; Esc để đóng.

Đánh giá chưa có trong database được hiển thị là “Chưa có đánh giá”. Giá là snapshot catalog, tồn kho là dữ liệu mô phỏng.

## Kiểm tra

```powershell
cd backend
npm run build
npm test
npm run test:integration
npm run test:discovery
cd ../frontend
npm run build
# Cần backend đang chạy ở terminal riêng:
npm run test:integration
npm run test:discovery
```

Kết quả test API phải ghi chế độ DATABASE để chứng minh truy vấn PostgreSQL. Các kiểm tra SQL/JSON riêng không thay thế việc thử luồng UI.

## Kết quả kiểm tra ngày 15/11/2026

- PostgreSQL 16 qua Docker, database mới được kiểm tra trống trước khi nhập.
- Sau nhập: 368 sản phẩm, 703 SKU, 4.775 ảnh; 144 SKU không có giá.
- Build TypeScript/backend và production frontend: thành công.
- Bộ test có sẵn: 7/7 đạt ở chế độ DATABASE.
- Bộ integration bổ sung: kiểm tra 503 khi chưa kết nối, nguồn dữ liệu PostgreSQL, phân trang, tìm tiếng Việt, lọc kết hợp, sắp xếp, dữ liệu NULL và lỗi đầu vào.
- Kiểm tra lớp gọi API frontend và React render: đạt với metadata, phân trang, bộ lọc, giá/đánh giá NULL, chi tiết, kết quả rỗng, lỗi API và hủy request.
- Cập nhật thông số/autocomplete: 8/8 kiểm tra backend discovery đạt; kiểm tra tương tác trên DOM mô phỏng đạt (debounce, bàn phím, hủy request, response cũ, đổi danh mục và chips).
- Chưa xác nhận trực quan bằng browser automation vì browser access host không khả dụng; cần mở trang để rà soát bố cục và thao tác khi demo.

## Cập nhật phiên bản — 22/11/2026

Màn hình hiện hiển thị từng SKU thành một ô riêng; phân trang và tổng số tính theo SKU. Bấm ô nào sẽ chọn đúng SKU đó trong chi tiết, sau đó có thể đổi phiên bản để xem giá/thông số/ảnh/tồn kho tương ứng. Dữ liệu sau sửa hãng và nhóm model: 365 model, vẫn đủ 703 SKU và 4.775 ảnh. Xem [hợp đồng API, migration và kiểm thử](product-variants.md).
