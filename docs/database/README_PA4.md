# Database & Phong Vũ Catalog — Smart Electronics Store (PA4)

> **Trạng thái:** Đã import và kiểm tra SQL thành công trên PostgreSQL local (theo kết quả chạy `verify_windows.ps1` ngày 13/11/2026). Đây là dữ liệu phục vụ đồ án, **không phải dữ liệu bán hàng/tồn kho trực tiếp** của Phong Vũ. Tại nhánh `feature/database-new-catalog`, Backend/Frontend cho UC16, UC17, UC19 và **sắp xếp Bán chạy (30 ngày)** đã có mã nguồn tích hợp. Người phụ trách đã xác nhận web chạy được trên PostgreSQL local sau khi áp dụng migration 009; các bộ test tự động và môi trường của từng thành viên vẫn cần chạy/xác minh độc lập. **Checkout chưa triển khai**.

## 1. Mục tiêu và phạm vi

Phần Database cung cấp dữ liệu cho:

- **UC16 — Xem chi tiết sản phẩm:** dòng máy, SKU/cấu hình, thông số, mô tả ngắn và bộ ảnh.
- **UC17 — Tìm kiếm/lọc sản phẩm:** danh mục, thương hiệu, tên sản phẩm, giá và thuộc tính kỹ thuật.
- **UC19 — Giỏ hàng:** chọn đúng SKU, giá tham khảo và số lượng tồn kho **giả lập**.

Chỉ có ba danh mục: `laptop`, `phone`, `tablet`. Không nhập đồng hồ, phụ kiện hoặc banner quảng cáo. **Không yêu cầu sản phẩm ra mắt năm 2026** và không lọc theo năm ra mắt.

Bộ dữ liệu cũ (snapshot 1.241 SKU, tập 338 SKU được gắn nhãn 2026 và seed 46 dòng máy) đã được **thay thế hoàn toàn**, không sử dụng làm fallback.

## 2. Nguồn dữ liệu và kết quả hiện tại

