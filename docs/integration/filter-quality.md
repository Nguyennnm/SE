# Filter naming and coverage review — P2

Checked on 22 November 2026 against the active PostgreSQL catalog. The audit is read-only and uses the same normalization function as product search.

## Storage labels

| Category | Label |
| --- | --- |
| Laptop | Dung lượng SSD |
| Phone / tablet | Bộ nhớ trong |
| All categories | Dung lượng lưu trữ |

The `storage` API parameter remains capacity in GB. Only the displayed label changes.

## Filterable models

This audit reports model-level coverage; the search UI requests `groupBy=variant` and displays SKU option counts. After the catalog brand/grouping correction, laptops contain 286 models.

Each cell is the number of distinct product groups with at least one filterable SKU, divided by the total active product groups in the category. These are not SKU counts and are not limited by the current keyword, brand or other selected filters.

| Specification | Laptop | Phone | Tablet |
| --- | --- | --- | --- |
| RAM | 286/286 | 21/26 | 52/53 |
| Storage | 286/286 | 26/26 | 53/53 |
| CPU family | 278/286 | 26/26 | 53/53 |
| Screen size | 285/286 | 25/26 | 52/53 |
| Screen technology | 255/286 | 23/26 | 48/53 |
| OS family | 285/286 | 26/26 | 52/53 |
| Usage | 286/286 | 0/26 | 0/53 |
| Refresh rate | 245/286 | 2/26 | 0/53 |

Groups with no known options are omitted from the filter panel. For example, usage is not offered for phones/tablets, and tablet refresh rate is not offered.

There can be missing values within a partially documented model. Examples from this audit:

- Phone RAM: 75/179 SKUs cannot be filtered by RAM; 5 models have no known RAM value in any SKU.
- Phone refresh rate: 171/179 SKUs have no known value; selecting a refresh rate can exclude 24/26 models solely because the value is unknown.
- Tablet storage: all 53 models have at least one known storage capacity, but 10/191 SKUs have no known capacity.
- Laptop CPU-family recognition covers 278 of the 286 corrected laptop models after handling explicitly named Intel Core Ultra X families. Recognizing Unisoc also recovered the remaining tablet CPU model.

Coverage measures normalized, filterable values. A missing filter value may mean that the raw field is absent or that its description cannot be classified safely. It is not proof that the device lacks the hardware feature.

## Search and UI behavior

- Without a selected technical filter, an unknown value does not exclude a product.
- When a filter is selected, only SKUs with a known matching value qualify. Different technical filters must match the same SKU.
- Explicit RAM/storage units and screen descriptions can supply a fallback when a dedicated field is missing. Values are not inferred from model names, brands, or assumed specifications.
- Ambiguous refresh-rate descriptions are left unknown.
- Coverage statistics are retained in the API and this audit rather than displayed as notes in the filter panel.
- Users can remove a filter to see products whose specifications are unknown.

## Reproduce

Start PostgreSQL, then run from `backend/`:

```powershell
npm run audit:filters
npm run test:discovery
```

The audit prints per-category model/SKU coverage and examples of CPU descriptions that remain unclassified. It does not modify the source snapshot or database records.

The checks cover category labels, missing/partial model counts, explicit-value fallbacks, unfiltered unknown values, and strict matching for selected filters. Frontend `npm run test:discovery` verifies the mobile-storage label, absence of coverage notes, and laptop SSD label after switching categories.
