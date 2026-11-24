-- OPTIONAL DEMO ONLY. Execute AFTER 009_orders_best_selling.sql.
-- Creates six deterministic completed demo orders using priced active SKUs.
-- Safe to re-run: the order_code and (order_id, variant_id) constraints
-- prevent duplicates. Do NOT present these as real Phong Vu sales.
-- Orders are guest demo orders (user_id NULL), no login/password is seeded.
BEGIN;

WITH first_variant_per_product AS (
    SELECT p.id AS product_id, v.id AS variant_id, v.selling_price_vnd,
           ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY v.id) AS sku_rank
    FROM products p
    JOIN product_variants v ON v.product_id = p.id
    WHERE p.is_active = TRUE AND v.is_active = TRUE
      AND v.selling_price_vnd IS NOT NULL
),
chosen AS (
    SELECT product_id, variant_id, selling_price_vnd,
           ROW_NUMBER() OVER (ORDER BY product_id) AS rn
    FROM first_variant_per_product
    WHERE sku_rank = 1
    ORDER BY product_id
    LIMIT 6
)
INSERT INTO orders (order_code, user_id, status, created_at, confirmed_at, is_demo)
SELECT 'DEMO-BS-' || LPAD(rn::TEXT, 3, '0'),
       NULL, 'completed',
       NOW() - make_interval(days => rn::INTEGER) - INTERVAL '1 hour',
       NOW() - make_interval(days => rn::INTEGER),
       TRUE
FROM chosen
ON CONFLICT (order_code) DO NOTHING;

WITH first_variant_per_product AS (
    SELECT p.id AS product_id, v.id AS variant_id, v.selling_price_vnd,
           ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY v.id) AS sku_rank
    FROM products p
    JOIN product_variants v ON v.product_id = p.id
    WHERE p.is_active = TRUE AND v.is_active = TRUE
      AND v.selling_price_vnd IS NOT NULL
),
chosen AS (
    SELECT product_id, variant_id, selling_price_vnd,
           ROW_NUMBER() OVER (ORDER BY product_id) AS rn
    FROM first_variant_per_product
    WHERE sku_rank = 1
    ORDER BY product_id
    LIMIT 6
)
INSERT INTO order_items (order_id, variant_id, quantity, unit_price_vnd)
SELECT o.id, c.variant_id,
       CASE c.rn WHEN 1 THEN 5 WHEN 2 THEN 4 WHEN 3 THEN 3
                 WHEN 4 THEN 2 ELSE 1 END,
       c.selling_price_vnd
FROM chosen c
JOIN orders o
  ON o.order_code = 'DEMO-BS-' || LPAD(c.rn::TEXT, 3, '0')
WHERE o.is_demo = TRUE
ON CONFLICT (order_id, variant_id) DO NOTHING;

COMMIT;
