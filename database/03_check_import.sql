-- Snapshot coverage, including prices that were not published.
SELECT category, count(*) AS total_skus,
       count(*) FILTER (WHERE verified_release_year = 2026) AS verified_2026_skus,
       count(observed_price_vnd) AS priced_skus,
       count(local_image_path) AS packaged_images
FROM phongvu_catalog_snapshot
WHERE observed_on = DATE '2026-11-12'
GROUP BY category
ORDER BY category;

-- Variant count and cart-ready rows in the PA4 schema.
SELECT c.code AS category, count(*) AS pv_variants,
       count(DISTINCT p.id) AS pv_models,
       count(*) FILTER (WHERE v.selling_price_vnd IS NOT NULL AND i.quantity_on_hand > i.quantity_reserved) AS demo_cart_ready
FROM product_variants v
JOIN products p ON p.id = v.product_id
JOIN categories c ON c.id = p.category_id
LEFT JOIN inventory_items i ON i.variant_id = v.id
JOIN phongvu_catalog_snapshot s
  ON s.observed_on = DATE '2026-11-12' AND v.sku = 'PV-' || s.seller_sku AND s.model_slug = p.slug
WHERE p.release_year = 2026
GROUP BY c.code
ORDER BY c.code;
