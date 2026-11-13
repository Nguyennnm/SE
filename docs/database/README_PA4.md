# Catalog: independent Phong Vu crawl (no release-year restriction)

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
