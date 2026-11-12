-- PA4 | UC16, UC17, UC19 | Run after schema.sql and seed_2026.sql
-- PostgreSQL 16+; all operations safe to re-run on a demo DB.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months SMALLINT
  CHECK (warranty_months IS NULL OR warranty_months >= 0);

-- Store selling prices are a LOCAL DEMO decision. Keep announced price separately.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price_vnd NUMERIC(14,0)
  CHECK (selling_price_vnd IS NULL OR selling_price_vnd > 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price_is_demo BOOLEAN
  NOT NULL DEFAULT TRUE;

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS display_order INTEGER
  NOT NULL DEFAULT 0;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS source_page_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_one_main_image_per_product
  ON product_images(product_id) WHERE is_primary = TRUE;

-- A minimal accounts table for the UC19 prototype; extend for UC01-UC08 later.
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS shopping_carts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cart_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    -- Only a price snapshot for display/change detection, not an order price.
    observed_unit_price_vnd NUMERIC(14,0) CHECK
       (observed_unit_price_vnd IS NULL OR observed_unit_price_vnd > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, variant_id)
);
CREATE INDEX IF NOT EXISTS ix_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS ix_product_images_product ON product_images(product_id,display_order);
COMMIT;
