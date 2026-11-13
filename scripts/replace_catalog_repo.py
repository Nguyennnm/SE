#!/usr/bin/env python3
"""Replace legacy PA4 2026 demo catalog with independently crawled SKU data.

Run from any directory:
  py replace_catalog_repo.py --repo "D:\\Hoc tap\\SE\\SE" \
    --crawl "D:\\Hoc tap\\SE\\PhongVu_Full_Catalog_Independent\\results\\full_catalog\\crawled_details.json"

Only prepares tracked repository files. Does NOT connect to PostgreSQL, run Docker,
modify GitHub, or delete database records. Backups are outside the repository.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

DATA_NAME = 'phongvu_catalog_current.json'
OLD_PATHS = (
    'data/phongvu_pa4_2026.csv',
    'data/models_2026_sources.csv',
    'data/category_sources.csv',
    'data/detail_samples.json',
    'data/image_manifest.csv',
    'data/import_verification.json',
    'data/phongvu_catalog.csv',
)
BACKUP_PATHS = OLD_PATHS + (
    'database/schema.sql',
    'database/00_install_clean_psql.sql',
    'database/01_import_phongvu_catalog.sql',
    'database/03_check_import.sql',
    'database/04_check_use_cases.sql',
    'database/05_use_local_images_optional.sql',
    'database/seed/seed-products.sql',
    'scripts/check_data.py',
    'docs/database/README_PA4.md',
)
KNOWN_BRANDS = [
    'Thunderobot', 'Gigabyte', 'Microsoft', 'Motorola', 'Samsung',
    'Xiaomi', 'Lenovo', 'Realme', 'Infinix', 'Huawei', 'Google',
    'Honor', 'Apple', 'Acer', 'Asus', 'Dell', 'Msi', 'Oppo',
    'Vivo', 'Nokia', 'Tecno', 'Nubia', 'TCL', 'ZTE', 'HP', 'LG'
]
NORMAL_BRANDS = {'Asus': 'ASUS', 'Msi': 'MSI', 'Honor': 'HONOR', 'Oppo': 'OPPO', 'Vivo': 'vivo', 'HP': 'HP', 'LG': 'LG'}


def brand_from_name(name):
    for brand in KNOWN_BRANDS:
        if re.search(r'(?<!\w)' + re.escape(brand) + r'(?!\w)', name, flags=re.I):
            return NORMAL_BRANDS.get(brand, brand)
    if re.search(r'\b(?:MacBook|iPhone|iPad)\b', name, re.I):
        return 'Apple'
    if re.search(r'\bGalaxy\b', name, re.I):
        return 'Samsung'
    if re.search(r'\bRedmi\b', name, re.I):
        return 'Xiaomi'
    return 'Chưa xác định'


def infer_model_group(category, brand, name, sku):
    """Conservative grouping by retail family title; not manufacturer-verified.

    Keeps capacity and color in variant_name, while common family names can group.
    Ambiguous/unparseable names are isolated to their seller SKU.
    """
    s = re.sub(r"\s*\([^)]*\).*?$", "", name).strip()
    s = re.sub(r"^(?:Điện thoại(?: di động)?|Máy tính bảng(?:/Tablet)?)\s+", "", s, flags=re.I)
    if category in ('phone', 'tablet'):
        # Capacity and colors at the end of product titles designate variants.
        s = re.sub(r"\s+\d+(?:GB|TB)(?:\s*[/+]\s*\d+(?:GB|TB))?.*$", "", s, flags=re.I)
        s = re.sub(r"\s+[-–]\s+.*$", "", s)
        # WiFi/5G can be variants but may imply different radios; preserve here.
    else:
        # The title up to its CPU/RAM/SSD block is model-like, generally safe.
        # Remove retailer SKU suffixes only after a visually separated dash.
        s = re.sub(r"\s+[-–]\s+[A-Z0-9][A-Z0-9-]{5,}(?:\s+.*)?$", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip(" -–,.")
    if len(s) < 8:
        s = name + ' SKU ' + sku
    if brand == 'Apple' and re.match(r'^(?:MacBook|iPad|iPhone)\b', s, re.I):
        s = 'Apple ' + s
    if brand == 'Samsung' and re.match(r'^Galaxy\b', s, re.I):
        s = 'Samsung ' + s
    if brand == 'Xiaomi' and re.match(r'^Redmi\b', s, re.I):
        s = 'Xiaomi ' + s
    model_identity = '|'.join((category,brand,s.casefold()))
    digest = hashlib.sha256(model_identity.encode('utf-8')).hexdigest()[:20]
    return ('pv-' + digest, s[:255])


def _gb(token):
    match = re.search(r'\b(\d{1,4})\s*(GB|TB)\b', str(token or ''), re.I)
    if not match:
        return None
    value = int(match.group(1)) * (1024 if match.group(2).upper() == 'TB' else 1)
    return value if 0 < value <= 16384 else None


def parse_ram_storage(row):
    specs = row.get('specs') or {}
    ram = _gb(specs.get('ram'))
    storage = _gb(specs.get('ssd')) or _gb(specs.get('storage'))
    # Phones sometimes put RAM and storage in the same field.
    ram_text = str(specs.get('ram') or '')
    if storage is None:
        m = re.search(r'(?:bộ nhớ|lưu trữ|ROM)\s*:\s*(\d+\s*(?:GB|TB))',ram_text,re.I)
        if m:
            storage = _gb(m.group(1))
    if storage is None:
        # Only capacity in product name, not display size etc.
        gbs = re.findall(r'\b\d{2,4}\s*(?:GB|TB)\b', row.get('product_name') or '',re.I)
        if gbs:
            storage = _gb(gbs[-1])
    return ram, storage


def normalized_data(crawl_path):
    rows = json.loads(crawl_path.read_text(encoding='utf-8-sig'))
    if not isinstance(rows, list):
        raise ValueError('crawled_details.json must be a JSON array')
    success = [x for x in rows if x.get('status') == 'ok']
    if len(success) < 1:
        raise ValueError('No valid status=ok records')
    clean = []
    seen = set()
    for row in success:
        sku = str(row.get('seller_sku', '')).strip()
        cat = row.get('category')
        name = str(row.get('product_name', '')).strip()
        url = str(row.get('source_url', '')).strip()
        if not re.fullmatch(r'\d{7,12}', sku):
            raise ValueError('Missing/invalid seller_sku: ' + repr(sku))
        if sku in seen:
            raise ValueError('Duplicate seller_sku: ' + sku)
        seen.add(sku)
        if cat not in {'laptop', 'phone', 'tablet'} or not name:
            raise ValueError(f'Invalid category/name for SKU {sku}')
        if urlparse(url).hostname not in {'phongvu.vn', 'www.phongvu.vn'}:
            raise ValueError(f'Unexpected product source URL for SKU {sku}: {url}')
        price = row.get('observed_price_vnd')
        if price is not None:
            try:
                price = int(price)
            except (TypeError, ValueError):
                raise ValueError(f'Invalid observed price for SKU {sku}')
            if price <= 0:
                raise ValueError(f'Nonpositive observed price for SKU {sku}')
        gallery = [u for u in (row.get('gallery_urls') or [])
                   if isinstance(u, str) and urlparse(u).scheme in ('https', 'http')]
        gallery = list(dict.fromkeys(gallery))
        thumb = row.get('thumbnail_url') or None
        if not gallery and thumb and urlparse(thumb).scheme in ('https', 'http'):
            gallery = [thumb]
        article = row.get('source_description_text') or None
        # The source may display "Đang cập nhật" instead of a real article.
        if article and article.strip().casefold() in {'đang cập nhật', 'đang cập nhật.', 'đang cập nhật…'}:
            article = None
        fetched = row.get('fetched_utc') or None
        if fetched:
            datetime.fromisoformat(fetched.replace('Z', '+00:00'))
        model_slug, model_display_name = infer_model_group(cat,brand_from_name(name),name,sku)
        ram_gb, storage_gb = parse_ram_storage(row)
        clean.append({
            'seller_sku': sku,
            'model_slug': model_slug,
            'model_display_name': model_display_name,
            'ram_gb': ram_gb,
            'storage_gb': storage_gb,
            'category': cat,
            'brand': brand_from_name(name),
            'product_name': name,
            'source_url': url,
            'fetched_utc': fetched,
            'observed_price_vnd': price,
            'price_source': row.get('price_source') or None,
            'specs': row.get('specs') or {},
            'raw_specs': row.get('raw_specs') or {},
            'description_summary': row.get('description_summary') or None,
            'source_description_text': article,
            'description_found': bool(article),
            'thumbnail_url': thumb,
            'gallery_urls': gallery,
        })
    return clean


def sqlq(s):
    """SQL quoted string with PostgreSQL standard_conforming_strings = on."""
    return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"


def jsonsql(value):
    return sqlq(json.dumps(value, ensure_ascii=False, separators=(',', ':'))) + '::jsonb'


def make_import_sql(records):
    hdr = '''-- Generated from independently crawled Phong Vu details; NO 2026 release-year filter.
-- WARNING: Replaces the previous demo catalog and clears demo cart items.
-- Run only AFTER database backup and migrations 002, 003, 004.
\\set ON_ERROR_STOP on
BEGIN;
TRUNCATE TABLE cart_items, inventory_items, product_images, product_variants,
    products, brands, categories RESTART IDENTITY CASCADE;
DROP TABLE IF EXISTS phongvu_catalog_snapshot;
CREATE TABLE phongvu_catalog_snapshot (
    seller_sku TEXT PRIMARY KEY,
    category VARCHAR(20) NOT NULL CHECK (category IN ('laptop','phone','tablet')),
    brand VARCHAR(80) NOT NULL,
    model_slug VARCHAR(160) NOT NULL,
    model_display_name VARCHAR(255) NOT NULL,
    ram_gb INTEGER,
    storage_gb INTEGER,
    product_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    fetched_utc TIMESTAMPTZ,
    observed_price_vnd NUMERIC(14,0) CHECK (observed_price_vnd IS NULL OR observed_price_vnd > 0),
    price_source TEXT,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    description_summary TEXT,
    source_description_text TEXT,
    description_found BOOLEAN NOT NULL DEFAULT FALSE,
    thumbnail_url TEXT,
    gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX idx_pv_catalog_category ON phongvu_catalog_snapshot(category);
CREATE INDEX idx_pv_catalog_price ON phongvu_catalog_snapshot(observed_price_vnd);
INSERT INTO categories(code,name) VALUES
 ('laptop','Laptop'),('phone','Điện thoại'),('tablet','Máy tính bảng');
'''
    sql = [hdr]
    columns = '''seller_sku, category, brand, model_slug, model_display_name, ram_gb, storage_gb, product_name, source_url, fetched_utc,
    observed_price_vnd, price_source, specs, raw_specs, description_summary,
    source_description_text, description_found, thumbnail_url, gallery_urls'''
    for start in range(0, len(records), 25):
        vals = []
        for r in records[start:start+25]:
            v = [sqlq(r['seller_sku']), sqlq(r['category']), sqlq(r['brand']),
                 sqlq(r['model_slug']), sqlq(r['model_display_name']),
                 str(r['ram_gb']) if r['ram_gb'] is not None else 'NULL',
                 str(r['storage_gb']) if r['storage_gb'] is not None else 'NULL',
                 sqlq(r['product_name']), sqlq(r['source_url']),
                 (sqlq(r['fetched_utc'])+'::timestamptz') if r['fetched_utc'] else 'NULL',
                 str(r['observed_price_vnd']) if r['observed_price_vnd'] is not None else 'NULL',
                 sqlq(r['price_source']), jsonsql(r['specs']), jsonsql(r['raw_specs']),
                 sqlq(r['description_summary']), sqlq(r['source_description_text']),
                 'TRUE' if r['description_found'] else 'FALSE', sqlq(r['thumbnail_url']),
                 jsonsql(r['gallery_urls'])]
            vals.append('  (' + ', '.join(v) + ')')
        sql.append('INSERT INTO phongvu_catalog_snapshot ('+columns+') VALUES\n'+',\n'.join(vals)+';\n')
    sql.append('''-- Products are conservative retail model families; variants keep individual SKUs.
INSERT INTO brands(name) SELECT DISTINCT brand FROM phongvu_catalog_snapshot;
INSERT INTO products(category_id,brand_id,slug,model_name,announcement_date,
    release_year,chipset,screen_inches,specifications,official_source_url,
    short_description,description)
SELECT c.id,b.id,s.model_slug,LEFT(MIN(s.model_display_name),255),
    NULL,NULL,NULL,NULL,'{}'::jsonb,MIN(s.source_url), NULL,NULL
FROM phongvu_catalog_snapshot s
JOIN categories c ON c.code=s.category
JOIN brands b ON b.name=s.brand
GROUP BY c.id,b.id,s.model_slug;

-- Variant facts are attached to the exact SKU (not the model family).
-- Store's selling price is a demo copy of the observed Phong Vu price.
INSERT INTO product_variants(product_id,sku,variant_name,ram_gb,storage_gb,
    price_vnd,price_kind,price_source_url,price_as_of,
    selling_price_vnd,selling_price_is_demo,
    specifications,short_description,source_description_text,source_page_url)
SELECT p.id, 'PV-'||s.seller_sku, LEFT(s.product_name,160),s.ram_gb,s.storage_gb,
    NULL,'not_verified',s.source_url,s.fetched_utc::date,
    s.observed_price_vnd,TRUE,s.specs,s.description_summary,
    s.source_description_text,s.source_url
FROM phongvu_catalog_snapshot s
JOIN products p ON p.slug=s.model_slug;

-- Variant-specific galleries; only a representative image is primary per model.
WITH ranked_skus AS (
 SELECT s.*,v.id AS variant_id,v.product_id,
   ROW_NUMBER() OVER (PARTITION BY v.product_id
                      ORDER BY s.observed_price_vnd NULLS LAST,s.seller_sku) AS variant_rank
 FROM phongvu_catalog_snapshot s JOIN product_variants v
   ON v.sku='PV-'||s.seller_sku
)
INSERT INTO product_images(product_id,variant_id,image_url,alt_text,is_primary,
    display_order,source_page_url,image_match)
SELECT s.product_id,s.variant_id,img.url,LEFT(s.product_name,255),
    s.variant_rank=1 AND img.pos=1,img.pos-1,s.source_url,'exact'
FROM ranked_skus s
CROSS JOIN LATERAL jsonb_array_elements_text(s.gallery_urls)
    WITH ORDINALITY AS img(url,pos)
WHERE img.url <> '';

-- Simulated inventory ONLY; no-price SKUs cannot be added to a demo cart.
INSERT INTO inventory_items(variant_id,quantity_on_hand,quantity_reserved,is_demo_data)
SELECT v.id,CASE WHEN s.observed_price_vnd IS NULL THEN 0 ELSE 5 END,0,TRUE
FROM phongvu_catalog_snapshot s
JOIN product_variants v ON v.sku='PV-'||s.seller_sku;

DO $$
BEGIN
 IF (SELECT count(*) FROM phongvu_catalog_snapshot) <> __COUNT__ THEN
    RAISE EXCEPTION 'Snapshot row count mismatch';
 END IF;
 IF (SELECT count(*) FROM product_variants) <> __COUNT__ THEN
    RAISE EXCEPTION 'Variant count mismatch';
 END IF;
 IF (SELECT count(*) FROM products) > __COUNT__ THEN
    RAISE EXCEPTION 'Unexpected model count';
 END IF;
END $$;
COMMIT;
'''.replace('__COUNT__',str(len(records))))
    return '\n'.join(sql)

INSTALL='''\\set ON_ERROR_STOP on
\\ir schema.sql
\\ir migrations/002_uc16_uc17_uc19.sql
\\ir migrations/003_images_metadata.sql
\\ir migrations/004_allow_unknown_release_year.sql
\\ir 01_import_phongvu_catalog.sql
\\ir 03_check_import.sql
'''
MIGRATION='''-- Source listing does not verify product release year / official announcement date.
BEGIN;
ALTER TABLE products ALTER COLUMN announcement_date DROP NOT NULL;
ALTER TABLE products ALTER COLUMN release_year DROP NOT NULL;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_description_text TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_page_url TEXT;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_product_images_variant ON product_images(variant_id,display_order);
COMMIT;
'''
CHECK_IMPORT='''\\echo '== Independently crawled catalog =='
SELECT category, COUNT(*) AS sku_count,
       COUNT(observed_price_vnd) AS with_price,
       COUNT(*) FILTER (WHERE observed_price_vnd IS NULL) AS without_price,
       COUNT(*) FILTER (WHERE description_found) AS with_source_article
FROM phongvu_catalog_snapshot GROUP BY category ORDER BY category;
SELECT (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM product_variants) AS variants,
       (SELECT COUNT(*) FROM product_images) AS images,
       (SELECT COUNT(*) FROM inventory_items) AS inventory_rows;
'''
CHECK_UC='''\\echo '== UC17 search/filter (no release_year restriction) =='
SELECT c.code AS category,p.model_name,b.name AS brand,v.sku,
       v.selling_price_vnd AS price_vnd
FROM products p JOIN categories c ON c.id=p.category_id
JOIN brands b ON b.id=p.brand_id
JOIN product_variants v ON v.product_id=p.id
WHERE lower(p.model_name) LIKE '%galaxy%'
ORDER BY v.selling_price_vnd NULLS LAST LIMIT 10;
\\echo '== UC16 details/gallery =='
SELECT p.slug,p.model_name,v.sku,v.short_description,
       (SELECT COUNT(*) FROM product_images i WHERE i.variant_id=v.id) AS gallery_count
FROM products p JOIN product_variants v ON v.product_id=p.id
ORDER BY p.id LIMIT 5;
\\echo '== UC19 cart readiness; no price => no add-to-cart =='
SELECT COUNT(*) AS all_variants,
 COUNT(*) FILTER (WHERE v.selling_price_vnd IS NOT NULL AND
                      i.quantity_on_hand>i.quantity_reserved) AS cart_ready,
 COUNT(*) FILTER (WHERE v.selling_price_vnd IS NULL) AS price_missing
FROM product_variants v JOIN inventory_items i ON i.variant_id=v.id;
'''
NO_SEED='''-- Deprecated old 338-SKU 2026 seed. All 703 independently crawled SKU are
-- inserted by database/01_import_phongvu_catalog.sql (generated by converter).
'''
NO_LOCAL='''-- The new catalog references gallery URLs recorded at crawl time.
-- No legacy packaged WebP image map is used in this dataset.
-- Download/rehost images only after reviewing permission and license.
'''
CHECK_SCRIPT='''#!/usr/bin/env python3
"""Read-only checks for the replacement catalog JSON; no old 2026 filter."""
import json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/phongvu_catalog_current.json').read_text(encoding='utf-8'))
ids=[str(x.get('seller_sku')) for x in rows]
assert len(ids)==len(set(ids)), 'Duplicate SKU'
assert all(x.get('category') in ('laptop','phone','tablet') for x in rows)
assert all(x.get('source_url') and x.get('product_name') for x in rows)
print(json.dumps({'total':len(rows),'by_category':dict(Counter(x['category'] for x in rows)),
                  'without_price':sum(x['observed_price_vnd'] is None for x in rows),
                  'without_article':sum(not x['description_found'] for x in rows)},
                 ensure_ascii=False,indent=2))
'''
DOC='''# Catalog: independent Phong Vu crawl (no release-year restriction)

The previous 1,241-SKU snapshot, 338-SKU 2026 subset, and manufacturer-model seed
have been replaced. The new source of truth is `data/phongvu_catalog_current.json`,
created from `crawled_details.json` using `replace_catalog_repo.py`.

- Only `status=ok` and valid seller SKU records are imported.
- Missing observed price stays SQL NULL and demo inventory is zero for that SKU.
- Empty manufacturer description is valid; summary is RULE-BASED, source text
  exists only when actually captured by the crawler.
- Release year and announcement date remain NULL; no 2026 filtering.
- Each source SKU maps to exactly one product_variants record. Product families are
  conservatively grouped from retail titles; inspect groups before relying on
  exact model/variant semantics. Variant images and specs remain SKU-specific.
- Brand is inferred from the retail product name; inspect 'Chưa xác định' rows.
- Images use third-party remote URLs. Reuse rights are not verified.
- Inventory (5 per priced SKU, 0 without price) is DEMO ONLY, not Phong Vu inventory.

## Windows installation (database reset; local data backup required!)

1. Run `py scripts/check_data.py` and review new dataset.
2. Stop if there are real accounts/cart/order data. The import truncates demo
   catalog, inventory and cart-items. Make a `pg_dump` backup first.
3. Run `./setup_windows.ps1` (copies generated SQL into Docker).
4. Run `./verify_windows.ps1`.

`01_import_phongvu_catalog.sql` is generated and uses a full transaction:
if import fails, PostgreSQL rolls back the replacement SQL.
'''


def write(repo, rel, data):
    p = repo / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data, encoding='utf-8')


def main():
    pa=argparse.ArgumentParser()
    pa.add_argument('--repo',type=Path,required=True)
    pa.add_argument('--crawl',type=Path,required=True)
    pa.add_argument('--dry-run',action='store_true')
    args=pa.parse_args()
    repo=args.repo.resolve(); crawl=args.crawl.resolve()
    if not (repo/'.git').exists() or not (repo/'database/schema.sql').exists():
        raise SystemExit('Invalid repo path; expected a Git clone with database/schema.sql')
    records=normalized_data(crawl)
    counts=Counter(r['category'] for r in records)
    missing=sum(r['observed_price_vnd'] is None for r in records)
    no_article=sum(not r['description_found'] for r in records)
    if len(records) < 703 or any(counts[k] < threshold for k,threshold in (('laptop',333),('phone',179),('tablet',191))):
        raise SystemExit(f'Unexpectedly small catalog {counts}. Refusing to overwrite; inspect new input.')
    print('Verified:',len(records),'categories:',dict(counts),'no price:',missing,'no source article:',no_article)
    if args.dry_run:
        return
    backup=repo.parent/('SE_catalog_backup_'+datetime.now().strftime('%Y%m%d_%H%M%S'))
    backup.mkdir(parents=True,exist_ok=False)
    for rel in BACKUP_PATHS:
        source=repo/rel
        if source.is_file():
            dest=backup/rel;dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(source,dest)
    # Generate/replace all files before deleting any legacy source file.
    write(repo,'data/'+DATA_NAME,json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    write(repo,'database/migrations/004_allow_unknown_release_year.sql',MIGRATION)
    write(repo,'database/01_import_phongvu_catalog.sql',make_import_sql(records))
    write(repo,'database/00_install_clean_psql.sql',INSTALL)
    write(repo,'database/seed/seed-products.sql',NO_SEED)
    write(repo,'database/03_check_import.sql',CHECK_IMPORT)
    write(repo,'database/04_check_use_cases.sql',CHECK_UC)
    write(repo,'database/05_use_local_images_optional.sql',NO_LOCAL)
    write(repo,'scripts/check_data.py',CHECK_SCRIPT)
    write(repo,'docs/database/README_PA4.md',DOC)
    schema=repo/'database/schema.sql'
    old=schema.read_text(encoding='utf-8-sig')
    old=old.replace('Catalog 2026', 'Catalog independent crawl (no launch-year filter)')
    schema.write_text(old,encoding='utf-8')
    for rel in OLD_PATHS:
        (repo/rel).unlink(missing_ok=True)
    print('Repository files prepared. Database NOT changed. Backup:',backup)
    print('Run: py scripts/check_data.py; git diff --stat')

if __name__=='__main__':
    main()
