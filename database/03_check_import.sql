\echo '== Independently crawled catalog =='
SELECT category, COUNT(*) AS sku_count,
       COUNT(observed_price_vnd) AS with_price,
       COUNT(*) FILTER (WHERE observed_price_vnd IS NULL) AS without_price,
       COUNT(*) FILTER (WHERE description_found) AS with_source_article
FROM phongvu_catalog_snapshot GROUP BY category ORDER BY category;
SELECT (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM product_variants) AS variants,
       (SELECT COUNT(*) FROM product_images) AS images,
       (SELECT COUNT(*) FROM inventory_items) AS inventory_rows;
