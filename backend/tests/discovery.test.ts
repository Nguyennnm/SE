import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import app from '../src/app.js';
import { checkDatabaseConnection, pool } from '../src/config/database.js';
import { facetGroups, matchesSpecs, variantSpecs } from '../src/modules/catalog/product.facets.js';

assert(await checkDatabaseConnection(), 'PostgreSQL is required for discovery tests.');
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
let passed = 0;
const check = async (name: string, run: () => Promise<void>) => { await run(); console.log(`PASS ${++passed}: ${name}`); };
async function read(path: string, status = 200) { const response = await fetch(base + path); assert.equal(response.status, status, path); return response.json(); }
try {
  await check('price slider bounds use zero and the actual maximum active SKU price', async () => {
    const expected = await pool.query(`SELECT MAX(v.selling_price_vnd) AS max FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.is_active AND v.is_active AND v.selling_price_vnd IS NOT NULL`);
    const range = (await read('/products/price-range')).data;
    assert.equal(range.min, 0); assert.equal(range.max, expected.rows[0].max);
    assert(range.max > 0);
    const same = (await read('/products/price-range?category=phone&maxPrice=1&page=2')).data;
    assert.deepEqual(same, range);
    const zero = await read('/products/search?maxPrice=0');
    assert.equal(zero.pagination.total, 0);
  });
  await check('brands depend on active category catalog, including Vietnamese names', async () => {
    const phones = (await read('/brands?category=phone')).data;
    assert.deepEqual(phones, ['Apple', 'OPPO', 'Samsung', 'Xiaomi']);
    assert.deepEqual((await read('/brands?category=' + encodeURIComponent('Điện thoại'))).data, phones);
    assert.equal((await read('/brands?category=no-such-category')).data.length, 0);
    assert((await read('/brands?category=laptop')).data.includes('ASUS'));
  });
  await check('facet options come from database and count models rather than SKUs', async () => {
    const groups = (await read('/products/filters?category=phone')).data;
    assert.equal(groups.find((g: any) => g.key === 'storage').label, 'Bộ nhớ trong');
    assert.equal((await read('/products/filters?category=tablet')).data.find((g: any) => g.key === 'storage').label, 'Bộ nhớ trong');
    assert.equal((await read('/products/filters?category=laptop')).data.find((g: any) => g.key === 'storage').label, 'Dung lượng SSD');
    assert.equal((await read('/products/filters')).data.find((g: any) => g.key === 'storage').label, 'Dung lượng lưu trữ');
    assert(!groups.some((g: any) => g.key === 'usage'));
    const count = await pool.query(`SELECT COUNT(DISTINCT p.id) AS total FROM products p JOIN product_variants v ON v.product_id = p.id JOIN categories c ON c.id = p.category_id WHERE p.is_active AND v.is_active AND c.code = 'phone' AND v.ram_gb = 8`);
    assert.equal(groups.find((g: any) => g.key === 'ram').options.find((v: any) => v.value === '8').count, Number(count.rows[0].total));
    assert((await read('/products/filters?category=laptop')).data.some((g: any) => g.key === 'usage'));
    const coverage = groups.find((g: any) => g.key === 'ram').coverage;
    const raw = await pool.query(`SELECT p.id, BOOL_OR(v.ram_gb IS NOT NULL) AS known FROM products p JOIN categories c ON c.id=p.category_id JOIN product_variants v ON v.product_id=p.id WHERE p.is_active AND v.is_active AND c.code='phone' GROUP BY p.id`);
    assert.equal(coverage.totalProducts, raw.rows.length);
    assert.equal(coverage.missingProducts, raw.rows.filter(row => !row.known).length);
    assert.equal(coverage.knownProducts + coverage.missingProducts, coverage.totalProducts);
  });
  await check('each technical group filters actual variants', async () => {
    const groups = (await read('/products/filters?category=laptop')).data;
    for (const group of groups) {
      const value = group.options[0].value;
      const result = await read(`/products/search?category=laptop&${group.key}=${encodeURIComponent(value)}&limit=100`);
      assert(result.data.length > 0, group.key);
      for (const p of result.data) for (const v of p.variants) {
        assert(matchesSpecs({ ram_gb: v.ram_gb, storage_gb: v.storage_gb, specifications: { ...p.specifications, ...v.specifications } }, { [group.key]: [value] }), group.key);
      }
    }
  });
  await check('RAM and storage and price match the same SKU; pagination/count agree with SQL', async () => {
    const path = '/products/search?category=laptop&ram=16&storage=512&maxPrice=30000000&inStock=true&sort=asc&limit=100';
    const result = await read(path);
    assert(result.data.length > 0);
    const count = await pool.query(`SELECT COUNT(DISTINCT p.id) AS total FROM products p JOIN categories c ON c.id=p.category_id JOIN product_variants v ON v.product_id=p.id JOIN inventory_items i ON i.variant_id=v.id WHERE p.is_active AND v.is_active AND c.code='laptop' AND v.ram_gb=16 AND v.storage_gb=512 AND v.selling_price_vnd <= 30000000 AND i.quantity_on_hand-i.quantity_reserved>0`);
    assert.equal(result.pagination.total, Number(count.rows[0].total));
    for (const p of result.data) {
      assert(p.variants.length > 0);
      for (const v of p.variants) { assert.equal(v.ram_gb, 16); assert.equal(v.storage_gb, 512); assert(v.selling_price_vnd <= 30000000); assert(v.stock > 0); }
      assert.equal(p.price, Math.min(...p.variants.map((v: any) => v.selling_price_vnd)));
    }
    const first = await read(path.replace('limit=100', 'limit=3&page=1'));
    assert.equal(first.pagination.total, result.pagination.total);
    assert.deepEqual(first.data.map((p: any) => p.id), result.data.slice(0, 3).map((p: any) => p.id));
    assert.equal((await read('/products/search?category=laptop&ram=99999')).pagination.total, 0);
  });
  await check('OR within groups, numeric canonicalization, null/missing values excluded', async () => {
    const result = await read('/products/search?category=phone&ram=8,12&storage=256&limit=100');
    assert(result.data.length > 0);
    for (const p of result.data) for (const v of p.variants) { assert([8, 12].includes(v.ram_gb)); assert.equal(v.storage_gb, 256); }
    assert.equal((await read('/products/search?category=phone&ram=8.0')).pagination.total, (await read('/products/search?category=phone&ram=8')).pagination.total);
    await read('/products/search?ram=Infinity', 400);
    await read('/products/search?storage=-1', 400);
    await read('/products/search?cpu=' + 'a'.repeat(81), 400);
  });
  await check('suggestions respect category, brand, specs, stock and maximum size', async () => {
    const result = (await read('/products/suggestions?q=ip&category=phone&brand=Apple&storage=256&inStock=true')).data;
    assert(result.length > 0 && result.length <= 5);
    for (const p of result) { assert.equal(p.brand, 'Apple'); assert.equal(p.category_code, 'phone'); assert(p.stock > 0); assert(p.variants.every((v: any) => v.storage_gb === 256)); }
    assert.equal((await read('/products/suggestions?q=i')).data.length, 0);
    assert.equal((await read('/products/suggestions?q=zzzz-no-such-device')).data.length, 0);
    await read('/products/suggestions?q=' + 'x'.repeat(201), 400);
  });
  await check('saved list applies the same server filters', async () => {
    const result = await read('/products/search?category=phone&storage=256');
    const id = result.data[0].id;
    assert.equal((await read(`/products/search?ids=${id}&storage=256`)).pagination.total, 1);
    assert.equal((await read(`/products/search?ids=${id}&storage=99999`)).pagination.total, 0);
    assert.equal((await read('/products/search?ids=')).pagination.total, 0);
  });
  await check('known spec normalization handles brands, units and absent values', async () => {
    assert.deepEqual(variantSpecs({ ram_gb: 16, storage_gb: 1024, specifications: { cpu_chipset: 'Intel® Core™ Ultra 7 155H', screen_size: '14,5 inch', refresh_rate: '120Hz', screen_tech: 'AMOLED', os: 'Windows 11 Home' } }), { ram: '16', storage: '1024', cpu: 'Intel Core Ultra 7', screenSize: '14.5', refreshRate: '120', screenTech: 'AMOLED', os: 'Windows' });
    assert(!matchesSpecs({ ram_gb: null, storage_gb: null, specifications: {} }, { ram: ['8'] }));
    assert(matchesSpecs({ ram_gb: null, storage_gb: null, specifications: {} }, {}));
    const explicit = variantSpecs({ ram_gb: null, storage_gb: null, specifications: { ram: '8 GB', ssd: '1 TB SSD', display: '14 inch IPS 120 Hz', cpu_chipset: 'Intel Core Ultra X7-358H' } });
    assert.equal(explicit.ram, '8'); assert.equal(explicit.storage, '1024'); assert.equal(explicit.screenSize, '14'); assert.equal(explicit.screenTech, 'IPS'); assert.equal(explicit.refreshRate, '120'); assert.equal(explicit.cpu, 'Intel Core Ultra X7');
    const unknown = variantSpecs({ ram_gb: null, storage_gb: null, specifications: { model_name: 'Phone 16 256GB', display: 'OLED ProMotion', ram: 'unknown', cpu_chipset: 'Unisoc T610' } });
    assert.equal(unknown.ram, undefined); assert.equal(unknown.storage, undefined); assert.equal(unknown.refreshRate, undefined); assert.equal(unknown.cpu, 'Unisoc');
    assert.equal(variantSpecs({ ram_gb: null, storage_gb: null, specifications: { display: 'IPS 48–120 Hz' } }).refreshRate, undefined);
    const mixed = facetGroups([
      { id: 1, product_id: 1, category_code: 'phone', brand: 'Sample', ram_gb: 8, storage_gb: 128, specifications: {} },
      { id: 2, product_id: 1, category_code: 'phone', brand: 'Sample', ram_gb: null, storage_gb: 256, specifications: {} },
      { id: 3, product_id: 2, category_code: 'phone', brand: 'Sample', ram_gb: null, storage_gb: 128, specifications: {} },
    ], 'phone').find(g => g.key === 'ram')!;
    assert.deepEqual(mixed.coverage, { totalProducts: 2, knownProducts: 1, missingProducts: 1, partialProducts: 1, totalVariants: 3, missingVariants: 2 });
  });
  console.log(`Discovery integration: ${passed}/9 checks passed.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); }
