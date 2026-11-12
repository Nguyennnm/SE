#!/usr/bin/env python3
"""Read-only preflight; no network and does not modify the database."""
from pathlib import Path
import csv, collections, json, sys, struct
ROOT=Path(__file__).resolve().parents[1]

def load(rel):
    with (ROOT/rel).open('r',encoding='utf-8-sig',newline='') as f:
        return list(csv.DictReader(f))

allrows=load('data/phongvu_catalog.csv')
pa4=load('data/phongvu_pa4_2026.csv')
models=load('data/models_2026_sources.csv')
errors=[]
if len(allrows)!=1241 or len(pa4)!=338 or len(models)!=46: errors.append('Row counts do not match supplied snapshot')
if len({r['seller_sku'] for r in allrows})!=len(allrows): errors.append('Duplicate seller SKU in full snapshot')
if len({r['seller_sku'] for r in pa4})!=len(pa4): errors.append('Duplicate seller SKU in PA4')
if not {r['seller_sku'] for r in pa4}.issubset({r['seller_sku'] for r in allrows}): errors.append('PA4 SKU not in full snapshot')
if any(r['verified_release_year']!='2026' or not r['launch_source_url'] for r in pa4): errors.append('Unmarked 2026 row or missing launch source')
image_names=list((ROOT/'frontend/public/images/products/phongvu').rglob('*.webp'))
for file in image_names:
    with file.open('rb') as h:
        if h.read(4)!=b'RIFF' or h.read(4)==b'' or h.read(4)!=b'WEBP':
            errors.append('Invalid WebP header: '+str(file))
for r in allrows:
    path=r['local_image_path']
    if path and not (ROOT/path).is_file(): errors.append('Missing image for '+r['seller_sku'])
report={
 'all_skus':len(allrows),
 'verified_2026_skus':len(pa4),
 'models_2026':len(models),
 'by_category_all':dict(collections.Counter(r['category'] for r in allrows)),
 'by_category_2026':dict(collections.Counter(r['category'] for r in pa4)),
 'sku_with_price_2026':sum(bool(r['observed_price_vnd']) for r in pa4),
 'cart_ready_from_source_flags':sum(r['store_status']=='Thêm vào giỏ' and bool(r['observed_price_vnd']) for r in pa4),
 'packaged_webp':len(image_names),
 'offline_image_rows_2026':sum(bool(r['local_image_path']) for r in pa4),
 'models_with_offline_image':len(set(r['model_slug'] for r in pa4 if r['local_image_path'])),
 'errors':errors
}
print(json.dumps(report, ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)
