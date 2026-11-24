"""Prepare corrected catalog files and an incremental SQL migration (no DB access).

Run without arguments to preview; --write updates files. Existing databases must
use migration 006, never rerun the destructive clean catalog import for this fix.
"""
import argparse
import json
from pathlib import Path
from replace_catalog_repo import brand_from_name, infer_model_group, make_import_sql, sqlq

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'data/phongvu_catalog_current.json'
    rows = json.loads(path.read_text(encoding='utf-8'))
    mappings, changed = {}, 0
    for row in rows:
        brand = brand_from_name(row['product_name'])
        slug, name = infer_model_group(row['category'], brand, row['product_name'], row['seller_sku'])
        if (brand, slug) != (row['brand'], row['model_slug']):
            mapping = (slug, brand)
            old = row['model_slug']
            if old in mappings and mappings[old] != mapping:
                raise ValueError('Ambiguous existing family: ' + old)
            mappings[old] = mapping
            row.update(brand=brand, model_slug=slug, model_display_name=name)
            changed += 1
    print(f'{changed} SKUs / {len(mappings)} families need correction; {len(rows)} SKUs retained.')
    if not args.write or not mappings:
        return
    values = ',\n'.join('(' + ','.join(map(sqlq, (old, *new))) + ')' for old, new in mappings.items())
    migration = r'''-- Repair hardware brands confused with bundled Microsoft software.
-- Incremental, transactional and repeatable; preserves SKU IDs and their references.
-- Back up the database first. Do NOT rerun 01_import_phongvu_catalog.sql.
\set ON_ERROR_STOP on
BEGIN;
LOCK TABLE products, product_variants, product_images, brands, phongvu_catalog_snapshot IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE catalog_group_fix(old_slug text PRIMARY KEY, new_slug text, brand text) ON COMMIT DROP;
INSERT INTO catalog_group_fix VALUES
''' + values + r''';
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
'''
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'database/01_import_phongvu_catalog.sql').write_text(make_import_sql(rows), encoding='utf-8')
    (ROOT / 'database/migrations/006_correct_catalog_model_groups.sql').write_text(migration, encoding='utf-8')
    print('Prepared snapshot, clean-install SQL and safe incremental migration. No database changes executed.')


if __name__ == '__main__':
    main()
