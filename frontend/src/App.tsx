import { useEffect, useMemo, useRef, useState } from 'react';
import { mockProducts, type MockProduct } from './data/mockProducts';
import { Icon } from './components/Icon';
import { ProductArt } from './components/ProductArt';

const categories = ['Tất cả', 'Laptop', 'Điện thoại', 'Máy tính bảng', 'Phụ kiện'];
const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + '₫';
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const pageSize = 6;

export default function App() {
  const [draft, setDraft] = useState('laptop');
  const [query, setQuery] = useState('laptop');
  const [category, setCategory] = useState('Tất cả');
  const [brands, setBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(40000000);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('relevant');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [detail, setDetail] = useState<MockProduct | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (detail) dialog.current?.showModal(); }, [detail]);

  const results = useMemo(() => {
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    const list = mockProducts.filter(p => words.every(w => normalize(`${p.name} ${p.category} ${p.brand} ${p.processor}`).includes(w)) && (category === 'Tất cả' || p.category === category) && (!brands.length || brands.includes(p.brand)) && p.price <= maxPrice && (!inStock || p.stock > 0) && (!savedOnly || saved.includes(p.id)));
    if (sort === 'asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [query, category, brands, maxPrice, inStock, sort, savedOnly, saved]);
  const pages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const reset = () => { setCategory('Tất cả'); setBrands([]); setMaxPrice(40000000); setInStock(false); setSavedOnly(false); setPage(1); };
  const search = (value: string) => { setQuery(value.trim()); setDraft(value); setPage(1); };
  const toggleSaved = (id: string) => setSaved(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  const filterCount = brands.length + Number(category !== 'Tất cả') + Number(maxPrice < 40000000) + Number(inStock);

  return <div className="store">
    <div className="announcement"><span>Thiết bị tốt. Lựa chọn thông minh.</span><span className="preview-label">BẢN DEMO · DỮ LIỆU MẪU</span></div>
    <header className="store-header"><div className="header-inner">
      <a className="logo" href="#" onClick={() => { reset(); search(''); }}><span className="logo-symbol">t<span>•</span></span>TechStore<span className="logo-period">.</span></a>
      <form className="header-search" role="search" onSubmit={e => { e.preventDefault(); search(draft); }}><Icon name="search"/><input aria-label="Tìm sản phẩm" placeholder="Tìm laptop, điện thoại, phụ kiện..." value={draft} onChange={e => setDraft(e.target.value)}/>{draft && <button type="button" className="clear-input" aria-label="Xóa từ khóa" onClick={() => search('')}><Icon name="close" size={15}/></button>}<button className="search-button" aria-label="Tìm kiếm"><Icon name="search" size={19}/></button></form>
      <button className={`saved-button ${savedOnly ? 'is-active' : ''}`} aria-pressed={savedOnly} onClick={() => { setSavedOnly(!savedOnly); setPage(1); }}><Icon name="heart"/><span>Đã lưu</span><b>{saved.length}</b></button>
    </div></header>
    <nav className="category-nav" aria-label="Danh mục"><div className="container nav-inner">{categories.map((c, i) => <button key={c} className={category === c ? 'nav-active' : ''} onClick={() => { reset(); setCategory(c); search(''); }}>{i === 0 && <Icon name="grid" size={16}/>} {c === 'Tất cả' ? 'Tất cả danh mục' : c}</button>)}<span className="nav-help"><Icon name="shield" size={15}/> An tâm chọn công nghệ</span></div></nav>
    <main className="container">
      <div className="breadcrumb"><a href="#" onClick={() => { reset(); search(''); }}>Trang chủ</a><Icon name="chevron" size={12}/><span>Tìm kiếm sản phẩm</span></div>
      <section className="campaign"><div className="campaign-copy"><span className="campaign-label"><span/> TECHNOLOGY FOR EVERYDAY</span><h1>Công nghệ đúng gu.<br/><span>Hiệu năng đúng nhu cầu.</span></h1><p>Từ góc học tập đến bàn làm việc, tìm thiết bị dành riêng cho bạn.</p><button onClick={() => { reset(); search(''); }}>Khám phá bộ sưu tập <Icon name="arrow" size={17}/></button></div><div className="campaign-art"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><ProductArt color="#79a7f2" name="Laptop"/><div className="floating-tag"><Icon name="spark" size={16}/><span>Cho mọi ý tưởng lớn</span></div></div><span className="campaign-index">01 / EVERYDAY ESSENTIALS</span></section>
      <section className="search-results" aria-labelledby="results-title">
        <div className="results-heading"><div><div className="section-label">KHÁM PHÁ & LỰA CHỌN</div><h2 id="results-title">{savedOnly ? 'Sản phẩm đã lưu' : query ? <>Kết quả cho “<span>{query}</span>”</> : category === 'Tất cả' ? 'Khám phá sản phẩm' : category}<span className="result-count">{results.length}</span></h2><p>Tìm thiết bị phù hợp, theo cách của bạn.</p></div><div className="popular-searches"><span>Gợi ý cho bạn</span>{['laptop', 'MacBook', 'iPhone'].map(term => <button key={term} onClick={() => { reset(); search(term); }}>{term}<Icon name="arrow" size={12}/></button>)}</div></div>
        <div className="catalog-layout">
          <aside className={`filter-panel ${filtersOpen ? 'mobile-open' : ''}`} aria-label="Bộ lọc sản phẩm"><div className="filter-title"><h3><Icon name="filter" size={18}/>Bộ lọc</h3><button onClick={reset}>Xóa tất cả</button></div>
            <fieldset><legend>Danh mục</legend>{categories.map(c => <label className="filter-choice" key={c}><input type="radio" name="category" checked={category === c} onChange={() => { setCategory(c); setPage(1); }}/><span>{c}</span><small>{c === 'Tất cả' ? mockProducts.length : mockProducts.filter(p => p.category === c).length}</small></label>)}</fieldset>
            <fieldset><legend>Khoảng giá</legend><div className="price-values"><span>0₫</span><span>{money(maxPrice)}</span></div><input className="price-slider" aria-label="Giá tối đa" type="range" min="1000000" max="40000000" step="500000" value={maxPrice} onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1); }}/><div className="price-presets">{[15000000, 20000000, 30000000].map(price => <button className={maxPrice === price ? 'chosen' : ''} key={price} onClick={() => { setMaxPrice(price); setPage(1); }}>Dưới {price / 1000000}tr</button>)}</div></fieldset>
            <fieldset><legend>Thương hiệu</legend><div className="brand-choices">{['ASUS', 'Apple', 'Lenovo', 'Acer', 'HP', 'Dell', 'Samsung', 'Sony'].map(brand => <label className="filter-choice" key={brand}><input type="checkbox" checked={brands.includes(brand)} onChange={() => { setBrands(old => old.includes(brand) ? old.filter(x => x !== brand) : [...old, brand]); setPage(1); }}/><span>{brand}</span></label>)}</div></fieldset>
            <label className="stock-toggle"><input type="checkbox" checked={inStock} onChange={e => { setInStock(e.target.checked); setPage(1); }}/><span>Chỉ xem sản phẩm còn hàng</span></label>
            <div className="filter-footer"><Icon name="shield" size={22}/><p>Chọn công nghệ tốt.<br/><b>An tâm từng lựa chọn.</b></p></div>
          </aside>
          <div className="results-body"><div className="results-toolbar"><span className="desktop-result-label">Tìm thấy <b>{results.length} sản phẩm</b> phù hợp</span><button className="mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><Icon name="filter" size={17}/>Bộ lọc {filterCount > 0 && `(${filterCount})`}</button><div className="toolbar-right"><label>Sắp xếp:<select aria-label="Sắp xếp sản phẩm" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="relevant">Phù hợp nhất</option><option value="asc">Giá thấp đến cao</option><option value="desc">Giá cao đến thấp</option><option value="rating">Đánh giá cao nhất</option></select></label><div className="view-toggle"><button aria-label="Hiển thị dạng lưới" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" size={17}/></button><button aria-label="Hiển thị dạng danh sách" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={18}/></button></div></div></div>
            {(filterCount > 0 || savedOnly) && <div className="active-filters">{category !== 'Tất cả' && <button onClick={() => setCategory('Tất cả')}>{category}<Icon name="close" size={12}/></button>}{brands.map(b => <button key={b} onClick={() => setBrands(brands.filter(x => x !== b))}>{b}<Icon name="close" size={12}/></button>)}{maxPrice < 40000000 && <button onClick={() => setMaxPrice(40000000)}>Đến {money(maxPrice)}<Icon name="close" size={12}/></button>}{inStock && <button onClick={() => setInStock(false)}>Còn hàng<Icon name="close" size={12}/></button>}{savedOnly && <button onClick={() => setSavedOnly(false)}>Đã lưu<Icon name="close" size={12}/></button>}</div>}
            <div aria-live="polite" className="sr-only">Có {results.length} sản phẩm phù hợp.</div>
            {visible.length ? <div className={`product-results ${view === 'list' ? 'list-view' : ''}`}>{visible.map(p => <article className="product" key={p.id}><div className="product-visual"><span className={`product-badge ${p.badge === 'Được yêu thích' ? 'badge-purple' : ''}`}>{p.badge ?? `Giảm ${Math.round((1 - p.price / p.originalPrice) * 100)}%`}</span><button className={`save-product ${saved.includes(p.id) ? 'saved' : ''}`} aria-label={`${saved.includes(p.id) ? 'Bỏ lưu' : 'Lưu'} ${p.name}`} aria-pressed={saved.includes(p.id)} onClick={() => toggleSaved(p.id)}><Icon name="heart" size={18}/></button><button className="product-art-button" onClick={() => setDetail(p)} aria-label={`Xem thông tin ${p.name}`}><ProductArt color={p.color} kind={p.kind} name={p.name}/></button><div className="color-dots"><i style={{ background: p.color }}/><i style={{ background: '#abb4c0' }}/><i style={{ background: '#363d48' }}/></div></div><div className="product-content"><div className="product-meta"><span>{p.brand}</span><span className={p.stock ? 'available' : 'unavailable'}><i/>{p.stock ? 'Còn hàng' : 'Tạm hết hàng'}</span></div><h3><button onClick={() => setDetail(p)}>{p.name}</button></h3><p className="product-specs">{p.processor} · {p.ram ? `${p.ram}GB · ` : ''}{p.storage}</p><div className="rating"><span>★</span><b>{p.rating.toFixed(1)}</b><span className="review-count">({p.reviews} đánh giá)</span></div><div className="product-price"><strong>{money(p.price)}</strong><del>{money(p.originalPrice)}</del></div><div className="product-bottom"><span>Tiết kiệm {money(p.originalPrice - p.price)}</span><button aria-label={`Xem chi tiết ${p.name}`} onClick={() => setDetail(p)}><Icon name="arrow" size={17}/></button></div></div></article>)}</div> : <div className="no-results"><div><Icon name="search" size={34}/></div><h3>Chưa tìm thấy sản phẩm phù hợp</h3><p>Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc để có thêm lựa chọn.</p><button className="primary-btn" onClick={() => { reset(); search(''); }}>Xem tất cả sản phẩm<Icon name="arrow" size={16}/></button></div>}
            {results.length > 0 && <div className="pagination"><span>Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, results.length)} trong {results.length} sản phẩm</span><div><button disabled={currentPage === 1} aria-label="Trang trước" onClick={() => setPage(currentPage - 1)}><Icon name="chevron" size={15} style={{ transform: 'rotate(180deg)' }}/></button>{Array.from({ length: pages }, (_, i) => <button key={i} aria-label={`Trang ${i + 1}`} aria-current={currentPage === i + 1 ? 'page' : undefined} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button disabled={currentPage === pages} aria-label="Trang sau" onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={15}/></button></div></div>}
          </div>
        </div>
      </section>
      <section className="service-strip">{[['shield', 'Chính hãng 100%', 'An tâm về nguồn gốc'], ['truck', 'Giao hàng nhanh', 'Đồng hành mọi nơi'], ['return', 'Đổi trả thuận tiện', 'Hỗ trợ theo chính sách'], ['headphones', 'Tư vấn tận tâm', 'Lựa chọn cùng chuyên gia']].map(([icon, title, text]) => <div key={icon}><Icon name={icon} size={25}/><span><b>{title}</b><small>{text}</small></span></div>)}</section>
    </main>
    <footer className="site-footer container"><div><a href="#" className="footer-logo">TechStore<span>.</span></a><p>Chọn công nghệ tốt, sống tiện nghi hơn.</p></div><span>Giá & thông tin là dữ liệu mẫu</span><small>© 2026 TechStore</small></footer>
    <dialog ref={dialog} className="product-dialog" onCancel={() => setDetail(null)} onClick={e => { if (e.target === e.currentTarget) { dialog.current?.close(); setDetail(null); } }}>{detail && <><button className="dialog-close" aria-label="Đóng thông tin sản phẩm" onClick={() => { dialog.current?.close(); setDetail(null); }}><Icon name="close"/></button><div className="detail-art"><ProductArt color={detail.color} kind={detail.kind} name={detail.name}/></div><div className="detail-content"><span className="section-label">{detail.brand} · {detail.category}</span><h2>{detail.name}</h2><p className="detail-price">{money(detail.price)} <del>{money(detail.originalPrice)}</del></p><dl>{[['Bộ xử lý', detail.processor], ['RAM', detail.ram ? `${detail.ram} GB` : 'Không áp dụng'], ['Bộ nhớ / kết nối', detail.storage], ['Màn hình / thông tin', detail.display], ['Tình trạng', detail.stock ? 'Còn hàng' : 'Tạm hết hàng']].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><button className="primary-btn" onClick={() => toggleSaved(detail.id)}><Icon name="heart" size={17}/>{saved.includes(detail.id) ? 'Đã lưu sản phẩm' : 'Lưu để xem sau'}</button><small className="mock-disclaimer">Thông tin minh họa cho bản mẫu giao diện.</small></div></>}</dialog>
  </div>;
}
