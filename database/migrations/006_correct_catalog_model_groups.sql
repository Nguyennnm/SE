-- Repair hardware brands confused with bundled Microsoft software.
-- Incremental, transactional and repeatable; preserves SKU IDs and their references.
-- Back up the database first. Do NOT rerun 01_import_phongvu_catalog.sql.
\set ON_ERROR_STOP on
BEGIN;
LOCK TABLE products, product_variants, product_images, brands, phongvu_catalog_snapshot IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE catalog_group_fix(old_slug text PRIMARY KEY, new_slug text, brand text) ON COMMIT DROP;
INSERT INTO catalog_group_fix VALUES
('pv-c650f14498a7cf2d2578','pv-5146bf0c969f8cd4cd1f','Dell'),
('pv-fe78979ebbfcd6539429','pv-7fb73a3e4583df3e306a','HP'),
('pv-74d0337f4a6f63d3ea70','pv-898f9d5a4e291fb4cb3c','Lenovo'),
('pv-118b0c51a64bf23b79d8','pv-d33cb201caad32a5f349','Lenovo'),
('pv-b3586fcae23f2e8f5359','pv-5384a8d3b8807be9e715','Lenovo'),
('pv-126c139568ea9ae8ca88','pv-1527bf5d046e1c114f9a','ASUS'),
('pv-3b6cdbd40544d8c2e604','pv-c147489a19f0ced80fb8','Lenovo'),
('pv-c5dce930a59031b0c173','pv-5c617f63b2dad58568f5','Lenovo'),
('pv-4e16894641a05fa0d74b','pv-3f22071ddecbf5a4c599','Lenovo'),
('pv-572f5bd9d582ebe827ac','pv-160b8500075de98a284d','HP'),
('pv-92dc77b1058d24a39725','pv-d72dbac67538418d6ea8','Dell'),
('pv-d6719a041e3bc184405a','pv-e6e7f8b08232de42d259','HP'),
('pv-90c7afa3f874189265c3','pv-6ca4739ee5f0669e3560','ASUS'),
('pv-84bc0a3a56f30469165c','pv-755063316675f47ace4b','Lenovo'),
('pv-98d7f33b64dc98b1bca9','pv-e6585abd230f06ad4474','HP'),
('pv-722f23f35b293767e671','pv-7d35ab94401c7c42fe10','Lenovo'),
('pv-d393753d9c334f009f07','pv-335d5a4e9060261d4ad5','Dell'),
('pv-9edb5fe1ce576e79100f','pv-028e7996fda985612ae7','Lenovo'),
('pv-2e3038df4195e157c5da','pv-1a200bf9247be4d568eb','Lenovo'),
('pv-816a293c863d5621d231','pv-174054643bff3a941af4','Lenovo'),
('pv-77d46ecce81da9e592ea','pv-b0b4b170e14e73e8f0b6','Lenovo'),
('pv-25e65812bf150f333b7a','pv-e8a9cb72639d850e27c8','HP'),
('pv-c09bb72a21098b423167','pv-44086daf96a8c8631e55','Lenovo'),
('pv-df6c577a027eda52bbc9','pv-f66246ba79a629a682df','HP'),
('pv-9b2cf2372a43f8a70e1c','pv-9a14702f0da35374b5c7','HP'),
('pv-834a07eb03d366b671cc','pv-d347cc75b2d8bff4b813','Lenovo'),
('pv-392fd820e8532a3db3a0','pv-c362b6aa52cb73445854','ASUS'),
('pv-90c0b0242fd91ac4df94','pv-b6cdcbf334a8eb8533bf','ASUS'),
('pv-34e370a2ca4eee8fae0a','pv-359c0cd6e0f7ec84b751','Lenovo'),
('pv-aaae23b6360d3f02e6b0','pv-48aaf08a04eea62afe95','Dell'),
('pv-d46b7329f0dfb73ee9d6','pv-e02fbf27bf6c92d5bda5','Dell'),
('pv-be8dc11f8ab6f9d227ac','pv-8ea98ad5d55653c9eff5','Dell'),
('pv-e2d02c6c0db9e4307092','pv-d1943860936f85fd744f','Dell'),
('pv-fdd91fea2e1872c8b91a','pv-30138b71c72659530ff0','Lenovo'),
('pv-a17bfbec0ae82aec92bf','pv-aef8b86759374f4ed92e','Dell'),
('pv-bcda8aed011e82221aeb','pv-9eb4ae0cc72a1ca0a420','Lenovo'),
('pv-f3861ffcf32793e8b64f','pv-45213e6c84157fa2468a','Lenovo'),
('pv-e33c35c20239fb09ca96','pv-cfcf7ba64c7055ac87a1','ASUS'),
('pv-81e4d5c3fef6b6c0304f','pv-401add10b67e7e8923ba','ASUS'),
('pv-efa0181239e90bd32d13','pv-d47e986b87db756f0e4b','ASUS'),
('pv-03c9a6fe2cd3ea26056e','pv-ffd72aa79036f9e32ca0','ASUS'),
('pv-2b319a2a8f040d5bb32f','pv-36cbcf534e90848640bc','ASUS');
CREATE TEMP TABLE catalog_counts_before ON COMMIT DROP AS
SELECT (SELECT COUNT(*) FROM product_variants) AS variants,
       (SELECT COUNT(*) FROM product_images) AS images,
       (SELECT COUNT(*) FROM inventory_items) AS inventory,
       (SELECT COUNT(*) FROM cart_items) AS cart_items;
INSERT INTO brands(name) SELECT DISTINCT brand FROM catalog_group_fix ON CONFLICT (name) DO NOTHING;
DO $$
DECLARE fix record; source_id bigint; target_id bigint;
BEGIN
  FOR fix IN SELECT * FROM catalog_group_fix LOOP
    SELECT id INTO source_id FROM products WHERE slug=fix.old_slug;
    IF source_id IS NULL THEN CONTINUE; END IF;
    SELECT id INTO target_id FROM products WHERE slug=fix.new_slug;
    IF target_id IS NULL OR target_id=source_id THEN
      UPDATE products SET slug=fix.new_slug, brand_id=(SELECT id FROM brands WHERE name=fix.brand) WHERE id=source_id;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM products a JOIN products b ON a.category_id=b.category_id AND a.model_name=b.model_name
                     WHERE a.id=source_id AND b.id=target_id) THEN
        RAISE EXCEPTION 'Refusing to merge different model families: %', fix.old_slug;
      END IF;
      -- Keep the destination's primary image, retaining every source image.
      UPDATE product_images SET is_primary=FALSE WHERE product_id=source_id
        AND EXISTS (SELECT 1 FROM product_images WHERE product_id=target_id AND is_primary);
      UPDATE product_variants SET product_id=target_id WHERE product_id=source_id;
      UPDATE product_images SET product_id=target_id WHERE product_id=source_id;
      DELETE FROM products WHERE id=source_id;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM catalog_counts_before WHERE
      variants<>(SELECT COUNT(*) FROM product_variants) OR images<>(SELECT COUNT(*) FROM product_images)
      OR inventory<>(SELECT COUNT(*) FROM inventory_items) OR cart_items<>(SELECT COUNT(*) FROM cart_items)) THEN
    RAISE EXCEPTION 'Catalog correction changed dependent row counts; rolling back';
  END IF;
END $$;
UPDATE phongvu_catalog_snapshot s SET brand=f.brand, model_slug=f.new_slug FROM catalog_group_fix f WHERE s.model_slug=f.old_slug;
COMMIT;
