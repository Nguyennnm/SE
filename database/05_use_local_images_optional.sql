-- OPTIONAL: after copying packaged WebP images to your React public/ directory.
-- Only the 15 models with at least one packaged PA4 image will be switched to local URL.
BEGIN;
WITH representative AS (
 SELECT DISTINCT ON (p.id) p.id AS product_id,
        '/' || regexp_replace(s.local_image_path, '^frontend/public/', '') AS local_url,
        s.seller_product_url
 FROM phongvu_catalog_snapshot s
 JOIN products p ON p.slug = s.model_slug
 WHERE s.observed_on=DATE '2026-11-12'
   AND s.verified_release_year=2026
   AND s.local_image_path IS NOT NULL
 ORDER BY p.id, (s.store_status='Thêm vào giỏ') DESC, s.seller_sku
)
UPDATE product_images pi
SET image_url=r.local_url, source_page_url=r.seller_product_url
FROM representative r
WHERE pi.product_id=r.product_id AND pi.is_primary;
COMMIT;
SELECT count(*) AS models_using_offline_image
FROM product_images
WHERE is_primary AND image_url LIKE '/images/products/phongvu/%';
