#!/usr/bin/env python3
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
