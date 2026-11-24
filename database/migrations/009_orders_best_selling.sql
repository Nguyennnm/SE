-- PA4 extension: order records and 30-day best-seller reporting.
-- Run AFTER 002_uc16_uc17_uc19.sql (users) and AFTER the catalog import.
-- This is an additive migration: no catalog TRUNCATE, no historical orders.
-- If another teammate has created orders/order_items already, reconcile schemas
-- before applying; IF NOT EXISTS does not validate an existing table shape.
BEGIN;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_code VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    is_demo BOOLEAN NOT NULL DEFAULT TRUE,
    -- A sale is only counted after confirmation; never count pending carts.
    CONSTRAINT ck_orders_confirmation
        CHECK (status NOT IN ('confirmed', 'completed') OR confirmed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    -- Snapshot of the agreed price, NOT the current product_variants price.
    unit_price_vnd NUMERIC(14,0) NOT NULL CHECK (unit_price_vnd > 0),
    CONSTRAINT uq_order_items_order_variant UNIQUE (order_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_confirmed_status
    ON orders (confirmed_at DESC, id)
    WHERE status IN ('confirmed', 'completed');
CREATE INDEX IF NOT EXISTS idx_order_items_variant
    ON order_items (variant_id);

-- No materialized counter: canceled orders automatically disappear and
-- repeated status transitions never double-count an order_item.
-- A normal view evaluates a rolling 30 x 24-hour window on every query.
-- Group by product_id so multiple SKU variants occupy ONE product card.
CREATE OR REPLACE VIEW product_sales_30d AS
SELECT
    v.product_id,
    COALESCE(SUM(oi.quantity) FILTER (
        WHERE o.status IN ('confirmed', 'completed')
          AND o.confirmed_at >= NOW() - INTERVAL '30 days'
          AND o.confirmed_at <= NOW()
    ), 0)::BIGINT AS sold_30d,
    COALESCE(SUM(oi.quantity) FILTER (
        WHERE o.is_demo = TRUE
          AND o.status IN ('confirmed', 'completed')
          AND o.confirmed_at >= NOW() - INTERVAL '30 days'
          AND o.confirmed_at <= NOW()
    ), 0)::BIGINT AS demo_sold_30d
FROM product_variants v
LEFT JOIN order_items oi ON oi.variant_id = v.id
LEFT JOIN orders o ON o.id = oi.order_id
GROUP BY v.product_id;

COMMENT ON VIEW product_sales_30d IS
  'Rolling 30-day confirmed/completed sales by product; includes demo orders; no cart or pending quantities.';

COMMIT;
