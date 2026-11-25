import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import app from '../src/app.js';
import { checkDatabaseConnection, pool } from '../src/config/database.js';

// Read-only checks against the actual database; never seed or reset here.
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
let passed = 0;
async function read(path: string, status = 200) {
  const response = await fetch(base + path);
  assert.equal(response.status, status, path);
  return response.json();
}
async function check(name: string, run: () => Promise<void>) {
  await run(); passed++; console.log(`PASS ${name}`);
}
try {
  await check('disconnected catalog returns 503 instead of silently using mock', async () => {
    for (const path of ['/products/search', '/products/1', '/categories', '/brands']) {
      assert.equal((await read(path, 503)).error.code, 'DATABASE_UNAVAILABLE');
    }
  });
  assert.equal(await checkDatabaseConnection(), true, 'Integration checks require PostgreSQL.');
  await check('health explicitly reports PostgreSQL', async () => {
    assert.equal((await read('/health')).dataSource, 'postgresql');
  });
  await check('server pagination matches active database catalog', async () => {
    const count = await pool.query('SELECT COUNT(*) AS total FROM products WHERE is_active');
    const first = await read('/products/search?limit=6&page=1');
    const second = await read('/products/search?limit=6&page=2');
    assert.equal(first.pagination.total, Number(count.rows[0].total));
    assert.equal(first.data.length, 6);
    assert.equal(second.data.length, 6);
    assert(!first.data.some((p: any) => second.data.some((other: any) => p.id === other.id)));
  });
  await check('Vietnamese accents and individual words match', async () => {
    const accented = await read('/products/search?q=' + encodeURIComponent('Điện thoại'));
    const plain = await read('/products/search?q=dien%20thoai');
    assert.equal(accented.pagination.total, plain.pagination.total);
    assert(plain.pagination.total > 0);
    const multi = await read('/products/search?q=Apple%20iPhone&category=phone');
    assert(multi.pagination.total > 0);
  });
  await check('combined brand/category/price/stock filters and numeric ordering', async () => {
    const result = await read('/products/search?category=laptop&brand=ASUS,Apple&maxPrice=30000000&inStock=true&sort=asc&limit=100');
    assert(result.data.length > 0);
    for (const [i, p] of result.data.entries()) {
      assert.equal(p.category_code, 'laptop'); assert(['ASUS', 'Apple'].includes(p.brand));
      assert.equal(typeof p.price, 'number'); assert(p.price <= 30000000); assert(p.stock > 0);
      if (i) assert(result.data[i - 1].price <= p.price);
    }
  });
  await check('missing tablet prices and ratings remain null', async () => {
    const result = await read('/products/search?category=tablet&limit=100');
    const missing = result.data.find((p: any) => p.price === null);
    assert(missing, 'Need a tablet without price in this catalog.');
    assert.equal(missing.rating, null); assert.equal(missing.review_count, null);
    const detail = await read(`/products/${missing.id}`);
    assert.equal(detail.data.price, null); assert(detail.data.variants.length > 0);
    assert(detail.data.images.length > 0);
    const priced = await read('/products/search?category=tablet&maxPrice=100000000&limit=100');
    assert(priced.data.every((p: any) => typeof p.price === 'number'));
  });
  await check('empty keyword, no results, invalid numeric inputs and missing detail', async () => {
    assert.equal((await read('/products/search?q=zzzz-no-such-device')).pagination.total, 0);
    assert.equal((await read('/products/search?q=%25')).pagination.total, 0);
    await read('/products/search?page=Infinity', 400);
    await read('/products/search?maxPrice=Infinity', 400);
    await read('/products/search?page=1.5', 400);
    await read('/products/no-such-product', 404);
  });
  await check('SKU search matches whole codes only, not short numbers (B006)', async () => {
    const sku = (await pool.query("SELECT sku FROM product_variants WHERE sku ~ '^PV-[0-9]{6,}$' LIMIT 1")).rows[0]?.sku as string;
    assert(sku, 'catalog needs at least one PV- SKU');
    const bySku = await read('/products/search?groupBy=variant&q=' + encodeURIComponent(sku));
    assert(bySku.data.some((p: any) => p.variants?.[0]?.sku === sku), sku);
    const byDigits = await read('/products/search?groupBy=variant&q=' + sku.slice(3));
    assert(byDigits.data.some((p: any) => p.variants?.[0]?.sku === sku), sku.slice(3));
    const iphone16 = await read('/products/search?groupBy=variant&limit=50&q=' + encodeURIComponent('iPhone 16'));
    assert(iphone16.data.every((p: any) => /iphone 16/i.test(`${p.model_name} ${p.variants?.[0]?.variant_name}`)),
      'iPhone 16 must not return other models through SKU digits');
  });
  console.log(`Integration: ${passed}/8 checks passed (503 guard and PostgreSQL integration).`);
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
