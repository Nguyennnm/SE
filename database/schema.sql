-- Smart Electronics Store PA4 | PostgreSQL 16+ | Catalog 2026
-- Chỉ chứa 3 danh mục sản phẩm. Mọi SKU DEMO-* và tồn kho đều là dữ liệu mô phỏng.
CREATE TABLE IF NOT EXISTS categories (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS brands (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id SMALLINT NOT NULL REFERENCES categories(id),
    brand_id SMALLINT NOT NULL REFERENCES brands(id),
    slug VARCHAR(160) NOT NULL UNIQUE,
    model_name VARCHAR(255) NOT NULL,
    announcement_date DATE NOT NULL,
    release_year INTEGER NOT NULL CHECK (release_year BETWEEN 2000 AND 2100),
    chipset VARCHAR(160),
    screen_inches NUMERIC(4,1),
    specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    official_source_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(180) NOT NULL UNIQUE, -- SKU nội bộ demo, KHÔNG phải SKU của hãng
    variant_name VARCHAR(160) NOT NULL,
    ram_gb INTEGER CHECK (ram_gb IS NULL OR ram_gb > 0),
    storage_gb INTEGER CHECK (storage_gb IS NULL OR storage_gb > 0),
    price_vnd NUMERIC(14,0) CHECK (price_vnd IS NULL OR price_vnd >= 0),
    price_kind VARCHAR(45) NOT NULL CHECK (price_kind IN
       ('announced_starting_price','announced_msrp_for_config','official_store_starting_price','not_verified')),
    price_source_url TEXT,
    price_as_of DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (price_kind <> 'not_verified' OR price_vnd IS NULL)
);
CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    variant_id BIGINT NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    is_demo_data BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (quantity_reserved <= quantity_on_hand)
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_year ON products(release_year);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(lower(model_name));
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
