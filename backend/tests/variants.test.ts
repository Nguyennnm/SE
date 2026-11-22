import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import app from '../src/app.js';
import { checkDatabaseConnection, pool } from '../src/config/database.js';

assert(await checkDatabaseConnection(), 'PostgreSQL is required.');
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
const read = async (path: string, status = 200) => {
  const response = await fetch(base + path); assert.equal(response.status, status, path); return response.json();
};
try {
  const expected = await pool.query('SELECT COUNT(*) AS count FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.is_active AND v.is_active');
  const first = await read('/products/search?groupBy=variant&limit=100');
  assert.equal(first.pagination.total, Number(expected.rows[0].count));
  const seen = new Set<string>();
  for (let page = 1; page <= first.pagination.totalPages; page++) {
    const result = page === 1 ? first : await read(`/products/search?groupBy=variant&limit=100&page=${page}`);
    for (const p of result.data) {
      assert.equal(p.variants.length, 1); const v = p.variants[0];
      assert(!seen.has(v.sku)); seen.add(v.sku);
      assert.equal(v.id, p.selected_variant_id); assert.equal(p.price, v.selling_price_vnd); assert.equal(p.stock, v.stock);
      assert(p.variant_count >= 1);
    }
  }
  assert.equal(seen.size, first.pagination.total);
  console.log('PASS SKU count, distinct cards, stable pagination, exact price and stock.');

  const modelName = 'Laptop Lenovo IdeaPad Slim 3 14IWC11';
  const models = await read('/products/search?q=' + encodeURIComponent(modelName));
  const exact = models.data.filter((p: any) => p.name === modelName);
  assert.equal(exact.length, 1); assert.equal(exact[0].brand, 'Lenovo'); assert(exact[0].variants.length > 1);
  const variants = await read('/products/search?groupBy=variant&limit=100&q=' + encodeURIComponent(modelName));
  const exactVariants = variants.data.filter((p: any) => p.id === exact[0].id);
  assert.equal(exactVariants.length, exact[0].variants.length);
  const sku = exactVariants[1].variants[0].sku;
  const found = await read('/products/search?groupBy=variant&q=' + sku);
  assert.equal(found.pagination.total, 1); assert.equal(found.data[0].variants[0].sku, sku);
  const detail = (await read('/products/' + exact[0].id)).data;
  assert.equal(detail.variants.length, exactVariants.length);
  assert(detail.images.every((image: any) => image.variant_id == null || detail.variants.some((v: any) => v.id === image.variant_id)));
  console.log('PASS corrected model grouping, SKU search and detail variant/image identity.');

  const path = '/products/search?groupBy=variant&category=laptop&ram=16&storage=512&maxPrice=30000000&inStock=true&sort=asc&limit=100';
  const filtered = await read(path);
  const count = await pool.query(`SELECT COUNT(*) AS count FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id JOIN inventory_items i ON i.variant_id=v.id WHERE v.is_active AND p.is_active AND c.code='laptop' AND v.ram_gb=16 AND v.storage_gb=512 AND v.selling_price_vnd<=30000000 AND i.quantity_on_hand-i.quantity_reserved>0`);
  assert.equal(filtered.pagination.total, Number(count.rows[0].count));
  for (const p of filtered.data) { const v = p.variants[0]; assert.equal(v.ram_gb, 16); assert.equal(v.storage_gb, 512); assert(p.price <= 30000000 && p.stock > 0); }
  assert(filtered.data.every((p: any, i: number, all: any[]) => !i || all[i - 1].price <= p.price));
  assert.equal((await read('/products/search?groupBy=variant&q=iPhone%2016%20128GB%20256GB')).pagination.total, 0);
  const suggestion = (await read('/products/suggestions?groupBy=variant&q=iphone&storage=256')).data;
  assert(suggestion.length > 0 && suggestion.length <= 5);
  assert(suggestion.every((p: any) => p.variants.length === 1 && p.variants[0].storage_gb === 256));
  const facets = (await read('/products/filters?groupBy=variant&category=phone')).data;
  const ram8 = facets.find((g: any) => g.key === 'ram').options.find((o: any) => o.value === '8');
  const ramCount = await pool.query(`SELECT COUNT(*) AS count FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id WHERE p.is_active AND v.is_active AND c.code='phone' AND v.ram_gb=8`);
  assert.equal(ram8.count, Number(ramCount.rows[0].count));
  await read('/products/search?groupBy=invalid', 400);
  await read('/products/filters?groupBy=invalid', 400);
  assert.equal((await read('/products/search?groupBy=variant&ids=')).pagination.total, 0);
  console.log('PASS same-SKU filters, sorting, suggestions, facet counts, validation and empty saved list.');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); }
