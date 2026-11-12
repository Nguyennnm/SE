-- Run after 01_import_phongvu_catalog.sql and the PA4 schema with migrations 002 and 003.
-- Source date is fixed so later snapshots do not silently change demo prices.
BEGIN;

CREATE TEMP TABLE pv_model_seed (
    category TEXT NOT NULL, brand TEXT NOT NULL, slug TEXT PRIMARY KEY, model_name TEXT NOT NULL,
    announcement_date DATE NOT NULL, release_year INTEGER NOT NULL, chipset TEXT,
    screen_inches NUMERIC(4,1), source_url TEXT NOT NULL, specifications_json JSONB NOT NULL
) ON COMMIT DROP;
INSERT INTO pv_model_seed VALUES
  ('laptop', 'Acer', 'acer-swift-air-14-sfa14-i31', 'Acer Swift Air 14 SFA14-I31 (2026)', '2026-05-29', 2026, 'Intel Core Series 3', 14, 'https://news.acer.com/acer-launches-new-swift-air-14-powered-by-latest-intel-core-series-3-processors', '{}'),
  ('laptop', 'Apple', 'apple-macbook-air-13-m5', 'Apple MacBook Air 13-inch (M5, 2026)', '2026-03-03', 2026, 'Apple M5', 13.0, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/', '{}'),
  ('laptop', 'Apple', 'apple-macbook-air-15-m5', 'Apple MacBook Air 15-inch (M5, 2026)', '2026-03-03', 2026, 'Apple M5', 15.0, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/', '{}'),
  ('laptop', 'Apple', 'apple-macbook-neo-2026', 'Apple MacBook Neo (2026)', '2026-03-04', 2026, 'Apple A18 Pro', 13.0, 'https://www.apple.com/vn/newsroom/2026/03/say-hello-to-macbook-neo/', '{"screen": "Liquid Retina 13 inch"}'),
  ('laptop', 'Apple', 'apple-macbook-pro-14-m5-max', 'Apple MacBook Pro 14-inch (M5 Max, 2026)', '2026-03-03', 2026, 'Apple M5 Max', 14.2, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/', '{}'),
  ('laptop', 'Apple', 'apple-macbook-pro-14-m5-pro', 'Apple MacBook Pro 14-inch (M5 Pro, 2026)', '2026-03-03', 2026, 'Apple M5 Pro', 14.0, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/', '{}'),
  ('laptop', 'Apple', 'apple-macbook-pro-14-m6', 'Apple MacBook Pro 14-inch (M6, 2026)', '2026-10-27', 2026, 'Apple M6', 14.2, 'https://www.apple.com/newsroom/2026/10/apple-introduces-the-new-14-inch-macbook-pro-with-m6/', '{}'),
  ('laptop', 'Apple', 'apple-macbook-pro-16-m5-max', 'Apple MacBook Pro 16-inch (M5 Max, 2026)', '2026-03-03', 2026, 'Apple M5 Max', 16.0, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/', '{}'),
  ('laptop', 'Apple', 'apple-macbook-pro-16-m5-pro', 'Apple MacBook Pro 16-inch (M5 Pro, 2026)', '2026-03-03', 2026, 'Apple M5 Pro', 16.2, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/', '{}'),
  ('laptop', 'ASUS', 'asus-expertbook-ultra-b9406caa', 'ASUS ExpertBook Ultra B9406CAA (2026)', '2026-01-23', 2026, 'Intel Core Ultra Series 3', 14, 'https://press.asus.com/news/press-releases/asus-expertbook-ultra/', '{}'),
  ('laptop', 'ASUS', 'asus-rog-zephyrus-duo-gx651', 'ASUS ROG Zephyrus Duo GX651 (2026)', '2026-01-06', 2026, NULL, 16, 'https://press.asus.com/news/press-releases/rog-zephyrus-duo-dual-screen-oled/', '{}'),
  ('laptop', 'ASUS', 'asus-rog-zephyrus-g14-gu405', 'ASUS ROG Zephyrus G14 GU405 (2026)', '2026-01-06', 2026, NULL, 14, 'https://press.asus.com/news/press-releases/rog-zephyrus-g14-g16-2026/', '{}'),
  ('laptop', 'ASUS', 'asus-rog-zephyrus-g16-gu606', 'ASUS ROG Zephyrus G16 GU606 (2026)', '2026-01-06', 2026, NULL, 16, 'https://press.asus.com/news/press-releases/rog-zephyrus-g14-g16-2026/', '{}'),
  ('laptop', 'ASUS', 'asus-vivobook-s14-s3407aa', 'ASUS Vivobook S14 S3407AA (2026)', '2026-01-07', 2026, 'Intel Core Ultra Series 3', 14, 'https://press.asus.com/news/press-releases/asus-vivobook-s14-s16/', '{}'),
  ('laptop', 'ASUS', 'asus-vivobook-s16-s3607aa', 'ASUS Vivobook S16 S3607AA (2026)', '2026-01-07', 2026, 'Intel Core Ultra Series 3', 16, 'https://press.asus.com/news/press-releases/asus-vivobook-s14-s16/', '{}'),
  ('laptop', 'ASUS', 'asus-zenbook-s14-ux5406-2026', 'ASUS Zenbook S14 UX5406 (2026)', '2026-01-07', 2026, 'Intel Core Ultra Series 3', 14.0, 'https://press.asus.com/news/press-releases/zenbook-s14-2026/', '{"display_options": "14-inch 3K OLED 120Hz option"}'),
  ('laptop', 'Lenovo', 'lenovo-loq-15irh11e', 'Lenovo LOQ 15IRH11E (2026)', '2026-08-31', 2026, NULL, 15.6, 'https://psref.lenovo.com/Detail/LOQ_15IRH11E?M=83Y9003VVN', '{}'),
  ('laptop', 'Lenovo', 'lenovo-yoga-slim-7-ultra-14iph11', 'Lenovo Yoga Slim 7i Ultra Aura Edition (14-inch, Gen 11)', '2026-01-06', 2026, 'Intel Core Ultra Series 3', 14, 'https://news.lenovo.com/pressroom/press-releases/lenovo-at-ces-2026-smarter-ai-for-more-intuitive-and-connected-pc-experiences/', '{}'),
  ('phone', 'Apple', 'apple-iphone-17e', 'Apple iPhone 17e (2026)', '2026-03-02', 2026, 'Apple A19', 6.1, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-iphone-17e/', '{"main_camera_mp": 48}'),
  ('phone', 'Apple', 'apple-iphone-18-pro', 'Apple iPhone 18 Pro (2026)', '2026-09-09', 2026, 'Apple A20 Pro', 6.3, 'https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/', '{}'),
  ('phone', 'Apple', 'apple-iphone-18-pro-max', 'Apple iPhone 18 Pro Max (2026)', '2026-09-09', 2026, 'Apple A20 Pro', 6.9, 'https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/', '{}'),
  ('phone', 'Apple', 'apple-iphone-duo', 'Apple iPhone Duo (2026)', '2026-09-10', 2026, 'Apple A20 Pro', NULL, 'https://images.apple.com/vn/newsroom/2026/09/apple-unveils-iphone-duo/', '{}'),
  ('phone', 'HONOR', 'honor-600-5g', 'HONOR 600 5G (2026)', '2026-04-22', 2026, NULL, NULL, 'https://www.honor.com/ie/news/honor-600-series-launch/', '{}'),
  ('phone', 'HONOR', 'honor-600s-5g', 'HONOR 600S 5G (2026)', '2026-10-08', 2026, NULL, NULL, 'https://baotintuc.vn/honor-600s-mo-ban-tai-viet-nam-voi-gia-tu-1049-trieu-dong-post1392617.html', '{}'),
  ('phone', 'HONOR', 'honor-x8d', 'HONOR X8d (2026)', '2026-03-07', 2026, NULL, NULL, 'https://viettelstore.vn/tin-tuc/honor-x8d-ra-mat-tai-viet-nam', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-a08', 'Samsung Galaxy A08 (2026)', '2026-10-12', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-nang-tam-trai-nghiem-smartphone-hang-ngay-voi-galaxy-a18-va-galaxy-a08-moi', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-a18', 'Samsung Galaxy A18 (2026)', '2026-10-12', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-nang-tam-trai-nghiem-smartphone-hang-ngay-voi-galaxy-a18-va-galaxy-a08-moi', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-a27-5g', 'Samsung Galaxy A27 5G (2026)', '2026-06-25', 2026, NULL, NULL, 'https://www.samsungmobilepress.com/articles/galaxy-a27-5g-immersive-display-awesome-intelligence', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-a37-5g', 'Samsung Galaxy A37 5G (2026)', '2026-03-25', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-galaxy-a57-5g-va-galaxy-a37-5g-trai-nghiem-cac-tinh-nang-chuyen-nghiep-voi-muc-gia-hap-dan', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-a57-5g', 'Samsung Galaxy A57 5G (2026)', '2026-03-25', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-galaxy-a57-5g-va-galaxy-a37-5g-trai-nghiem-cac-tinh-nang-chuyen-nghiep-voi-muc-gia-hap-dan', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-s26', 'Samsung Galaxy S26 (2026)', '2026-02-26', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-galaxy-s26-series-galaxy-ai-phone-truc-quan-nhat-tu-truoc-den-nay', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-s26-plus', 'Samsung Galaxy S26+ (2026)', '2026-02-26', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-galaxy-s26-series-galaxy-ai-phone-truc-quan-nhat-tu-truoc-den-nay', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-s26-ultra', 'Samsung Galaxy S26 Ultra (2026)', '2026-02-26', 2026, NULL, 6.9, 'https://news.samsung.com/vn/samsung-ra-mat-galaxy-s26-series-galaxy-ai-phone-truc-quan-nhat-tu-truoc-den-nay', '{}'),
  ('phone', 'Samsung', 'samsung-galaxy-z-flip8', 'Samsung Galaxy Z Flip8 (2026)', '2026-07-22', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-the-he-galaxy-gap-chuan-moi-galaxy-z-fold8-ultra-galaxy-z-fold8-va-galaxy-z-flip8', '{"form_factor": "flip"}'),
  ('phone', 'Samsung', 'samsung-galaxy-z-fold8', 'Samsung Galaxy Z Fold8 (2026)', '2026-07-22', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-the-he-galaxy-gap-chuan-moi-galaxy-z-fold8-ultra-galaxy-z-fold8-va-galaxy-z-flip8', '{"form_factor": "foldable"}'),
  ('phone', 'Samsung', 'samsung-galaxy-z-fold8-ultra', 'Samsung Galaxy Z Fold8 Ultra (2026)', '2026-07-22', 2026, NULL, NULL, 'https://news.samsung.com/vn/samsung-ra-mat-the-he-galaxy-gap-chuan-moi-galaxy-z-fold8-ultra-galaxy-z-fold8-va-galaxy-z-flip8', '{"form_factor": "foldable"}'),
  ('phone', 'Xiaomi', 'xiaomi-redmi-17-4g', 'Xiaomi REDMI 17 4G (2026)', '2026-08-07', 2026, NULL, NULL, 'https://www.mi.com/vn/support/policy/redmi17series-premium-service/', '{}'),
  ('phone', 'Xiaomi', 'xiaomi-redmi-17-5g', 'Xiaomi REDMI 17 5G (2026)', '2026-08-07', 2026, NULL, NULL, 'https://www.mi.com/vn/support/policy/redmi17series-premium-service/', '{}'),
  ('phone', 'Xiaomi', 'xiaomi-redmi-note-17-4g', 'Xiaomi REDMI Note 17 4G (2026)', '2026-08-27', 2026, NULL, NULL, 'https://c.mi.com/global/post/2344899', '{}'),
  ('phone', 'Xiaomi', 'xiaomi-redmi-note-17-5g', 'Xiaomi REDMI Note 17 5G (2026)', '2026-08-27', 2026, NULL, NULL, 'https://c.mi.com/global/post/2344899', '{}'),
  ('tablet', 'Apple', 'apple-ipad-air-11-m4', 'Apple iPad Air 11-inch (M4, 2026)', '2026-03-02', 2026, 'Apple M4', 11.0, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-the-new-ipad-air-powered-by-m4/', '{}'),
  ('tablet', 'Apple', 'apple-ipad-air-13-m4', 'Apple iPad Air 13-inch (M4, 2026)', '2026-03-02', 2026, 'Apple M4', 13.0, 'https://www.apple.com/vn/newsroom/2026/03/apple-introduces-the-new-ipad-air-powered-by-m4/', '{}'),
  ('tablet', 'Apple', 'apple-ipad-mini-a20-pro', 'Apple iPad mini (A20 Pro, 2026)', '2026-10-26', 2026, 'Apple A20 Pro', 8.5, 'https://www.apple.com/newsroom/2026/10/apple-gives-ipad-mini-its-biggest-update-ever/', '{}'),
  ('tablet', 'HONOR', 'honor-pad-x8b', 'HONOR Pad X8b (2026)', '2026-06-12', 2026, NULL, 11, 'https://viettelstore.vn/tin-tuc/mo-ban-pad-x8b', '{}'),
  ('tablet', 'Lenovo', 'lenovo-idea-tab-pro-gen2', 'Lenovo Idea Tab Pro Gen 2 (2026)', '2026-03-02', 2026, NULL, NULL, 'https://news.lenovo.com/pressroom/press-releases/consumer-mwc-2026-concepts-tablets-laptops/', '{}'),
  ('tablet', 'Lenovo', 'lenovo-legion-tab-gen5', 'Lenovo Legion Tab Gen 5 (8.8-inch, 2026)', '2026-03-02', 2026, NULL, 8.8, 'https://news.lenovo.com/pressroom/press-releases/consumer-mwc-2026-concepts-tablets-laptops/', '{}');

CREATE TEMP TABLE pv_detail_image (
    seller_sku TEXT NOT NULL, image_url TEXT NOT NULL, source_url TEXT NOT NULL, ordinal INTEGER NOT NULL
) ON COMMIT DROP;
INSERT INTO pv_detail_image VALUES
  ('260300845', 'https://lh3.googleusercontent.com/iQTzRC7-VOo3MoBdudrQCK9nwVyEM5w08SDBYcIGbeL8XBc_qdJyJYU9Ng8-wSBLi81THxeUVrqFhtkEh17zaobMQYHcauo=s0-rw', 'https://phongvu.vn/macbook-neo-13-inch-a18-pro-8gb-256gb--p853538?selectPromotionId=3600573&sku=260300845', 1),
  ('260300845', 'https://lh3.googleusercontent.com/4TsUZIMbS3VY9617MbJgIVt_eM2zkWKUTSBgLpqPvR3HOAn1Ka9KyuVTku-oDpQfO0Z1dBAxihYLVVzPg-Rn6LKJggjSV-rVfA=s0-rw', 'https://phongvu.vn/macbook-neo-13-inch-a18-pro-8gb-256gb--p853538?selectPromotionId=3600573&sku=260300845', 2),
  ('260300845', 'https://lh3.googleusercontent.com/Mvz45FZlBnN4xngomsbVGnJuHJO5FigACAvQ6G17bSMdG9iwBC6mVgpLsrZ_oSbA5Wc_8UOZLecQrHlKfEvHb0ke5p1XVKJD=s0-rw', 'https://phongvu.vn/macbook-neo-13-inch-a18-pro-8gb-256gb--p853538?selectPromotionId=3600573&sku=260300845', 3),
  ('260300845', 'https://lh3.googleusercontent.com/OJRr9n3l0R-2iobNfzmGWwMvRYR_KDIOc6EwpORXGflXsOcYKy-YvTvStU2IzQsrhDIEIsuidc1jazIuRAl0jj7osj9GfILyyA=s0-rw', 'https://phongvu.vn/macbook-neo-13-inch-a18-pro-8gb-256gb--p853538?selectPromotionId=3600573&sku=260300845', 4),
  ('260900705', 'https://lh3.googleusercontent.com/3rz_xQx0P4ZobyJ-L_EP_2wv2P4O3vglArXdwLUhf-oyTvVXnEpzVmNvBKOHveahESuT1IQ2erBCOIWVc-c1sdat-dG8ZUA=s0-rw', 'https://phongvu.vn/iphone-18-pro-max-256gb--p896014?sku=260900705&selectPromotionId=3641499', 1),
  ('260900705', 'https://lh3.googleusercontent.com/a4bQ2sd1JkMB3RIbkmiWk8xUIeEdLNuNJguCgL74nz_SkR4jmCXBJ1MP_gP_eQrbomGGUPzzaJhuU9JBiI_0Y4AZqWJqeZKEQQ=s0-rw', 'https://phongvu.vn/iphone-18-pro-max-256gb--p896014?sku=260900705&selectPromotionId=3641499', 2),
  ('260900705', 'https://lh3.googleusercontent.com/KO6S8MNNGCENJXphIrt1ShI9iy2vIZRtCUt4StVtEusNbaDGzTh47nIaI6-BCDQDtKBNwGmucTcgStpOhONL4MgfXt5lDyF6=s0-rw', 'https://phongvu.vn/iphone-18-pro-max-256gb--p896014?sku=260900705&selectPromotionId=3641499', 3),
  ('260900705', 'https://lh3.googleusercontent.com/MGMphLRn4kdm3dCyu1CTCI3YG2qGoKjCj-LLykLfWt4xgKmphOt_dfOTqXIU24MQpWrj1MHWUzbgaltHqEqp7Ra12OEXXlDF=s0-rw', 'https://phongvu.vn/iphone-18-pro-max-256gb--p896014?sku=260900705&selectPromotionId=3641499', 4),
  ('260900705', 'https://lh3.googleusercontent.com/lTqOFrtsQrgM_gP75QZstMDlI49KONNDsNr3LWa4Spb7otlf53_NBIWtza6ilQ6YH-YqCs0tAEvxR2KHIHtPUOyTS5zmAtf6Fw=s0-rw', 'https://phongvu.vn/iphone-18-pro-max-256gb--p896014?sku=260900705&selectPromotionId=3641499', 5),
  ('260300207', 'https://lh3.googleusercontent.com/dLGM5Yi4ZRH__pFO0FSUojt9SBadcTyUv9SsRvj5wSlx3NLXYp0uasewL2viBknc7yOEX_yPtlrlGzdXkbYuOg8yR2A1f-r7=s0-rw', 'https://phongvu.vn/ipad-air-m4-11-inch-256gb--p852965?sku=260300207&selectPromotionId=3641515', 1),
  ('260300207', 'https://lh3.googleusercontent.com/p3ZOrMBDcDDbQO1pWLNEc1AgB-nKjTRbmiAlusuBfI6wVx84TrChFq05a3v81eC3Xgd8R1A-av-DfgpJuyF5rLMk744s7SvnOA=s0-rw', 'https://phongvu.vn/ipad-air-m4-11-inch-256gb--p852965?sku=260300207&selectPromotionId=3641515', 2),
  ('260300207', 'https://lh3.googleusercontent.com/TyQtQDOWaLneWs0rH11_9iv4CXn5qTAQLa7QZ5Z6Ob3BRJ4fggGY8xZKV_syOwnjnQs6cIAma6aEOM78IsVhWlp_rKKHEVps=s0-rw', 'https://phongvu.vn/ipad-air-m4-11-inch-256gb--p852965?sku=260300207&selectPromotionId=3641515', 3);

INSERT INTO categories (code, name) VALUES
    ('laptop', 'Laptop'), ('phone', 'Điện thoại'), ('tablet', 'Máy tính bảng')
ON CONFLICT (code) DO NOTHING;

INSERT INTO brands (name)
SELECT DISTINCT m.brand
FROM pv_model_seed m
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE lower(b.name) = lower(m.brand))
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (
    category_id, brand_id, slug, model_name, announcement_date, release_year,
    chipset, screen_inches, specifications, official_source_url
)
SELECT c.id, b.id, m.slug, m.model_name, m.announcement_date, m.release_year,
       m.chipset, m.screen_inches, m.specifications_json, m.source_url
FROM pv_model_seed m
JOIN categories c ON c.code = m.category
JOIN LATERAL (
    SELECT id FROM brands
    WHERE lower(name) = lower(m.brand)
    ORDER BY (name = m.brand) DESC, id
    LIMIT 1
) b ON TRUE
ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE pv_catalog_2026 ON COMMIT DROP AS
SELECT s.*, p.id AS product_id
FROM phongvu_catalog_snapshot s
JOIN pv_model_seed m ON m.slug = s.model_slug
JOIN products p ON p.slug = m.slug
JOIN categories c ON c.id = p.category_id AND c.code = s.category
WHERE s.observed_on = DATE '2026-11-12'
  AND s.verified_release_year = 2026
  AND p.release_year = 2026;

INSERT INTO product_variants (
    product_id, sku, variant_name, ram_gb, storage_gb, price_kind,
    selling_price_vnd, selling_price_is_demo
)
SELECT s.product_id, 'PV-' || s.seller_sku, left(s.product_name, 160), s.ram_gb,
       s.storage_gb, 'not_verified', s.observed_price_vnd, TRUE
FROM pv_catalog_2026 s
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_items (variant_id, quantity_on_hand, quantity_reserved, is_demo_data)
SELECT v.id,
       CASE WHEN s.store_status = 'Thêm vào giỏ' AND s.observed_price_vnd IS NOT NULL THEN 5 ELSE 0 END,
       0, TRUE
FROM pv_catalog_2026 s
JOIN product_variants v ON v.sku = 'PV-' || s.seller_sku AND v.product_id = s.product_id
ON CONFLICT (variant_id) DO NOTHING;

-- Choose a single representative SKU for each model, then add any detail gallery for that SKU.
WITH chosen AS (
    SELECT DISTINCT ON (s.product_id) s.*
    FROM pv_catalog_2026 s
    ORDER BY s.product_id,
             EXISTS (SELECT 1 FROM pv_detail_image d WHERE d.seller_sku = s.seller_sku) DESC,
             (s.store_status = 'Thêm vào giỏ') DESC,
             (s.observed_price_vnd IS NOT NULL) DESC,
             (s.local_image_path IS NOT NULL) DESC, s.seller_sku
), images AS (
    SELECT c.product_id, COALESCE(d.image_url, c.image_url) AS image_url,
           COALESCE(d.source_url, c.seller_product_url) AS source_page_url,
           left(c.product_name, 255) AS alt_text, COALESCE(d.ordinal, 1) AS ordinal
    FROM chosen c
    LEFT JOIN pv_detail_image d ON d.seller_sku = c.seller_sku
)
INSERT INTO product_images (
    product_id, image_url, alt_text, is_primary, display_order, source_page_url, image_match
)
SELECT i.product_id, i.image_url, i.alt_text,
       i.ordinal = 1 AND NOT EXISTS (
           SELECT 1 FROM product_images x WHERE x.product_id = i.product_id AND x.is_primary
       ),
       i.ordinal - 1, i.source_page_url, 'model'
FROM images i
WHERE NOT EXISTS (
    SELECT 1 FROM product_images x
    WHERE x.product_id = i.product_id AND x.image_url = i.image_url
)
ON CONFLICT DO NOTHING;

COMMIT;
