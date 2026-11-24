import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import React, { act } from 'react';

// In-memory DOM tests; do not launch or control a browser.
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost:5173', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'KeyboardEvent', 'FocusEvent']) Object.defineProperty(globalThis, key, { value: key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key], configurable: true, writable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
const originalFetch = globalThis.fetch;
const root = createRoot(document.querySelector('#root'));
const calls = [];
const submitted = [];
let delayed;
const product = (name, id) => ({ id, name, category: 'Điện thoại', category_code: 'phone', brand: 'Apple', price: 20000000, stock: 2, rating: null, review_count: null });
const response = data => new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const wait = async ms => { await act(async () => { await sleep(ms); }); };
async function change(value) {
  await act(async () => {
    const input = document.querySelector('input[role=combobox]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function press(key) {
  await act(async () => document.querySelector('input[role=combobox]').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
}
async function until(predicate) {
  for (let i = 0; i < 80; i++) { if (predicate()) return; await wait(30); }
  assert(predicate(), 'Timed out waiting for component state.');
}
try {
  const { SearchBox } = await vite.ssrLoadModule('/src/components/SearchBox.tsx');
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx');
  const base = { q: '', category: 'phone', brands: [], inStock: false, sort: 'relevant', page: 1, limit: 6 };
  function Harness({ category = 'phone' }) {
    const [value, setValue] = React.useState('');
    return React.createElement(SearchBox, { value, onChange: setValue, onSearch: text => { submitted.push(text); setValue(text); }, criteria: { ...base, category } });
  }
  globalThis.fetch = async (url, options) => {
    const params = new URL(String(url)).searchParams;
    const query = params.get('q');
    calls.push({ query, category: params.get('category'), signal: options.signal });
    if (query === 'old' && params.get('category') === 'phone') return new Promise(resolve => { delayed = () => resolve(response([product('Stale result', 3)])); });
    if (query === 'error') throw new Error('Offline test');
    if (query === 'empty') return response([]);
    return response([product('Apple iPhone 16', 1), product('Apple iPhone 15', 2)]);
  };
  await act(async () => root.render(React.createElement(Harness)));
  await change('i'); await wait(300); assert.equal(calls.length, 0);
  await change('ip'); await change('iph'); await wait(330);
  assert.equal(calls.length, 1); assert.equal(calls[0].query, 'iph');
  assert.equal(document.querySelectorAll('[role=option]').length, 2);
  await press('ArrowDown');
  assert.equal(document.querySelector('[role=option][aria-selected=true]').textContent.includes('iPhone 16'), true);
  await press('ArrowDown'); await press('ArrowUp');
  await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(submitted.at(-1), 'Apple iPhone 16');
  assert.equal(document.querySelector('input').getAttribute('aria-expanded'), 'false');
  console.log('PASS autocomplete: minimum length, debounce, arrow navigation and Enter selection.');
  await change('old'); await wait(300);
  const pending = calls.at(-1); assert.equal(pending.query, 'old');
  await change('new'); assert(pending.signal.aborted); await wait(330);
  await act(async () => delayed());
  assert(!document.body.textContent.includes('Stale result'));
  await change('old'); await wait(300);
  const oldCategory = calls.at(-1);
  await act(async () => root.render(React.createElement(Harness, { category: 'laptop' })));
  assert(oldCategory.signal.aborted);
  await wait(330); await act(async () => delayed());
  assert.equal(calls.at(-1).category, 'laptop');
  assert(!document.body.textContent.includes('Stale result'));
  await press('Escape'); assert.equal(document.querySelector('input').getAttribute('aria-expanded'), 'false');
  await change('empty'); await wait(330); assert(document.body.textContent.includes('Không có gợi ý phù hợp'));
  await change('error'); await wait(330); assert(document.body.textContent.includes('Không tải được gợi ý'));
  console.log('PASS autocomplete: cancellation, stale responses, Escape, empty results and error state.');
  const actualCalls = [];
  globalThis.fetch = (url, options) => { actualCalls.push(String(url)); return originalFetch(url, options); };
  await act(async () => root.render(React.createElement(App)));
  const nav = text => [...document.querySelectorAll('nav button')].find(b => b.textContent.trim() === text);
  const brand = text => [...document.querySelectorAll('.brand-choices label')].find(label => label.textContent.trim() === text)?.querySelector('input');
  await until(() => nav('Laptop'));
  const slider = document.querySelector('input[aria-label="Giá tối đa"]');
  const rangeResponse = await originalFetch('http://localhost:5000/api/products/price-range');
  const range = (await rangeResponse.json()).data;
  assert.equal(slider.min, '0'); assert.equal(Number(slider.max), range.max); assert.equal(Number(slider.value), range.max);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '0');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await until(() => actualCalls.some(url => url.includes('/products/search?') && new URL(url).searchParams.get('maxPrice') === '0'));
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, String(range.max));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(Number(slider.value), range.max);
  await act(async () => nav('Laptop').click());
  await until(() => brand('ASUS'));
  await act(async () => brand('ASUS').click()); assert(brand('ASUS').checked);
  await act(async () => nav('Điện thoại').click());
  await until(() => brand('OPPO') && brand('Apple'));
  assert(!brand('ASUS')); assert(!brand('Dell')); assert(!brand('Lenovo'));
  assert([...document.querySelectorAll('.brand-choices input')].every(input => !input.checked));
  assert(![...document.querySelectorAll('.spec-filter summary')].some(x => x.textContent.includes('Nhu cầu')));
  assert(actualCalls.some(url => url.includes('/brands?category=phone')));
  const summaries = [...document.querySelectorAll('.spec-filter summary')].map(el => el.textContent);
  assert(summaries.includes('Dung lượng RAM')); assert(summaries.includes('Bộ nhớ trong')); assert(!summaries.includes('Dung lượng SSD'));
  const ram8 = [...document.querySelectorAll('.spec-filter')].find(el => el.querySelector('summary').textContent === 'Dung lượng RAM');
  assert.equal(document.querySelector('.spec-coverage'), null);
  const checkbox = [...ram8.querySelectorAll('label')].find(label => label.querySelector('span').textContent === '8 GB').querySelector('input');
  await act(async () => checkbox.click());
  await until(() => actualCalls.some(url => url.includes('/products/search?') && new URL(url).searchParams.get('ram') === '8'));
  assert(document.querySelector('.active-filters').textContent.includes('8 GB'));
  await act(async () => nav('Laptop').click()); await until(() => brand('ASUS'));
  assert([...document.querySelectorAll('.spec-filter summary')].some(el => el.textContent === 'Dung lượng SSD'));
  assert(!document.querySelector('.active-filters')?.textContent.includes('8 GB'));
  console.log('PASS screen: category-specific brands/specs, incompatible selections cleared, technical query and filter chips.');
  // Exercise the actual screen and API: each card opens its exact SKU, and
  // selecting another SKU updates price/specs/stock/image without another fetch.
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  await act(async () => nav('Điện thoại').click());
  await change('iPhone 16');
  await act(async () => document.querySelector('form[role=search]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await until(() => document.querySelectorAll('.product').length > 1 && document.querySelector('.product-sku'));
  const cards = [...document.querySelectorAll('.product')];
  const skus = cards.map(card => card.querySelector('.product-sku').textContent.replace('SKU: ', ''));
  assert.equal(new Set(skus).size, skus.length);
  const price = cards[0].querySelector('.product-price strong').textContent;
  const image = cards[0].querySelector('img')?.getAttribute('src');
  await act(async () => cards[0].querySelector('h3 button').click());
  await until(() => document.querySelector('.variant-option[aria-pressed=true]'));
  assert(document.querySelector('.selected-config').textContent.includes(skus[0]));
  assert.equal(document.querySelector('.detail-price').textContent, price);
  if (image) assert.equal(document.querySelector('.detail-art img')?.getAttribute('src'), image);
  const options = [...document.querySelectorAll('.variant-option')]; assert(options.length > 1);
  const other = options.find(button => button.getAttribute('aria-pressed') === 'false');
  const nextSku = other.querySelector('small').textContent.replace('SKU: ', '');
  const nextPrice = other.querySelector('span').textContent.split(' · ')[0];
  const detailCalls = actualCalls.filter(url => /\/products\/\d+$/.test(url)).length;
  await act(async () => other.click());
  assert.equal(other.getAttribute('aria-pressed'), 'true');
  assert(document.querySelector('.selected-config').textContent.includes(nextSku));
  assert.equal(document.querySelector('.detail-price').textContent, nextPrice);
  assert.equal(actualCalls.filter(url => /\/products\/\d+$/.test(url)).length, detailCalls);
  assert(window.location.hash.includes(encodeURIComponent(nextSku)), 'URL giữ SKU đang chọn');
  assert(document.querySelector('.pdp-tabs'), 'Trang chi tiết có tab mô tả / thông số');
  await act(async () => document.querySelector('.pdp-tabs [role=tab]').click());
  assert(document.querySelector('.pdp-specs table'), 'Bảng thông số hiển thị');
  await act(async () => document.querySelector('.detail-back').click());
  await until(() => !document.querySelector('.pdp') && document.querySelector('.product-results'));
  console.log('PASS variants: separate SKU cards, exact detail page selection, image/price consistency, switching configurations and back to results.');
} finally {
  await act(async () => root.unmount());
  globalThis.fetch = originalFetch;
  await vite.close(); dom.window.close();
}
