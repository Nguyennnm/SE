-- Source listing does not verify product release year / official announcement date.
BEGIN;
ALTER TABLE products ALTER COLUMN announcement_date DROP NOT NULL;
ALTER TABLE products ALTER COLUMN release_year DROP NOT NULL;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_description_text TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_page_url TEXT;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_product_images_variant ON product_images(variant_id,display_order);
COMMIT;