- **Nguồn bán lẻ:** các trang danh mục và trang chi tiết sản phẩm công khai tại [Phong Vũ](https://phongvu.vn/).
- **Công cụ:** crawler Playwright chạy độc lập trên Windows; kết quả đầu vào `results/full_catalog/crawled_details.json` nằm ngoài repo.
- **Nguồn dữ liệu trong repo:** `data/phongvu_catalog_current.json`.
- **Script chuyển đổi:** `scripts/replace_catalog_repo.py`; script này sinh JSON/SQL từ kết quả crawler, không gọi website khi import.
- **Thời điểm snapshot:** 13/11/2026. Giá, thông số và đường dẫn ảnh có thể thay đổi sau thời điểm crawl.
- **Điều kiện nhận bản ghi:** `status = "ok"`, có `seller_sku` hợp lệ; mã SKU duy nhất. 7 bản ghi crawl lỗi và 6 liên kết/banner không hợp lệ không nằm trong bộ nhập.

### Số liệu đã xác minh trong PostgreSQL local

| Danh mục | SKU | Có giá quan sát được | Thiếu giá | Có bài mô tả nguồn |
|---|---:|---:|---:|---:|
| Laptop | 333 | 333 | 0 | 253 |
| Điện thoại | 179 | 179 | 0 | 32 |
| Tablet | 191 | 47 | 144 | 65 |
| **Tổng** | **703** | **559** | **144** | **350** |

| Thành phần sau import | Số lượng |
|---|---:|
| Nhóm sản phẩm (`products`) | 365 |
| Biến thể/SKU (`product_variants`) | 703 |
| Ảnh theo SKU (`product_images`) | 4.775 |
| Bản ghi tồn kho mô phỏng (`inventory_items`) | 703 |
| SKU đủ điều kiện thêm giỏ demo (có giá và tồn kho) | 559 |

**Lưu ý:** 365 nhóm sản phẩm là kết quả **suy luận theo tên sản phẩm bán lẻ**, không phải phân nhóm chính thức được nhà sản xuất xác nhận. Đã sửa 51 SKU nhận nhầm hãng do phần mềm Microsoft đi kèm và gộp 3 nhóm bị tách nhầm. Xem [cập nhật phiên bản và migration 006](../integration/product-variants.md).

### Các trường thiếu là hợp lệ

- **144 tablet thiếu giá:** `observed_price_vnd = NULL`; không tự lấy mức khuyến mãi trên thẻ listing hay bịa giá. Những SKU này có tồn kho demo bằng 0 và không được thêm vào giỏ.
- **353 SKU không có bài mô tả nguồn:** `source_description_text` trống và `description_found = false`. Trang Phong Vũ có thể hiển thị “Đang cập nhật”; đây không đồng nghĩa lỗi crawl.
- **`description_summary`:** câu mô tả ngắn **sinh theo quy tắc từ `specs`**, không phải bài viết nguyên văn từ Phong Vũ hoặc nội dung do LLM tạo.
- **Năm ra mắt:** chưa xác minh; giữ `release_year` và `announcement_date` là `NULL`. Không suy luận năm từ tiền tố SKU.

## 3. Cấu trúc dữ liệu và quan hệ

```text
data/phongvu_catalog_current.json (703 SKU)
               |
               | scripts/replace_catalog_repo.py sinh file SQL
               v
database/01_import_phongvu_catalog.sql
               |
               v
phongvu_catalog_snapshot (seller_sku duy nhất)
               |
               +--> categories / brands
               |         |
               +--> products (365 nhóm sản phẩm suy luận)
                          |
                          +--> product_variants (703 SKU, PV-{seller_sku})
                          |       |-- specifications JSONB
                          |       |-- short_description
                          |       |-- source_description_text
                          |       |-- selling_price_vnd / nguồn, thời điểm
                          |       |
                          |       +--> inventory_items (tồn kho giả lập)
                          |
                          +--> product_images
                                  |-- variant_id (ảnh gắn đúng SKU)
                                  |-- display_order
                                  +-- image_url (URL bên thứ ba)
```

### Ý nghĩa các bảng

| Bảng | Vai trò |
|---|---|
| `phongvu_catalog_snapshot` | Lưu quan sát gốc sau chuẩn hóa: seller SKU, danh mục, brand, `specs`/`raw_specs`, giá, mô tả và gallery dưới dạng JSONB. |
| `categories` / `brands` | Danh mục và thương hiệu. Thương hiệu được suy luận từ tên; cần rà soát các dòng “Chưa xác định”. |
| `products` | Nhóm model dùng để hiển thị và gom các SKU liên quan. |
| `product_variants` | Mỗi SKU có mã nội bộ `PV-<seller_sku>` và cấu hình, mô tả, giá riêng. |
| `product_images` | URL ảnh đã thu thập, có `variant_id` để xác định gallery chính xác theo SKU. |
| `inventory_items` | Số lượng demo và số lượng giữ chỗ, không phản ánh hàng có sẵn của Phong Vũ. |
| `users`, `shopping_carts`, `cart_items` | Schema giỏ hàng: API Cart hỗ trợ khách với token, thêm/sửa/xóa SKU và mã giảm giá; chưa có checkout/giữ tồn kho khi thêm giỏ. |

Với UI chi tiết (UC16), nên truy vấn gallery theo **`product_images.variant_id`** của SKU đang chọn, sắp theo `display_order`. Trường `is_primary` là ảnh đại diện cấp model, **không thay thế gallery riêng của SKU**.

### Chính sách giá và giỏ hàng

- `observed_price_vnd` là giá ghi nhận lúc crawl, **không phải giá cập nhật thời gian thực**.
- `selling_price_vnd` hiện lấy giá quan sát làm **giá bán demo**, với `selling_price_is_demo = true`; `price_vnd` mang `price_kind = 'not_verified'`, không phải giá hãng xác minh.
- SKU có giá: `quantity_on_hand = 5` (demo); SKU thiếu giá: `quantity_on_hand = 0`.
- Điều kiện tối thiểu ở Backend khi thêm giỏ: SKU tồn tại và đang hoạt động; `selling_price_vnd IS NOT NULL`; `quantity_on_hand > quantity_reserved`; số lượng hợp lệ. Cần xử lý kiểm tra đồng thời và xác nhận lại giá khi thanh toán trong các bước sau.

## 4. Danh sách file liên quan

| Đường dẫn | Chức năng |
|---|---|
| `data/phongvu_catalog_current.json` | Nguồn dữ liệu đã làm sạch trong Git, 703 SKU |
| `scripts/check_data.py` | Kiểm tra sơ bộ JSON: SKU trùng, danh mục, URL, thống kê thiếu giá/bài mô tả |
| `scripts/replace_catalog_repo.py` | Chuyển đổi từ `crawled_details.json` sang JSON/SQL; có thể **ghi đè các file được sinh** |
| `database/schema.sql` | Schema nền; các cột ngày/năm ban đầu vẫn `NOT NULL` |
| `database/migrations/002_uc16_uc17_uc19.sql` | Các trường và bảng phục vụ UC16/UC17/UC19 |
| `database/migrations/003_images_metadata.sql` | Metadata ảnh |
| `database/migrations/004_allow_unknown_release_year.sql` | Bỏ `NOT NULL` của ngày/năm; thêm thông số, mô tả và khóa liên kết ảnh theo SKU |
| `database/01_import_phongvu_catalog.sql` | **SQL sinh tự động**, thay toàn bộ catalog cũ, nhập snapshot + sản phẩm + biến thể + ảnh + tồn kho |
| `database/00_install_clean_psql.sql` | Gọi schema, migrations, import, kiểm tra theo thứ tự |
| `database/03_check_import.sql` | Báo cáo số lượng sau nhập |
| `database/04_check_use_cases.sql` | Truy vấn smoke test UC16/UC17/UC19 |
| `setup_windows.ps1` / `verify_windows.ps1` | Setup và xác minh PostgreSQL trong Docker |

Không còn sử dụng `data/phongvu_catalog.csv`, `data/phongvu_pa4_2026.csv`, `data/models_2026_sources.csv` hoặc seed cũ 338 SKU. File `database/seed/seed-products.sql` chỉ còn ghi chú; dữ liệu mới được insert trong `01_import_phongvu_catalog.sql`.

**Lưu ý khi thay đổi snapshot:** `01_import_phongvu_catalog.sql` chứa các câu `INSERT` đã được sinh từ JSON, **không đọc `.json` động**. Chỉ sửa JSON rồi chạy setup sẽ không tự đồng bộ SQL. Phải sinh lại SQL và kiểm thử. Đặc biệt, chạy lại `replace_catalog_repo.py` hiện tại còn **ghi đè chính file README này bằng bản mô tả ngắn trong hằng `DOC`**; cần đồng bộ hằng đó trước khi tái sinh tài liệu hoặc khôi phục README sau khi chạy.

## 5. Cài đặt và chạy thử trên Windows 11

### Yêu cầu

- Windows 11, PowerShell, Git và Python 3.
- Docker Desktop đang hoạt động, hỗ trợ Docker Compose.
- `compose.yaml` hiện khai báo **`postgres:16-alpine`**, không bắt buộc cài PostgreSQL riêng trên Windows. Nếu máy đã có volume tạo bằng phiên bản PostgreSQL khác (ví dụ 17), **không tự ép chạy image 16 trên volume đó**. Kiểm tra `docker exec ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store -c "SHOW server_version;"` trước khi thay đổi container.
- Ở thư mục gốc repo, tạo `.env` từ `.env.example` và dùng mật khẩu local phù hợp; **không commit `.env`**.
- Cổng mặc định: `127.0.0.1:5434`; container: `ses-phongvu-pa4-db`; tên DB/user mặc định xem `.env.example`.

### Kiểm tra dữ liệu JSON (không sửa database)

```powershell
cd 'D:\Học tập\SE\SE'
py .\scripts\check_data.py
```

Kỳ vọng: `total = 703`, `laptop = 333`, `phone = 179`, `tablet = 191`, `without_price = 144`, `without_article = 353`.

### Cảnh báo trước khi chạy import lại

**KHÔNG chạy `setup_windows.ps1` trên database có dữ liệu thật nếu chưa có kế hoạch di chuyển và backup.**

`database/01_import_phongvu_catalog.sql` bắt đầu bằng `TRUNCATE ... RESTART IDENTITY CASCADE` đối với `cart_items`, tồn kho, ảnh, biến thể, sản phẩm, thương hiệu và danh mục; sau đó xóa/tạo lại `phongvu_catalog_snapshot`. Lệnh có thể làm mất bản ghi liên quan do `CASCADE`. Đây là script **reset catalog demo**, không phải migration cập nhật tăng dần.

Nếu đã chạy import thành công, **chỉ cần `verify_windows.ps1` để kiểm tra**, không cần chạy setup lại. Trước mọi lần thực sự import/reset, sao lưu PostgreSQL ra file ở **ngoài repo**.

Ví dụ backup (Docker Desktop phải đang chạy; đổi tên file nếu cần):

```powershell
docker compose up -d --wait
docker exec ses-phongvu-pa4-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/se_before_catalog_reset.dump'
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed - stop before import' }
docker cp ses-phongvu-pa4-db:/tmp/se_before_catalog_reset.dump ..\SE_before_catalog_reset.dump
if ($LASTEXITCODE -ne 0) { throw 'docker cp failed - stop before import' }
```

Trên máy local demo mới, khi đã kiểm tra `.env` và backup:

```powershell
# Chỉ áp dụng trong cửa sổ PowerShell hiện tại nếu script local bị chặn
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force

.\setup_windows.ps1
.\verify_windows.ps1
```

Nếu bị chặn bởi chính sách của tổ chức (`MachinePolicy`/`UserPolicy`), tuân theo chính sách đó; không cố vượt qua. Các file được `setup_windows.ps1` copy vào container tại `/tmp/pa4_database`.

## 6. Xác minh dữ liệu sau import

Các số bên dưới đã được ghi nhận từ kết quả chạy `verify_windows.ps1`, **không phải cam kết cho các lần crawl tương lai**.

### Kiểm tra tự động/smoke test

```powershell
py .\scripts\check_data.py
.\verify_windows.ps1
```

`verify_windows.ps1` chạy `database/03_check_import.sql` và `database/04_check_use_cases.sql`. Đây là **kiểm tra đọc dữ liệu/smoke test**, chưa phải test API end-to-end; nên đối chiếu các con số chứ không chỉ nhìn exit code.

### Kiểm tra số lượng trực tiếp trong PostgreSQL

Có thể chạy trong PowerShell, không thêm dấu `\` vào `COUNT(*)`:

```powershell
docker exec ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store -c "SELECT category, COUNT(*) FROM phongvu_catalog_snapshot GROUP BY category ORDER BY category;"
docker exec ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store -c "SELECT (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM product_variants) AS variants, (SELECT COUNT(*) FROM product_images) AS images, (SELECT COUNT(*) FROM inventory_items) AS inventory_rows;"
```

Cần đối chiếu `703` SKU, `365` nhóm model, `703` biến thể, `4.775` ảnh và `703` tồn kho. Nếu kết quả khác, **chưa nên merge vào `main`** trước khi giải thích được nguyên nhân.

### Kiểm tra 3 use case

- **UC16:** `04_check_use_cases.sql` trả về model, SKU, mô tả ngắn và số ảnh theo `variant_id`. Cần bổ sung test lựa chọn màu/cấu hình đúng trên giao diện.
- **UC17:** Backend đã có API tìm kiếm/lọc/phân trang; truy vấn `galaxy` trên cả điện thoại và tablet. Cần chạy kiểm thử tích hợp để xác minh đúng dữ liệu trên từng máy.
- **UC19:** kết quả dữ liệu `all_variants = 703`, `cart_ready = 559`, `price_missing = 144` phản ánh khả năng mua của snapshot. API Cart đã được tích hợp từ PR #4; vẫn cần chạy `npm run test:cart-integration` và test tay, không suy ra checkout đã hoàn thành.

## 7. Giới hạn, rủi ro và công việc còn lại

1. **Độ bao phủ:** 703 SKU là những sản phẩm crawl `ok` ở thời điểm chụp dữ liệu, không bảo đảm chứa toàn bộ sản phẩm đang bán. 7 SKU lỗi không có trong bản nhập.
2. **Nhóm model/brand suy luận:** cần audit các nhóm có tên gần giống; tránh hiển thị nhầm tùy chọn SKU, đặc biệt giữa Wi-Fi/5G hoặc cấu hình/màu sắc.
3. **Giá và tồn kho:** giá snapshot có thể cũ; tồn kho là số liệu demo. SKU giá `NULL` chỉ hiển thị thông tin và không cho thêm giỏ.
4. **Mô tả:** nguồn thiếu là hợp lệ; `description_summary` được sinh từ dữ liệu kỹ thuật nên có thể chưa tự nhiên. Không trình bày như nội dung gốc của nhà bán lẻ.
5. **Ảnh:** hiện dùng URL ảnh bên thứ ba; chưa xác minh quyền sao chép/đăng lại hoặc độ bền URL. Không tự động rehost ảnh lên website công khai.
6. **Tích hợp:** các file Backend Catalog, Cart và Frontend đã có triển khai. Người phụ trách đã xác nhận website hoạt động sau khi thêm view `product_sales_30d`; chưa có kết quả bộ test tự động được cung cấp cho từng môi trường. **Checkout/ghi đơn và trừ tồn kho vẫn là công việc tiếp theo**.
7. **Kiểm thử cần bổ sung/xác minh độc lập:** chạy bộ test API Search, biến thể SKU, Cart và Best Selling trên PostgreSQL; thử giá `NULL`, ảnh gallery theo SKU, phân trang và tương tác giữa giỏ với đơn hàng; phần chống oversell khi Checkout chưa triển khai.
8. **Môi trường:** PostgreSQL local chạy qua Docker; chưa có bằng chứng deployment production hoặc kiểm thử tải.

## 8. Quy trình Git/PR cho nhóm

Nhánh đã chứa dữ liệu thay thế: `feature/database-new-catalog`.

1. Kiểm tra `git status`, không commit `.env`, dump PostgreSQL, `.venv`, file log, screenshot hoặc toàn bộ ZIP crawler.
2. Sau khi cập nhật tài liệu và kiểm thử SQL, mở Pull Request `feature/database-new-catalog` → `main` nếu nhóm sử dụng `main` làm nhánh tích hợp; yêu cầu review trước khi merge.
3. Review chênh lệch dữ liệu và script SQL reset (đặc biệt `TRUNCATE ... CASCADE`), cùng giới hạn công bố ảnh/dữ liệu nguồn.
4. Chỉ đánh dấu **Database ready for integration** khi số lượng và các truy vấn xác minh ổn; đánh dấu **UC16/17/19 hoàn chỉnh** sau khi Backend/Frontend/API và kiểm thử end-to-end hoàn thành.

---

**Nguyên tắc:** Dataset catalog mới là nguồn duy nhất; dữ liệu thiếu được giữ đúng là thiếu; mỗi SKU là một biến thể riêng; không gắn nhãn năm 2026 thiếu căn cứ; tách biệt dữ liệu thật đã quan sát với giá/tồn kho demo.

## 9. Đơn hàng demo và bán chạy trong 30 ngày

> Bổ sung trong nhánh `feature/database-new-catalog`. **Sort Bán chạy (30 ngày) đã nối từ Frontend → Backend → PostgreSQL**; người phụ trách đã xác nhận sửa lỗi `relation "product_sales_30d" does not exist` bằng migration 009 và website hoạt động. Migration/seed và bộ test cần được xác minh trên từng môi trường local trước khi merge. **Đây chưa phải chức năng Checkout**.

### 9.1. Cấu trúc và quy tắc

- `orders`: `id`, `order_code` (unique), `user_id` (nullable để seed đơn khách demo), `status`, `created_at`, `confirmed_at`, `is_demo`.
- `order_items`: `order_id`, `variant_id`, `quantity` (>0), `unit_price_vnd` (>0, **giá chốt tại lúc đặt hàng**). Unique `(order_id, variant_id)` bảo đảm một SKU không lặp thành nhiều dòng trong cùng đơn.
- `product_sales_30d`: **VIEW thường**, tính `sold_30d` và `demo_sold_30d` theo `product_id`. Cộng `order_items.quantity` của mọi biến thể thuộc cùng Product, trong **30 × 24 giờ** tính tới thời điểm truy vấn, dựa vào `confirmed_at`.
- Chỉ tính `status IN ('confirmed','completed')`. Không tính `pending`, `cancelled`, `cart_items` hay lượng tồn kho. Đơn chuyển `confirmed` → `completed` **không bị cộng hai lần**. Đơn đã xác nhận nhưng sau đó hủy không còn trong view.
- `confirmed_at` bắt buộc khi trạng thái là `confirmed`/`completed`. Chỉ dùng `confirmed` khi nghiệp vụ đã xác nhận mua hàng thực sự, không chỉ tạo checkout chờ thanh toán.
- `is_demo = TRUE` cho các giao dịch thử nghiệm; `demo_sold_30d` giúp kiểm tra bao nhiêu đơn vị là dữ liệu demo. Dữ liệu demo không phản ánh doanh số thực của Phong Vũ.
- Nếu nhóm đã thiết kế `orders` hoặc `order_items` trên nhánh khác, **phải thống nhất schema** trước khi chạy migration. `CREATE TABLE IF NOT EXISTS` không tự đồng bộ cấu trúc bảng đang tồn tại.

### 9.2. Triển khai trên máy local **đã có** catalog

Chạy từ thư mục gốc repo trên PowerShell, sau khi kiểm tra Docker và backup DB nếu có dữ liệu giỏ/đơn cần giữ:

```powershell
docker ps -a
# Nếu container đã có và đang dừng: docker start ses-phongvu-pa4-db
# Trước khi dùng docker compose, phải kiểm tra image PostgreSQL/volume có tương thích.
docker cp .\database\migrations\009_orders_best_selling.sql ses-phongvu-pa4-db:/tmp/009_orders_best_selling.sql
docker exec ses-phongvu-pa4-db psql -X -v ON_ERROR_STOP=1 -U ses_user -d smart_electronics_store -f /tmp/009_orders_best_selling.sql
```

Tùy chọn seed 6 đơn đã hoàn tất với số lượng **5, 4, 3, 2, 1, 1** trên 6 dòng Product đang có SKU có giá. Seed dùng `order_code` cố định `DEMO-BS-001` đến `DEMO-BS-006`, có thể chạy lại mà không chèn trùng:

```powershell
docker cp .\database\seed\seed_demo_orders_best_selling.sql ses-phongvu-pa4-db:/tmp/seed_demo_orders_best_selling.sql
docker exec ses-phongvu-pa4-db psql -X -v ON_ERROR_STOP=1 -U ses_user -d smart_electronics_store -f /tmp/seed_demo_orders_best_selling.sql
```

Không seed tài khoản/password giả. Seed chỉ sinh các đơn khách demo `user_id IS NULL` để thử ranking; Backend checkout có thể yêu cầu đăng nhập riêng. **Seed chỉ tạo lịch sử đơn để thử bảng xếp hạng, không tự trừ tồn kho demo**; phần checkout phải dùng transaction riêng để quản lý số lượng tồn kho và tránh bán vượt.

**Kiểm tra database:**

```powershell
docker cp .\database\06_check_best_selling.sql ses-phongvu-pa4-db:/tmp/06_check_best_selling.sql
docker exec ses-phongvu-pa4-db psql -X -v ON_ERROR_STOP=1 -U ses_user -d smart_electronics_store -f /tmp/06_check_best_selling.sql
```

Truy vấn thủ công để kiểm tra ranking:

```sql
SELECT p.id, p.model_name, COALESCE(s.sold_30d, 0) AS sold_30d,
       COALESCE(s.demo_sold_30d, 0) AS demo_sold_30d
FROM products p
LEFT JOIN product_sales_30d s ON s.product_id = p.id
WHERE p.is_active
ORDER BY sold_30d DESC, p.id DESC
LIMIT 10;
```

**Máy mới:** `database/00_install_clean_psql.sql` gọi migration 009 **sau** import catalog. Chạy `setup_windows.ps1` **chỉ trên database mới/trống**; sau đó tùy chọn chạy seed như trên.

**Cảnh báo đặc biệt:** `database/01_import_phongvu_catalog.sql` dùng `TRUNCATE ... CASCADE`. Sau khi đã có `order_items` liên kết `product_variants`, chạy lại `setup_windows.ps1` có thể xóa các bản ghi **order_items** theo quan hệ FK, trong khi **orders** vẫn còn nhưng mất chi tiết; không sử dụng script reset này như migration tăng dần.

### 9.3. Hợp đồng cho thành viên Backend

**Đã tích hợp ở nhánh Database:** Frontend chọn mặc định **Bán chạy (30 ngày)** và gửi `sort=best_selling`. Backend validation chấp nhận giá trị này; SQL LEFT JOIN `product_sales_30d` theo `product_id` và `ORDER BY sold_30d DESC, p.id DESC, rv.variant_id ASC` (tie-breaker SKU khi groupBy=variant), tất cả đều được thực hiện **trước LIMIT/OFFSET**. Số liệu được tổng hợp ở cấp Product, nên các SKU của cùng dòng có chung `sold_30d`. Response trả `sold_30d`, `demo_sold_30d` khi chọn bán chạy; Frontend ghi rõ phần demo nếu có. Các chế độ giá `asc`, `desc` vẫn hoạt động và API giữ `relevant` cho tương thích ngược.

**Test Search → PostgreSQL:** Sau khi chạy migration 009, vào `backend/` và chạy `npm run test:best-selling`. Bài test đọc dữ liệu, đối chiếu xếp hạng Product/SKU với view, phân trang SKU không trùng và kiểm tra sắp giá cũ. Nếu chưa seed đơn, các sản phẩm đều có `sold_30d = 0`, thứ tự phụ theo `product_id DESC`; có thể chạy seed tùy chọn để demo thấy thứ hạng thay đổi. Trong trường hợp chưa áp dụng migration 009, yêu cầu `sort=best_selling` sẽ lỗi vì view chưa tồn tại.

Đối với luồng đặt hàng: tạo `orders` và `order_items` trong transaction; kiểm tra/khóa tồn kho đúng SKU để tránh oversell; snapshot giá; xác nhận thanh toán/đặt hàng theo nghiệp vụ rồi cập nhật `status` và `confirmed_at` trong cùng transaction. Nếu thất bại rollback. Không cộng sold bằng UPDATE trên `products`; view tự tính lại. `order_code` cần duy nhất để tránh double-submit; schema cần được nhóm Backend/Sales duyệt trước khi tích hợp.

### 9.4. Các trường hợp kiểm thử cần xác minh

- Seed lần thứ hai không tăng tổng đơn hoặc số lượng bán. File kiểm tra chạy thêm test vòng đời đơn trong transaction rồi `ROLLBACK`, không để lại đơn test.
- Thêm `cart_items` không thay đổi `sold_30d`.
- Thêm đơn `pending` không đổi; đổi thành `confirmed` có `confirmed_at` thì tăng đúng `quantity`.
- Chuyển `confirmed` → `completed` không tăng thêm; chuyển sang `cancelled` thì bị loại.
- Nhiều SKU cùng `product_id` được cộng chung.
- Đơn xác nhận cũ hơn 30 ngày không được tính.
- Sản phẩm chưa bán trả về 0 qua LEFT JOIN; sắp xếp và phân trang ổn định.

**Lưu ý tài liệu tự sinh:** `scripts/replace_catalog_repo.py` có thể ghi đè README Database này khi tái sinh catalog. Cần sửa `DOC` trong generator hoặc giữ/khôi phục phần 9 sau khi chạy công cụ.

## 10. Hướng dẫn đồng bộ nhóm sau khi tích hợp Bán chạy (24/11/2026)

### 10.1. Lấy code và nâng cấp PostgreSQL local cũ

Mỗi thành viên làm việc độc lập trên PostgreSQL Docker phải lấy đúng **nhánh `feature/database-new-catalog`**. PR #4 (Search + Product Detail + Cart) đã vào `main`, nhưng **Sort Bán chạy + migration 009 chưa nằm trên `main`** cho tới khi PR Database được merge.

```powershell
cd 'D:\Học tập\SE\SE'
git fetch origin
git switch feature/database-new-catalog
git pull --ff-only origin feature/database-new-catalog
docker ps -a
```

Giữ container/volume đang dùng, không reset dữ liệu. Sao lưu trước khi thay đổi schema. Sau đó kiểm tra:

```powershell
docker exec ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store -c "SELECT to_regclass('public.shopping_carts') AS carts, to_regclass('public.order_items') AS order_items, to_regclass('public.product_sales_30d') AS sales_view;"
```

Nếu `sales_view` là `NULL`, chạy migration **009** theo mục 9.2. Không cần chạy mỗi lần mở web. Nếu thiếu `guest_token` hoặc `coupon_code` của `shopping_carts`, DB local cũ còn thiếu migration **007/008** của PR #4; backup, kiểm tra schema nền và áp dụng đúng thứ tự (007 rồi 008). Không gọi `setup_windows.ps1` trên database đã có dữ liệu.

### 10.2. Phân biệt Migration và Demo Seed

- **Migration 009 — bắt buộc cho Bán chạy:** tạo bảng và view, không tự sinh doanh số.
- **Seed demo — tùy chọn:** 6 đơn, số lượng `5 + 4 + 3 + 2 + 1 + 1 = 16`. Không phải doanh số thực, không trừ tồn kho. Chạy lại không chèn trùng, nhưng không gia hạn thời điểm xác nhận; số liệu tự rời cửa sổ 30 ngày.
- **Giỏ hàng** chỉ lưu `cart_items`, không làm tăng `sold_30d`. Chỉ đơn `confirmed`/`completed` mới được tính.
- **Mỗi máy là một DB riêng:** Pull Git không đồng bộ đơn hàng, giỏ hàng hoặc seed giữa các thành viên. Cần một Backend/DB chung nếu muốn xem cùng số lượng trong demo nhiều máy.

### 10.3. Kiểm tra trước Pull Request vào `main`

Sau khi chạy migration và tùy chọn seed, khởi chạy Backend/Frontend; mở `http://localhost:5173`, health `http://localhost:5000/api/health` cần `dataSource = postgresql`. Kiểm tra dropdown mặc định **Bán chạy (30 ngày)**, Product cùng model có chung doanh số, số lượng demo có ghi nhãn, đổi giá tăng/giảm và Cart hoạt động.

```powershell
# Trong backend/
npm run build
npm run test:best-selling
npm run test:integration
npm run test:cart-integration

# Trong frontend/
npm run build
npm run test:integration
npm run test:discovery
```

Không đánh dấu bộ test **PASS** nếu chưa chạy thực tế. File `database/06_check_best_selling.sql` kiểm tra trạng thái đơn và dùng transaction `ROLLBACK` cho các đơn thử nghiệm. Xem [README gốc](../../README.md) để biết lệnh chạy web, cài đặt local và giới hạn chức năng.

### 10.4. Lỗi thường gặp

- **`relation "product_sales_30d" does not exist`**: code mới chạy với PostgreSQL chưa có view. Kiểm tra `to_regclass(...)`, chạy migration 009 vào **đúng DB mà Backend kết nối**, rồi reload web.
- **Sort có kết quả nhưng tất cả doanh số bằng 0**: chưa có đơn xác nhận trong 30 ngày; tùy chọn seed ở mục 9.2 nếu cần minh họa.
- **Chỉ một thành viên thấy doanh số tăng**: các máy dùng DB local khác nhau, không có đồng bộ transaction.
- **DB mất dữ liệu Cart/Orders sau setup**: không chạy lại script import/reset; phục hồi từ backup phù hợp và áp dụng migration tăng dần.

**Giới hạn còn lại:** Checkout thực tế, xác nhận thanh toán, trừ/hoàn tồn kho và tích hợp API tạo đơn chưa được phát triển. Phải thống nhất schema với nhóm Backend trước khi triển khai, tránh xem seed demo là kết quả giao dịch thật.
