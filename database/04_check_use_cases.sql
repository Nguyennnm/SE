-- Verify imported 2026 products can be filtered, displayed and put into a demo cart.
\echo '== PA4: 2026 SKU per category and purchasable rows =='
SELECT c.code AS category,
       count(*) AS imported_sku,
       count(*) FILTER (WHERE v.selling_price_vnd IS NOT NULL AND
                              i.quantity_on_hand > i.quantity_reserved) AS cart_ready
FROM product_variants v
JOIN products p ON p.id=v.product_id
JOIN categories c ON c.id=p.category_id
JOIN phongvu_catalog_snapshot s
 ON s.seller_sku=substring(v.sku from 4) AND s.model_slug=p.slug
 AND s.observed_on=DATE '2026-11-12'
JOIN inventory_items i ON i.variant_id=v.id
WHERE v.sku LIKE 'PV-%' AND p.release_year=2026
GROUP BY c.code ORDER BY c.code;

\echo '== UC17: sample laptop search/filter =='
SELECT v.sku, p.model_name, b.name AS brand, v.ram_gb, v.storage_gb,
       v.selling_price_vnd AS price_vnd
FROM product_variants v JOIN products p ON p.id=v.product_id
JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
WHERE v.sku LIKE 'PV-%' AND c.code='laptop' AND p.release_year=2026
AND v.selling_price_vnd IS NOT NULL
ORDER BY v.selling_price_vnd ASC, v.sku LIMIT 5;

\echo '== UC16: detail + image for one PA4 product =='
SELECT p.slug, p.model_name, v.sku, v.ram_gb, v.storage_gb,
       v.selling_price_vnd AS price_vnd,
       COALESCE(img.image_url,'NO_IMAGE') AS main_image
FROM product_variants v
JOIN products p ON p.id=v.product_id
LEFT JOIN LATERAL (
 SELECT image_url FROM product_images WHERE product_id=p.id AND is_primary
 LIMIT 1
) img ON true
WHERE v.sku LIKE 'PV-%' AND p.release_year=2026
ORDER BY p.slug,v.sku LIMIT 3;

\echo '== UC19: cart schema, no stock reservation at add-to-cart =='
SELECT (SELECT count(*) FROM information_schema.tables
        WHERE table_schema='public' AND table_name IN ('users','shopping_carts','cart_items'))
       AS cart_tables_present,
       (SELECT count(*) FROM cart_items) AS cart_rows,
       (SELECT count(*) FROM inventory_items WHERE quantity_reserved=0) AS unreserved_inventory_rows;
