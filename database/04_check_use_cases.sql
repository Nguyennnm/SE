\echo '== UC17 search/filter (no release_year restriction) =='
SELECT c.code AS category,p.model_name,b.name AS brand,v.sku,
       v.selling_price_vnd AS price_vnd
FROM products p JOIN categories c ON c.id=p.category_id
JOIN brands b ON b.id=p.brand_id
JOIN product_variants v ON v.product_id=p.id
WHERE lower(p.model_name) LIKE '%galaxy%'
ORDER BY v.selling_price_vnd NULLS LAST LIMIT 10;
\echo '== UC16 details/gallery =='
SELECT p.slug,p.model_name,v.sku,v.short_description,
       (SELECT COUNT(*) FROM product_images i WHERE i.variant_id=v.id) AS gallery_count
FROM products p JOIN product_variants v ON v.product_id=p.id
ORDER BY p.id LIMIT 5;
\echo '== UC19 cart readiness; no price => no add-to-cart =='
SELECT COUNT(*) AS all_variants,
 COUNT(*) FILTER (WHERE v.selling_price_vnd IS NOT NULL AND
                      i.quantity_on_hand>i.quantity_reserved) AS cart_ready,
 COUNT(*) FILTER (WHERE v.selling_price_vnd IS NULL) AS price_missing
FROM product_variants v JOIN inventory_items i ON i.variant_id=v.id;
