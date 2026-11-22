import { checkDatabaseConnection, pool } from '../src/config/database.js';
import { productService } from '../src/modules/catalog/product.service.js';
import { specKeys, variantSpecs } from '../src/modules/catalog/product.facets.js';

// Read-only audit of the same active variants used by the search filters.
try {
  if (!await checkDatabaseConnection()) throw new Error('PostgreSQL is required for the filter coverage audit.');
  const rows = await productService.getFacetRows();
  const result = ['laptop', 'phone', 'tablet'].map(category => {
    const variants = rows.filter(row => row.category_code === category);
    const totalModels = new Set(variants.map(row => row.product_id)).size;
    const parsed = variants.map(row => ({ row, values: variantSpecs(row) }));
    return {
      category, totalModels, totalVariants: variants.length,
      fields: Object.fromEntries(specKeys.map(key => {
        const known = parsed.filter(entry => entry.values[key]);
        const knownModels = new Set(known.map(entry => entry.row.product_id)).size;
        const missingVariants = variants.length - known.length;
        return [key, { knownModels, missingModels: totalModels - knownModels, missingVariants }];
      })),
      unclassifiedCpuSamples: [...new Set(parsed.filter(entry => !entry.values.cpu).map(entry => entry.row.specifications?.cpu_chipset).filter(Boolean))].slice(0, 5),
    };
  });
  console.log(JSON.stringify(result, null, 2));
} finally { await pool.end(); }
