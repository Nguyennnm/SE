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
  assert(summaries.includes('Dung lượng RAM')); assert(summaries.includes('Dung lượng SSD'));
  const ram8 = [...document.querySelectorAll('.spec-filter')].find(el => el.querySelector('summary').textContent === 'Dung lượng RAM');
  const checkbox = [...ram8.querySelectorAll('label')].find(label => label.querySelector('span').textContent === '8 GB').querySelector('input');
  await act(async () => checkbox.click());
  await until(() => actualCalls.some(url => url.includes('/products/search?') && new URL(url).searchParams.get('ram') === '8'));
  assert(document.querySelector('.active-filters').textContent.includes('8 GB'));
  await act(async () => nav('Laptop').click()); await until(() => brand('ASUS'));
  assert(!document.querySelector('.active-filters')?.textContent.includes('8 GB'));
  console.log('PASS screen: category-specific brands/specs, incompatible selections cleared, technical query and filter chips.');
} finally {
  await act(async () => root.unmount());
  globalThis.fetch = originalFetch;
  await vite.close(); dom.window.close();
}
