import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import app from '../src/app.js';
import { checkDatabaseConnection, pool } from '../src/config/database.js';
import type { Cart } from '../src/modules/cart/cart.service.js';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string };
}

const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
const token = randomUUID();
let passed = 0;

async function request<T = Cart>(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'X-Cart-Token': token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() as ApiEnvelope<T> };
}

async function check(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

try {
  assert.equal(await checkDatabaseConnection(), true, 'Cart integration requires PostgreSQL.');
  const candidate = await pool.query<{ sku: string; selling_price_vnd: number }>(
    `SELECT v.sku, v.selling_price_vnd
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN inventory_items i ON i.variant_id = v.id
     WHERE p.is_active AND v.is_active AND v.selling_price_vnd >= 5000000
       AND COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0) >= 1
     ORDER BY v.selling_price_vnd DESC LIMIT 1`
  );
  assert(candidate.rows[0], 'Cart integration requires an active in-stock SKU priced at least 5,000,000₫.');
  const { sku, selling_price_vnd: price } = candidate.rows[0];

  await check('new guest token reads an empty cart', async () => {
    const result = await request('/cart');
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.data.items, []);
    assert.equal(result.body.data.total, 0);
  });

  await check('add item and persist eligible coupon discount', async () => {
    const added = await request('/cart/items', 'POST', { sku, quantity: 1 });
    assert.equal(added.response.status, 201);
    assert.equal(added.body.data.subtotal, Number(price));
    const applied = await request('/cart/coupon', 'POST', { code: 'tech500k' });
    assert.equal(applied.response.status, 200);
    assert.equal(applied.body.data.couponCode, 'TECH500K');
    assert.equal(applied.body.data.discount, 500000);
    assert.equal(applied.body.data.total, Number(price) - 500000);
  });

  await check('reject invalid coupon and remove applied coupon', async () => {
    const invalid = await request('/cart/coupon', 'POST', { code: 'NOT-A-COUPON' });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error?.code, 'INVALID_COUPON');
    const removed = await request('/cart/coupon', 'DELETE');
    assert.equal(removed.response.status, 200);
    assert.equal(removed.body.data.couponCode, null);
    assert.equal(removed.body.data.discount, 0);
  });

  await check('remove cart item and clear token-scoped state', async () => {
    const removed = await request(`/cart/items/${encodeURIComponent(sku)}`, 'DELETE');
    assert.equal(removed.response.status, 200);
    assert.deepEqual(removed.body.data.items, []);
    assert.equal(removed.body.data.total, 0);
  });
  console.log(`Cart integration: ${passed}/4 checks passed.`);
} finally {
  await fetch(base + '/cart/items', {
    method: 'DELETE',
    headers: { 'X-Cart-Token': token },
  });
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
