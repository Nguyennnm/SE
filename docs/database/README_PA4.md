# Database & Phong Vũ Catalog — Smart Electronics Store (PA4)

> **Trạng thái:** Đã import và kiểm tra SQL thành công trên PostgreSQL local (theo kết quả chạy `verify_windows.ps1` ngày 13/11/2026). Đây là dữ liệu phục vụ đồ án, **không phải dữ liệu bán hàng/tồn kho trực tiếp** của Phong Vũ. API Backend và giao diện Frontend vẫn cần triển khai, kiểm thử tích hợp riêng.

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
| Nhóm sản phẩm (`products`) | 368 |
| Biến thể/SKU (`product_variants`) | 703 |
| Ảnh theo SKU (`product_images`) | 4.775 |
| Bản ghi tồn kho mô phỏng (`inventory_items`) | 703 |
| SKU đủ điều kiện thêm giỏ demo (có giá và tồn kho) | 559 |

**Lưu ý:** 368 nhóm sản phẩm là kết quả **suy luận theo tên sản phẩm bán lẻ**, không phải phân nhóm chính thức được nhà sản xuất xác nhận. Khi xây màn hình lựa chọn màu/RAM/dung lượng, cần rà soát nhóm và các SKU cùng model.

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
               +--> products (368 nhóm sản phẩm suy luận)
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
| `users`, `shopping_carts`, `cart_items` | Bảng nền cho thử nghiệm UC19; API và luồng nghiệp vụ hoàn chỉnh chưa được xác nhận. |

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
- PostgreSQL `postgres:16-alpine` chạy qua `compose.yaml`, không bắt buộc cài PostgreSQL riêng trên Windows.
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

Cần đối chiếu `703` SKU, `368` nhóm model, `703` biến thể, `4.775` ảnh và `703` tồn kho. Nếu kết quả khác, **chưa nên merge vào `main`** trước khi giải thích được nguyên nhân.

### Kiểm tra 3 use case

- **UC16:** `04_check_use_cases.sql` trả về model, SKU, mô tả ngắn và số ảnh theo `variant_id`. Cần bổ sung test lựa chọn màu/cấu hình đúng trên giao diện.
- **UC17:** truy vấn tìm `galaxy` trên cả điện thoại và tablet; cần kiểm thử tìm kiếm/phân trang/lọc kết hợp sau khi có API.
- **UC19:** kết quả hiện tại `all_variants = 703`, `cart_ready = 559`, `price_missing = 144`. Đây là điều kiện dữ liệu để thêm giỏ demo, **không chứng minh API giỏ hàng đã hoàn thành**.

## 7. Giới hạn, rủi ro và công việc còn lại

1. **Độ bao phủ:** 703 SKU là những sản phẩm crawl `ok` ở thời điểm chụp dữ liệu, không bảo đảm chứa toàn bộ sản phẩm đang bán. 7 SKU lỗi không có trong bản nhập.
2. **Nhóm model/brand suy luận:** cần audit các nhóm có tên gần giống; tránh hiển thị nhầm tùy chọn SKU, đặc biệt giữa Wi-Fi/5G hoặc cấu hình/màu sắc.
3. **Giá và tồn kho:** giá snapshot có thể cũ; tồn kho là số liệu demo. SKU giá `NULL` chỉ hiển thị thông tin và không cho thêm giỏ.
4. **Mô tả:** nguồn thiếu là hợp lệ; `description_summary` được sinh từ dữ liệu kỹ thuật nên có thể chưa tự nhiên. Không trình bày như nội dung gốc của nhà bán lẻ.
5. **Ảnh:** hiện dùng URL ảnh bên thứ ba; chưa xác minh quyền sao chép/đăng lại hoặc độ bền URL. Không tự động rehost ảnh lên website công khai.
6. **Tích hợp:** trong nhánh hiện tại, các file `backend/src/modules/catalog/product.service.ts`, `product.controller.ts` và `frontend/src/services/productApi.ts` vẫn là TODO. SQL smoke test thành công **chưa đồng nghĩa UC16/17/19 hoạt động trên website**.
7. **Kiểm thử cần bổ sung:** khóa ngoại, SKU→variant→gallery, nhóm model, API tìm kiếm/lọc, giá `NULL`, thêm/sửa/xóa giỏ và xử lý cạnh tranh tồn kho.
8. **Môi trường:** PostgreSQL local chạy qua Docker; chưa có bằng chứng deployment production hoặc kiểm thử tải.

## 8. Quy trình Git/PR cho nhóm

Nhánh đã chứa dữ liệu thay thế: `feature/database-new-catalog`.

1. Kiểm tra `git status`, không commit `.env`, dump PostgreSQL, `.venv`, file log, screenshot hoặc toàn bộ ZIP crawler.
2. Sau khi cập nhật tài liệu và kiểm thử SQL, mở Pull Request `feature/database-new-catalog` → `main` nếu nhóm sử dụng `main` làm nhánh tích hợp; yêu cầu review trước khi merge.
3. Review chênh lệch dữ liệu và script SQL reset (đặc biệt `TRUNCATE ... CASCADE`), cùng giới hạn công bố ảnh/dữ liệu nguồn.
4. Chỉ đánh dấu **Database ready for integration** khi số lượng và các truy vấn xác minh ổn; đánh dấu **UC16/17/19 hoàn chỉnh** sau khi Backend/Frontend/API và kiểm thử end-to-end hoàn thành.

---

**Nguyên tắc:** Dataset catalog mới là nguồn duy nhất; dữ liệu thiếu được giữ đúng là thiếu; mỗi SKU là một biến thể riêng; không gắn nhãn năm 2026 thiếu căn cứ; tách biệt dữ liệu thật đã quan sát với giá/tồn kho demo.
