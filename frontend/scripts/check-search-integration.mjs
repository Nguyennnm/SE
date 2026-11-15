import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Execute the actual frontend adapter through Vite against the running API,
// then render the resulting cards with React. This does not automate a browser.
const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
try {
  const api = await vite.ssrLoadModule('/src/services/productApi.ts');
  const { ProductCard } = await vite.ssrLoadModule('/src/components/ProductCard.tsx');
  assert.equal(await api.getDataSource(), 'postgresql');
  assert.equal((await api.getCategories()).length, 3);
  assert((await api.getBrands()).includes('Apple'));
  const base = { q: '', category: 'Tất cả', brands: [], inStock: false, sort: 'relevant', page: 1, limit: 6 };
  const result = await api.searchProducts(base);
  assert(result.pagination.total > 6); assert.equal(result.items.length, 6);
  const second = await api.searchProducts({ ...base, page: 2 });
  assert(!result.items.some(p => second.items.some(other => other.id === p.id)));
  const tablet = await api.searchProducts({ ...base, category: 'tablet', limit: 100 });
  const missing = tablet.items.find(p => p.price === null);
  assert(missing); assert.equal(missing.rating, null);
  for (const product of [...result.items, missing]) {
    const html = renderToStaticMarkup(React.createElement(ProductCard, { product, saved: false, onSave() {}, onDetail() {} }));
    assert(!html.includes('NaN')); assert(html.includes('Chưa có đánh giá'));
    if (product.price === null) assert(html.includes('Chưa có giá'));
  }
  const detail = await api.getProduct(missing.id);
  assert(detail.variants.length > 0); assert(detail.images.length > 0);
  assert.equal(detail.price, null);
  const filtered = await api.searchProducts({ ...base, category: 'phone', brands: ['Apple'], maxPrice: 30000000, inStock: true, sort: 'asc' });
  assert(filtered.items.length > 0); assert(filtered.items.every(p => p.brand === 'Apple' && p.price <= 30000000));
  assert.deepEqual(await api.getBrands(undefined, 'phone'), ['Apple', 'OPPO', 'Samsung', 'Xiaomi']);
  const facets = await api.getTechnicalFilters('laptop');
  assert(facets.some(g => g.key === 'ram'));
  const technical = await api.searchProducts({ ...base, category: 'laptop', ram: ['16'], storage: ['512'], os: ['Windows'] });
  assert(technical.items.length > 0);
  assert(technical.items.every(p => p.ram === 16 && p.storage === '512GB'));
  const chosen = technical.items[0];
  const selectedDetail = await api.getProduct(chosen.id, undefined, chosen.variants[0].sku);
  assert.equal(selectedDetail.price, chosen.price);
  assert.equal(selectedDetail.ram, chosen.ram);
  assert.equal(selectedDetail.selectedSku, chosen.variants[0].sku);
  const suggested = await api.getSuggestions({ ...base, q: 'ip', category: 'phone', storage: ['256'] });
  assert(suggested.length > 0 && suggested.length <= 5);
  assert(suggested.every(p => p.kind === 'phone' && p.storage === '256GB'));
  assert.equal((await api.searchProducts({ ...base, q: 'zzzzzz-nothing' })).pagination.total, 0);
  await assert.rejects(() => api.getProduct('no-such-id'), /Không tìm thấy/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => api.searchProducts(base, controller.signal));
  console.log('PASS frontend → API → PostgreSQL: metadata, search, server pagination, combined filters, missing data, card rendering, detail, empty results, errors and cancellation.');
} finally { await vite.close(); }
