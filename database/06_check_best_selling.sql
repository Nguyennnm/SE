\set ON_ERROR_STOP on
\echo '== Order counts by status and demo flag =='
SELECT status, is_demo, COUNT(*) AS orders
FROM orders
GROUP BY status, is_demo
ORDER BY status, is_demo;

\echo '== Best-selling product families (rolling 30 days) =='
SELECT p.id AS product_id, p.model_name, s.sold_30d, s.demo_sold_30d
FROM products p
LEFT JOIN product_sales_30d s ON s.product_id = p.id
WHERE p.is_active
ORDER BY COALESCE(s.sold_30d, 0) DESC, p.id DESC
LIMIT 10;

\echo '== Confirm products are unique in the sales view =='
SELECT COUNT(*) AS product_rows,
       COUNT(DISTINCT product_id) AS distinct_products
FROM product_sales_30d;

\echo '== Distinct demo order codes and total seeded quantities =='
SELECT COUNT(DISTINCT o.order_code) AS demo_orders,
       COALESCE(SUM(oi.quantity), 0) AS demo_units
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.order_code LIKE 'DEMO-BS-%' AND o.is_demo = TRUE;

-- Assert the view matches a fresh aggregation of legitimate sales only.
-- Canceled and pending orders are intentionally excluded.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM product_sales_30d s
        WHERE s.sold_30d <> (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM product_variants v
            JOIN order_items oi ON oi.variant_id = v.id
            JOIN orders o ON o.id = oi.order_id
            WHERE v.product_id = s.product_id
              AND o.status IN ('confirmed', 'completed')
              AND o.confirmed_at >= NOW() - INTERVAL '30 days'
              AND o.confirmed_at <= NOW()
        )
    ) THEN
        RAISE EXCEPTION 'product_sales_30d does not match order totals';
    END IF;
END $$;

\echo '== Transactional test: pending / confirmed / completed / cancelled =='
-- Changes below are temporary and always ROLLBACK (no permanent test orders).
BEGIN;
DO $
DECLARE
    test_variant_id BIGINT;
    test_product_id BIGINT;
    test_price NUMERIC(14,0);
    test_order_id BIGINT;
    baseline BIGINT;
    actual BIGINT;
BEGIN
    SELECT v.id, v.product_id, v.selling_price_vnd
      INTO test_variant_id, test_product_id, test_price
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE p.is_active AND v.is_active AND v.selling_price_vnd IS NOT NULL
    ORDER BY p.id, v.id
    LIMIT 1;

    IF test_variant_id IS NULL THEN
        RAISE EXCEPTION 'No priced SKU to test order lifecycle';
    END IF;

    SELECT sold_30d INTO baseline
    FROM product_sales_30d WHERE product_id = test_product_id;

    INSERT INTO orders (order_code, status, is_demo)
    VALUES ('TEST-BS-ROLLBACK-' || txid_current()::TEXT, 'pending', TRUE)
    RETURNING id INTO test_order_id;

    INSERT INTO order_items (order_id, variant_id, quantity, unit_price_vnd)
    VALUES (test_order_id, test_variant_id, 2, test_price);

    SELECT sold_30d INTO actual
    FROM product_sales_30d WHERE product_id = test_product_id;
    IF actual <> baseline THEN
        RAISE EXCEPTION 'Pending order should not count: expected %, got %', baseline, actual;
    END IF;

    UPDATE orders SET status = 'confirmed', confirmed_at = NOW() WHERE id = test_order_id;
    SELECT sold_30d INTO actual
    FROM product_sales_30d WHERE product_id = test_product_id;
    IF actual <> baseline + 2 THEN
        RAISE EXCEPTION 'Confirmed order expected %, got %', baseline + 2, actual;
    END IF;

    UPDATE orders SET status = 'completed' WHERE id = test_order_id;
    SELECT sold_30d INTO actual
    FROM product_sales_30d WHERE product_id = test_product_id;
    IF actual <> baseline + 2 THEN
        RAISE EXCEPTION 'Completed must not double count: got %', actual;
    END IF;

    UPDATE orders SET status = 'cancelled' WHERE id = test_order_id;
    SELECT sold_30d INTO actual
    FROM product_sales_30d WHERE product_id = test_product_id;
    IF actual <> baseline THEN
        RAISE EXCEPTION 'Cancelled must not count: expected %, got %', baseline, actual;
    END IF;
END $;
ROLLBACK;
\echo 'Order lifecycle checks passed (test data rolled back).'
\echo 'Best-selling database checks finished.'
