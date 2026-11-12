# Database PA4 (UC16, UC17, UC19) – Smart Electronics Store

Bộ file được **sắp xếp để ghép vào repository `Nguyennnm/SE`**, thay thế đúng 2 placeholder SQL `database/schema.sql` và `database/seed/seed-products.sql`. Không ghi đè README.md, frontend/backend TypeScript đang có.

## Dữ liệu

- `data/phongvu_catalog.csv`: snapshot 1.241 SKU từ Phong Vũ (theo bộ dữ liệu người dùng cung cấp ngày 12/11/2026).
- `data/phongvu_pa4_2026.csv`: 338 SKU được **bộ dữ liệu đánh dấu** thuộc 46 dòng máy 2026; chưa kiểm chứng độc lập từng URL.
- `database/schema.sql`: 6 bảng catalog + tồn kho nền tảng.
- `database/migrations/002_uc16_uc17_uc19.sql`: thêm bảng tài khoản, giỏ hàng, các cột UC16/19.
- `database/migrations/003_images_metadata.sql`: thông tin ảnh.
- `database/01_import_phongvu_catalog.sql`: import snapshot.
- `database/seed/seed-products.sql`: seed 338 SKU PA4.
- `database/00_install_clean_psql.sql`: script dùng **psql** chạy theo thứ tự.
- `database/03_check_import.sql`, `04_check_use_cases.sql`: xác minh nhập và use cases.
- `frontend/public/images/products/phongvu/`: 117 file WebP có sẵn để phát triển local. **Quyền tái sử dụng ảnh bên thứ ba chưa được xác minh**, không tự động công khai hoặc commit ảnh trước khi thống nhất giấy phép.

Tồn kho và tài khoản/giỏ hàng là **dữ liệu demo**, không phải số tồn kho thật của Phong Vũ. Giá trong snapshot là giá được ghi nhận tại thời điểm thu thập, không phải giá bán hiện tại.

## Chuẩn bị Windows 11

1. Clone `https://github.com/Nguyennnm/SE.git` về máy, tạo branch `feature/database-phongvu-2026`.
2. Giải nén **nội dung của ZIP này vào thư mục gốc của repo** (nơi có `backend/`, `frontend/`, `database/`, `README.md`). Cho phép thay thế chỉ hai file placeholder `database/schema.sql`, `database/seed/seed-products.sql`. Không copy thư mục `Phong_Vu_PA4_Setup_Ready/` lồng vào repo.
3. Mở Docker Desktop; tại thư mục gốc repo chạy:
   ```powershell
   Copy-Item .env.example .env
   .\setup_windows.ps1
   .\verify_windows.ps1
   ```
4. `docker compose ps` cần báo container `ses-phongvu-pa4-db` healthy. Database lắng nghe trên `127.0.0.1:5434`. Thông tin username, database và password: xem file `.env` local.
5. Không cài PostgreSQL native nếu sử dụng Docker Desktop. Lệnh tạo database chạy trong container Postgres 16.

### Không chạy được PowerShell script?

Mở PowerShell tại thư mục repo, dùng lệnh Docker:

```powershell
Copy-Item .env.example .env
docker compose up -d --wait
docker exec ses-phongvu-pa4-db sh -c 'rm -rf /tmp/pa4_database'
docker cp .\database ses-phongvu-pa4-db:/tmp/pa4_database
docker exec ses-phongvu-pa4-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/pa4_database/00_install_clean_psql.sql'
```

Không dùng `docker compose down -v` nếu muốn giữ data trong volume. Khi muốn cập nhật SQL, chạy lại `setup_windows.ps1`; SQL mới sẽ được copy lại vào container.

### Kiểm tra nhanh

```powershell
docker exec -it ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store
```

```sql
SELECT count(*) FROM phongvu_catalog_snapshot; -- dự kiến 1241
SELECT count(*) FROM product_variants WHERE sku LIKE 'PV-%'; -- dự kiến 338
SELECT count(*) FROM products WHERE release_year=2026; -- dự kiến 46
```

## Lưu ý tích hợp nhóm

- **Không** sửa `backend/src/config/database.ts` trực tiếp nếu thành viên Backend đang phụ trách. Phối hợp API `GET /api/products`, `GET /api/products/:id`, `GET/POST /api/cart` để thống nhất DB schema.
- Nếu muốn dùng ảnh offline, copy đã sẵn đúng vào `frontend/public/images/products/phongvu/` trong repo. Sau khi các đường dẫn ảnh đã được xác nhận, chạy `./use_local_images_windows.ps1`.
- Không commit `.env`, `node_modules`, secrets hay dữ liệu khách hàng thật.
- Đề xuất commit các file SQL, CSV, script, `compose.yaml`, `.env.example` và tài liệu trước; đưa ảnh lên repo khi có quyền sử dụng.
- Tạo Pull Request để nhóm review, không merge trực tiếp vào `main` trước khi kiểm tra.

## Trạng thái kiểm tra

Đã kiểm tra tĩnh file và đường dẫn trong ZIP. **Chưa chạy thử PostgreSQL trong môi trường tạo gói**; phải chạy `setup_windows.ps1` và `verify_windows.ps1` trên máy Windows trước khi đánh dấu hoàn thành.
