import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import app from '../src/app.js';
import { checkDatabaseConnection, pool } from '../src/config/database.js';

// Read-only integration checks. Install migration 009 first; demo orders are optional.
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

async function search(path: string) {
  const response = await fetch(base + path);
  const payload = await response.json() as {
    success: boolean;
    data: Array<{
      id: number | string;
      sold_30d?: number;
      demo_sold_30d?: number;
      selected_variant_id?: number | string;
      variants: Array<{ sku: string }>;
      price: number | null;
    }>;
    pagination: { total: number; totalPages: number };
    error?: { message: string };
  };
  assert.equal(response.status, 200, payload.error?.message ?? path);
  return payload;
}

try {
  assert(await checkDatabaseConnection(), 'PostgreSQL must be available for best-selling tests.');
  const view = await pool.query<{ view: string | null }>(
    "SELECT to_regclass('public.product_sales_30d')::text AS view"
  );
  assert(view.rows[0]?.view, 'Run database/migrations/009_orders_best_selling.sql first.');

  // Model-level rankings must use sales over ALL its variants, before pagination.
  const expectedModels = await pool.query<{
    id: number;
    sold_30d: string;
    demo_sold_30d: string;
  }>(`
    SELECT p.id, COALESCE(s.sold_30d, 0) AS sold_30d,
      COALESCE(s.demo_sold_30d, 0) AS demo_sold_30d
    FROM products p
    LEFT JOIN product_sales_30d s ON s.product_id = p.id
    WHERE p.is_active AND EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v.product_id = p.id AND v.is_active
    )
    ORDER BY COALESCE(s.sold_30d, 0) DESC, p.id DESC
    LIMIT 50
  `);
  const models = await search('/products/search?groupBy=product&sort=best_selling&limit=50');
  assert.deepEqual(
    models.data.map(p => [Number(p.id), Number(p.sold_30d), Number(p.demo_sold_30d)]),
    expectedModels.rows.map(p => [Number(p.id), Number(p.sold_30d), Number(p.demo_sold_30d)])
  );
  console.log('PASS product-level sales ranking, counts, and stable tie-breaker.');

  // SKU cards must inherit their parent product sales (not individual SKU sales).
  const expectedSkus = await pool.query<{
    product_id: number;
    sku: string;
    sold_30d: string;
  }>(`
    SELECT p.id AS product_id, v.sku, COALESCE(s.sold_30d, 0) AS sold_30d
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN product_sales_30d s ON s.product_id = p.id
    WHERE p.is_active AND v.is_active
    ORDER BY COALESCE(s.sold_30d, 0) DESC, p.id DESC, v.id ASC
    LIMIT 100
  `);
  const skus = await search('/products/search?groupBy=variant&sort=best_selling&limit=100');
  assert.deepEqual(
    skus.data.map(p => [Number(p.id), p.variants[0]?.sku, Number(p.sold_30d)]),
    expectedSkus.rows.map(p => [Number(p.product_id), p.sku, Number(p.sold_30d)])
  );
  const skusPage2 = await search('/products/search?groupBy=variant&sort=best_selling&limit=100&page=2');
  const keys = [...skus.data, ...skusPage2.data].map(p => p.variants[0]?.sku);
  assert.equal(new Set(keys).size, keys.length, 'SKU must not repeat between pages.');
  console.log('PASS SKU ranking and no duplicated SKUs between pages.');

  // Old price sorting must continue to work.
  const asc = await search('/products/search?groupBy=variant&sort=asc&limit=40');
  const priced = asc.data.map(p => p.price).filter((p): p is number => p !== null);
  assert(priced.every((price, i) => i === 0 || priced[i - 1] <= price));
  console.log('PASS price sorting remains intact.');

  if (!expectedModels.rows.some(p => Number(p.sold_30d) > 0)) {
    console.log('NOTE: No confirmed sales in the last 30 days; run the optional demo seed to see nonzero rankings.');
  }
  console.log('Best-selling integration: 3/3 checks passed.');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
