import { useEffect, useRef, useState } from 'react';
import { searchProducts, getCategories, getBrands, getTechnicalFilters, getPriceRange, getDataSource, specKeys, type SpecSelection, type SpecKey, type FacetGroup, type SearchParams, type Product, type Category } from './services/productApi';
import { ProductPage } from './components/ProductPage';
import { ProductCard } from './components/ProductCard';
import { SearchBox } from './components/SearchBox';
import { TechnicalFilters } from './components/TechnicalFilters';
import { PriceFilter } from './components/PriceFilter';
import { Icon } from './components/Icon';
import { ProductArt } from './components/ProductArt';


const money = (n: number | null) => n == null ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN').format(n) + '₫';
const pageSize = 6;

// Đường dẫn trang chi tiết: #/san-pham/<id>?sku=<sku>
type ProductRoute = { productId: string; sku?: string } | null;
const parseRoute = (): ProductRoute => {
  const match = (typeof window === 'undefined' ? '' : window.location.hash).match(/^#\/san-pham\/([^?]+)(?:\?sku=(.+))?$/);
  return match ? { productId: decodeURIComponent(match[1]), sku: match[2] ? decodeURIComponent(match[2]) : undefined } : null;
};
const routeHash = (id: string, sku?: string) => `#/san-pham/${encodeURIComponent(id)}${sku ? `?sku=${encodeURIComponent(sku)}` : ''}`;

export default function App() {
  const [draft, setDraft] = useState('laptop');
  const [query, setQuery] = useState('laptop');
  const [category, setCategory] = useState('Tất cả');
  const [brands, setBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceCeiling, setPriceCeiling] = useState<number | null>(null);
  const [priceRangeLoaded, setPriceRangeLoaded] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('relevant');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [route, setRoute] = useState<ProductRoute>(parseRoute);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openedFromList = useRef(false);

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [specs, setSpecs] = useState<SpecSelection>({});
  const [facetGroups, setFacetGroups] = useState<FacetGroup[]>([]);
  const [facetLoading, setFacetLoading] = useState(true);
  const [facetError, setFacetError] = useState('');
  const categories = ['Tất cả', ...categoryOptions.map(c => c.name)];
  const categoryCode = categoryOptions.find(c => c.name === category)?.code ?? category;
  const priceFilterActive = maxPrice !== null && (priceCeiling === null || maxPrice < priceCeiling);
  const selectedMaxPrice = maxPrice ?? priceCeiling;
  const criteria: SearchParams = { ...specs, q: query, category: categoryCode, brands, maxPrice: priceFilterActive ? maxPrice : undefined, inStock, sort, page, limit: pageSize, ids: savedOnly ? saved : undefined };
  const criteriaKey = JSON.stringify(criteria);
  const currentPage = page;
  const visible = items;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getCategories(controller.signal), getDataSource(controller.signal), getPriceRange(controller.signal)])
      .then(([cats, dataSource, priceRange]) => {
        if (controller.signal.aborted) return;
        setCategoryOptions(cats); setSource(dataSource); setPriceCeiling(priceRange.max); setPriceRangeLoaded(true);
        setMaxPrice(old => old !== null && priceRange.max !== null && old < priceRange.max ? old : null);
      })
      .catch(() => { if (!controller.signal.aborted) setSource('unavailable'); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();
    setFacetLoading(true); setFacetError(''); setBrandOptions([]); setFacetGroups([]);
    Promise.all([getBrands(controller.signal, categoryCode), getTechnicalFilters(categoryCode, controller.signal)])
      .then(([availableBrands, groups]) => { if (!controller.signal.aborted) { setBrandOptions(availableBrands); setFacetGroups(groups); } })
      .catch(() => { if (!controller.signal.aborted) setFacetError('Không tải được bộ lọc.'); })
      .finally(() => { if (!controller.signal.aborted) setFacetLoading(false); });
    return () => controller.abort();
  }, [categoryCode, retry]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItems([]);
    searchProducts(JSON.parse(criteriaKey), controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (page > Math.max(1, result.pagination.totalPages)) { setPage(1); return; }
      setItems(result.items); setTotal(result.pagination.total); setPages(Math.max(1, result.pagination.totalPages));
    }).catch(err => {
      if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.'); setTotal(0); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [criteriaKey, retry]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const showToast = (message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3500); };
  const openDetail = (id: string, sku?: string) => {
    openedFromList.current = route === null || openedFromList.current;
    window.location.hash = routeHash(id, sku);
    setRoute({ productId: id, sku });
  };
  const closeDetail = () => {
    if (openedFromList.current && window.history.length > 1) window.history.back();
    else window.location.hash = '';
    openedFromList.current = false;
    setRoute(null);
  };
  const changeDetailSku = (sku: string) => {
    if (!route) return;
    window.history.replaceState(null, '', routeHash(route.productId, sku));
    setRoute({ productId: route.productId, sku });
  };
  // Điểm nối với giỏ hàng (UC19): phát sự kiện để màn giỏ hàng lắng nghe và thêm đúng SKU.
  const addToCart = (product: Product, quantity: number, buyNow: boolean) => {
    const detail = { productId: product.id, sku: product.selectedSku, name: product.variantName ?? product.name, unitPrice: product.price, quantity };
    window.dispatchEvent(new CustomEvent(buyNow ? 'techstore:buy-now' : 'techstore:add-to-cart', { detail }));
    showToast(buyNow ? `Đã chọn ${quantity} × ${detail.name} để mua ngay.` : `Đã thêm ${quantity} × ${detail.name} vào giỏ hàng.`);
  };
  const reset = () => { setSpecs({}); setCategory('Tất cả'); setBrands([]); setMaxPrice(null); setInStock(false); setSavedOnly(false); setPage(1); };
  const changeCategory = (value: string) => { setCategory(value); setBrands([]); setSpecs({}); setBrandOptions([]); setFacetGroups([]); setPage(1); };
  const toggleSpec = (key: SpecKey, value: string) => { setSpecs(old => ({ ...old, [key]: old[key]?.includes(value) ? old[key]!.filter(v => v !== value) : [...(old[key] ?? []), value] })); setPage(1); };
  const search = (value: string) => { setQuery(value.trim()); setDraft(value); setPage(1); };
  const toggleSaved = (id: string) => setSaved(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  const filterCount = brands.length + Number(category !== 'Tất cả') + Number(priceFilterActive) + Number(inStock) + specKeys.reduce((sum, key) => sum + (specs[key]?.length ?? 0), 0);

  return <div className="store">
    <div className="announcement"><span>Thiết bị tốt. Lựa chọn thông minh.</span><span className="preview-label">{source === 'postgresql' ? 'CATALOG PHONG VŨ · TỒN KHO DEMO' : source === 'mock' ? 'CHẾ ĐỘ DỮ LIỆU MẪU' : 'CATALOG ĐIỆN TỬ'}</span></div>
    <header className="store-header"><div className="header-inner">
      <a className="logo" href="#" onClick={() => { reset(); search(''); }}><span className="logo-symbol">t<span>•</span></span>TechStore<span className="logo-period">.</span></a>
      <SearchBox value={draft} onChange={setDraft} onSearch={search} criteria={criteria}/>
      <button className={`saved-button ${savedOnly ? 'is-active' : ''}`} aria-pressed={savedOnly} onClick={() => { setSavedOnly(!savedOnly); setPage(1); }}><Icon name="heart"/><span>Đã lưu</span><b>{saved.length}</b></button>
    </div></header>
    <nav className="category-nav" aria-label="Danh mục"><div className="container nav-inner">{categories.map((c, i) => <button key={c} className={category === c ? 'nav-active' : ''} onClick={() => { reset(); setCategory(c); search(''); }}>{i === 0 && <Icon name="grid" size={16}/>} {c === 'Tất cả' ? 'Tất cả danh mục' : c}</button>)}<span className="nav-help"><Icon name="shield" size={15}/> An tâm chọn công nghệ</span></div></nav>
    <main className="container">
      {route ? <ProductPage productId={route.productId} sku={route.sku} saved={id => saved.includes(id)} onSave={toggleSaved} onSkuChange={changeDetailSku} onOpenProduct={openDetail} onBack={closeDetail} onCategory={name => { closeDetail(); reset(); changeCategory(name); search(''); }} onAddToCart={addToCart}/> : <>
      <div className="breadcrumb"><a href="#" onClick={() => { reset(); search(''); }}>Trang chủ</a><Icon name="chevron" size={12}/><span>Tìm kiếm sản phẩm</span></div>
      <section className="campaign"><div className="campaign-copy"><span className="campaign-label"><span/> TECHNOLOGY FOR EVERYDAY</span><h1>Công nghệ đúng gu.<br/><span>Hiệu năng đúng nhu cầu.</span></h1><p>Từ góc học tập đến bàn làm việc, tìm thiết bị dành riêng cho bạn.</p><button onClick={() => { reset(); search(''); }}>Khám phá bộ sưu tập <Icon name="arrow" size={17}/></button></div><div className="campaign-art"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><ProductArt color="#79a7f2" name="Laptop"/><div className="floating-tag"><Icon name="spark" size={16}/><span>Cho mọi ý tưởng lớn</span></div></div><span className="campaign-index">01 / EVERYDAY ESSENTIALS</span></section>
      <section className="search-results" aria-labelledby="results-title">
        <div className="results-heading"><div><div className="section-label">KHÁM PHÁ & LỰA CHỌN</div><h2 id="results-title">{savedOnly ? 'Sản phẩm đã lưu' : query ? <>Kết quả cho “<span>{query}</span>”</> : category === 'Tất cả' ? 'Khám phá sản phẩm' : category}<span className="result-count">{total}</span></h2><p>Tìm thiết bị phù hợp, theo cách của bạn.</p></div><div className="popular-searches"><span>Gợi ý cho bạn</span>{['laptop', 'MacBook', 'iPhone'].map(term => <button key={term} onClick={() => { reset(); search(term); }}>{term}<Icon name="arrow" size={12}/></button>)}</div></div>
        <div className="catalog-layout">
          <aside className={`filter-panel ${filtersOpen ? 'mobile-open' : ''}`} aria-label="Bộ lọc sản phẩm"><div className="filter-title"><h3><Icon name="filter" size={18}/>Bộ lọc</h3><button onClick={reset}>Xóa tất cả</button></div>
            <fieldset><legend>Danh mục</legend>{categories.map(c => <label className="filter-choice" key={c}><input type="radio" name="category" checked={category === c} onChange={() => changeCategory(c)}/><span>{c}</span></label>)}</fieldset>
            <PriceFilter ceiling={priceCeiling} selected={selectedMaxPrice} loaded={priceRangeLoaded} onChange={value => { setMaxPrice(priceCeiling !== null && value >= priceCeiling ? null : value); setPage(1); }}/>
            <fieldset><legend>Thương hiệu</legend><div className="brand-choices">{brandOptions.map(brand => <label className="filter-choice" key={brand}><input type="checkbox" checked={brands.includes(brand)} onChange={() => { setBrands(old => old.includes(brand) ? old.filter(x => x !== brand) : [...old, brand]); setPage(1); }}/><span>{brand}</span></label>)}</div></fieldset>
            {facetLoading && <p className="facet-status" role="status">Đang tải thông số...</p>}
            {facetError && <p className="facet-status" role="alert">{facetError} <button onClick={() => setRetry(n => n + 1)}>Thử lại</button></p>}
            <TechnicalFilters groups={facetGroups} selected={specs} onChange={toggleSpec}/>
            <label className="stock-toggle"><input type="checkbox" checked={inStock} onChange={e => { setInStock(e.target.checked); setPage(1); }}/><span>Chỉ xem sản phẩm còn hàng</span></label>
            <div className="filter-footer"><Icon name="shield" size={22}/><p>Chọn công nghệ tốt.<br/><b>An tâm từng lựa chọn.</b></p></div>
          </aside>
          <div className="results-body"><div className="results-toolbar"><span className="desktop-result-label">Tìm thấy <b>{total} phiên bản</b> phù hợp</span><button className="mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><Icon name="filter" size={17}/>Bộ lọc {filterCount > 0 && `(${filterCount})`}</button><div className="toolbar-right"><label>Sắp xếp:<select aria-label="Sắp xếp sản phẩm" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="relevant">Phù hợp nhất</option><option value="asc">Giá thấp đến cao</option><option value="desc">Giá cao đến thấp</option></select></label><div className="view-toggle"><button aria-label="Hiển thị dạng lưới" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" size={17}/></button><button aria-label="Hiển thị dạng danh sách" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={18}/></button></div></div></div>
            {(filterCount > 0 || savedOnly) && <div className="active-filters">{specKeys.flatMap(key => (specs[key] ?? []).map(value => <button key={`${key}-${value}`} onClick={() => toggleSpec(key, value)}>{facetGroups.find(g => g.key === key)?.label}: {facetGroups.find(g => g.key === key)?.options.find(o => o.value === value)?.label ?? value}<Icon name="close" size={12}/></button>))}{category !== 'Tất cả' && <button onClick={() => setCategory('Tất cả')}>{category}<Icon name="close" size={12}/></button>}{brands.map(b => <button key={b} onClick={() => setBrands(brands.filter(x => x !== b))}>{b}<Icon name="close" size={12}/></button>)}{priceFilterActive && <button onClick={() => setMaxPrice(null)}>Đến {money(maxPrice)}<Icon name="close" size={12}/></button>}{inStock && <button onClick={() => setInStock(false)}>Còn hàng<Icon name="close" size={12}/></button>}{savedOnly && <button onClick={() => setSavedOnly(false)}>Đã lưu<Icon name="close" size={12}/></button>}</div>}
            <div aria-live="polite" className="sr-only">Có {total} phiên bản phù hợp.</div>
            {loading ? <div className="no-results" role="status"><span className="loading-spinner"/><p>Đang tìm sản phẩm...</p></div> : error ? <div className="no-results" role="alert"><Icon name="return" size={30}/><h3>Chưa tải được sản phẩm</h3><p>{error}</p><button className="primary-btn" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div> : visible.length ? <div className={`product-results ${view === 'list' ? 'list-view' : ''}`}>{visible.map(p => <ProductCard key={`${p.id}:${p.selectedSku ?? p.id}`} product={p} saved={saved.includes(p.id)} onSave={() => toggleSaved(p.id)} onDetail={() => openDetail(p.id, p.variants[0]?.sku ?? p.selectedSku)}/>)}</div> : <div className="no-results"><div><Icon name="search" size={34}/></div><h3>Chưa tìm thấy sản phẩm phù hợp</h3><p>Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc để có thêm lựa chọn.</p><button className="primary-btn" onClick={() => { reset(); search(''); }}>Xem tất cả sản phẩm<Icon name="arrow" size={16}/></button></div>}
            {!loading && !error && total > 0 && <div className="pagination"><span>Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} trong {total} phiên bản</span><div><button disabled={currentPage === 1} aria-label="Trang trước" onClick={() => setPage(currentPage - 1)}><Icon name="chevron" size={15} style={{ transform: 'rotate(180deg)' }}/></button>{Array.from(new Set([1, ...Array.from({ length: 3 }, (_, i) => currentPage - 1 + i).filter(n => n > 1 && n < pages), pages])).sort((a, b) => a - b).map((n, i, all) => <span className="page-entry" key={n}>{i > 0 && n - all[i - 1] > 1 && <span className="page-gap">…</span>}<button aria-label={`Trang ${n}`} aria-current={currentPage === n ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button></span>)}<button disabled={currentPage === pages} aria-label="Trang sau" onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={15}/></button></div></div>}
          </div>
        </div>
      </section>
      </>}
      <section className="service-strip">{[['shield', 'Chính hãng 100%', 'An tâm về nguồn gốc'], ['truck', 'Giao hàng nhanh', 'Đồng hành mọi nơi'], ['return', 'Đổi trả thuận tiện', 'Hỗ trợ theo chính sách'], ['headphones', 'Tư vấn tận tâm', 'Lựa chọn cùng chuyên gia']].map(([icon, title, text]) => <div key={icon}><Icon name={icon} size={25}/><span><b>{title}</b><small>{text}</small></span></div>)}</section>
    </main>
    <footer className="site-footer container"><div><a href="#" className="footer-logo">TechStore<span>.</span></a><p>Chọn công nghệ tốt, sống tiện nghi hơn.</p></div><span>Giá theo snapshot catalog · Tồn kho mô phỏng</span><small>© 2026 TechStore</small></footer>
    {toast && <div className="toast" role="status"><Icon name="cart" size={18}/>{toast}</div>}
  </div>;
}
