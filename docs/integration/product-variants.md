# Search by product variant

Implemented on 22 November 2026. The search screen renders one card per active SKU. A shared model name is expected when two cards represent different configurations or colors; each card shows its configuration title and SKU explicitly.

## API contract

- `GET /api/products/search?groupBy=variant`: filter, count, sort and paginate individual SKUs. Each result retains the parent product `id`, includes `selected_variant_id`, contains exactly one matching `variants` entry and reports the model's total active `variant_count`.
- `GET /api/products/suggestions?groupBy=variant&q=iphone`: return up to five distinct matching SKU suggestions, respecting the same filters.
- `GET /api/products/filters?groupBy=variant&category=phone`: option counts refer to active SKUs in that category, independent of the keyword and other filters.
- Omit `groupBy` or use `groupBy=product` for the existing model-level API. Existing consumers retain their pagination contract.
- `GET /api/products/:id`: return all active variants and their image identities (`images[].variant_id`). The frontend initially selects the card's SKU and switches variants locally.

Keywords, technical specifications, price and available inventory must match the same SKU. SKU identifiers are also searchable. Unknown prices remain null, and missing specifications are not inherited from a sibling configuration. Images are selected by variant ID, with a neutral illustration when no appropriate image exists. Saved IDs still represent model families, so saving a model saves all its configurations for the current session.

## Corrected catalog grouping

The hardware-brand parser previously prioritized `Microsoft` anywhere in a title, including bundled Office software. Correcting the parser changed 51 SKU brand records, and merged three accidentally split model groups. The snapshot now contains **365 models, 703 SKUs and 4,775 images**. Capacities/colors remain separate SKUs; different hardware models are not merged just because they share a title prefix.

New clean installations use the corrected JSON and `01_import_phongvu_catalog.sql`. For an **existing database**, back it up and apply only the incremental migration:

```powershell
docker exec ses-phongvu-pa4-db pg_dump -U ses_user -d smart_electronics_store -Fc -f /tmp/before-variant-groups.dump
$catalogBackupPath = Join-Path $env:TEMP 'before-variant-groups.dump'
docker cp ses-phongvu-pa4-db:/tmp/before-variant-groups.dump $catalogBackupPath
docker cp database/migrations/006_correct_catalog_model_groups.sql ses-phongvu-pa4-db:/tmp/006_correct_catalog_model_groups.sql
docker exec ses-phongvu-pa4-db psql -U ses_user -d smart_electronics_store -v ON_ERROR_STOP=1 -f /tmp/006_correct_catalog_model_groups.sql
```

Keep the backup outside Git. Do not rerun the clean import against an existing database for this change: it truncates catalog/cart data. Migration 006 is transactional and repeatable, retains variant IDs and their inventory/cart references, retains images, and refuses to merge conflicting model names/categories.

The local development database was backed up before applying the migration. Dependent row counts were preserved, and variant/image relationships were checked afterward.

## Verification

```powershell
python scripts/test_catalog_groups.py
cd backend
npm run build
npm run test:variants
npm run test:discovery
cd ../frontend
npm run build
# Backend must be running separately for frontend checks.
npm run test:integration
npm run test:discovery
```

Checks cover SKU-level totals and pagination without duplicates, grouped API compatibility, same-SKU combined filters, suggestions, variant image identity, exact selection when opening a card, switching configurations, missing values and the catalog parser regression. Frontend interaction checks use jsdom; they do not constitute visual browser verification.
