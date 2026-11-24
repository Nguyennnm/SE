-- PA4: metadata for product image sources; run after 002_uc16_uc17_uc19.sql
BEGIN;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_license VARCHAR(80);
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_match VARCHAR(12);
CREATE INDEX IF NOT EXISTS ix_product_images_main ON product_images(product_id,is_primary);
COMMIT;
