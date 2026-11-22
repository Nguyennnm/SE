import { useEffect, useMemo, useRef, useState } from 'react';
import { getProduct, getSimilarProducts, selectProductVariant, type Product, type ProductVariant } from '../services/productApi';
import { ApiError } from '../services/apiClient';
import { ProductImage } from './ProductImage';
import { ProductCard } from './ProductCard';
import { Icon } from './Icon';
import '../product-page.css';

// UC16 – Xem chi tiết sản phẩm (trang đầy đủ theo Figma "uc16_chi_tiet_san_pham").
// Chỉ hiển thị dữ liệu có thật từ API; phần chưa có dữ liệu được ghi rõ "Chưa có ...".

const money = (n: number | null | undefined) => n == null ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN').format(n) + '₫';
const MISSING = 'Chưa có dữ liệu';

const GENERAL_ROWS: [string, string][] = [
  ['series_model', 'Series'], ['model_name', 'Tên model'], ['color', 'Màu sắc'], ['usage', 'Nhu cầu'], ['os', 'Hệ điều hành'],
];
const DETAIL_LABELS: Record<string, string> = {
  cpu_chipset: 'CPU / Chipset', gpu: 'Card đồ họa', ram: 'RAM', ssd: 'Ổ cứng SSD', storage: 'Bộ nhớ trong',
  display: 'Màn hình', screen_size: 'Kích thước màn hình', screen_tech: 'Công nghệ màn hình', resolution: 'Độ phân giải',
  refresh_rate: 'Tần số quét', brightness: 'Độ sáng', rear_camera: 'Camera sau', front_camera: 'Camera trước', camera: 'Camera',
  webcam: 'Webcam', battery: 'Pin', charging_power: 'Sạc', ports: 'Cổng kết nối', wireless_connectivity: 'Kết nối không dây',
  connectivity: 'Kết nối', dimensions: 'Kích thước', weight: 'Trọng lượng', dimensions_weight: 'Kích thước & trọng lượng',
};

const specText = (specs: Record<string, unknown> | undefined, key: string) => {
  const value = specs?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
};
const variantColor = (v: ProductVariant) => specText(v.specifications, 'color');
const capacity = (gb?: number | null) => gb ? (gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024}TB` : `${gb}GB`) : '';
// Tên cấu hình ngắn gọn như Figma (vd "RAM 16GB · 512GB"); giữ tên gốc nếu đã ngắn.
const variantLabel = (v: ProductVariant) => {
  if (v.variant_name && v.variant_name.length <= 40) return v.variant_name;
  const short = [v.ram_gb ? `RAM ${v.ram_gb}GB` : '', capacity(v.storage_gb)].filter(Boolean).join(' · ');
  return short || v.variant_name;
};

export interface ProductPageProps {
  productId: string;
  sku?: string;
  saved: (id: string) => boolean;
  onSave: (id: string) => void;
  onSkuChange: (sku: string) => void;
  onOpenProduct: (id: string, sku?: string) => void;
  onBack: () => void;
  onCategory: (categoryName: string) => void;
  onAddToCart: (product: Product, quantity: number, buyNow: boolean) => void;
}

export function ProductPage({ productId, sku, saved, onSave, onSkuChange, onOpenProduct, onBack, onCategory, onAddToCart }: ProductPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [retry, setRetry] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<'description' | 'specs'>('description');
  const [expanded, setExpanded] = useState(false);
  const [similar, setSimilar] = useState<Product[]>([]);
  const initialSku = useRef(sku);
  initialSku.current = sku;

  // Chỉ tải lại khi đổi sản phẩm; đổi SKU chỉ chọn lại trên dữ liệu đã có (không gọi API thêm).
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setProduct(null); setSimilar([]); setTab('description'); setExpanded(false);
    try { window.scrollTo({ top: 0 }); } catch { /* jsdom */ }
    getProduct(productId, controller.signal, initialSku.current)
      .then(p => { if (!controller.signal.aborted) setProduct(p); })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError({ message: err instanceof Error ? err.message : 'Không tải được chi tiết sản phẩm.', status: err instanceof ApiError ? err.status : 0 });
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [productId, retry]);

  useEffect(() => {
    if (!product) return;
    const controller = new AbortController();
    getSimilarProducts(product, controller.signal).then(items => { if (!controller.signal.aborted) setSimilar(items); }).catch(() => undefined);
    return () => controller.abort();
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setImageIndex(0); setQuantity(1); }, [product?.selectedSku]);

  // Đồng bộ khi SKU trên địa chỉ thay đổi (nút Back/Forward của trình duyệt) mà không tải lại sản phẩm.
  useEffect(() => {
    setProduct(current => current && sku && sku !== current.selectedSku && current.variants.some(v => v.sku === sku) ? selectProductVariant(current, sku) : current);
  }, [sku]);

  const selectSku = (next: string) => {
    setProduct(current => current ? selectProductVariant(current, next) : current);
    onSkuChange(next);
  };

  const selected = product?.variants.find(v => v.sku === product.selectedSku);
  const colors = useMemo(() => {
    if (!product || !selected) return [];
    // Màu sắc của các SKU cùng cấu hình RAM/bộ nhớ với SKU đang chọn.
    const sameConfig = product.variants.filter(v => v.ram_gb === selected.ram_gb && v.storage_gb === selected.storage_gb);
    const byColor = new Map<string, ProductVariant>();
    for (const v of sameConfig) { const c = variantColor(v); if (c && !byColor.has(c)) byColor.set(c, v); }
    const own = variantColor(selected);
    if (own) byColor.set(own, selected);
    return [...byColor.entries()];
  }, [product, selected]);

  if (loading) return <div className="pdp-state" role="status"><span className="loading-spinner"/><p>Đang tải thông tin sản phẩm...</p></div>;

  if (error || !product) {
    const discontinued = error?.status === 400;
    const notFound = error?.status === 404;
    return <div className="pdp-state" role="alert">
      <Icon name={discontinued || notFound ? 'search' : 'return'} size={34}/>
      <h2>{discontinued ? 'Sản phẩm đã ngừng kinh doanh' : notFound ? 'Không tìm thấy sản phẩm' : 'Chưa tải được chi tiết'}</h2>
      <p>{error?.message ?? 'Không tải được chi tiết sản phẩm.'}</p>
      <div className="pdp-state-actions">
        {!discontinued && !notFound && <button className="primary-btn" onClick={() => setRetry(n => n + 1)}>Thử lại</button>}
        <button className="pdp-back-btn detail-back" onClick={onBack}><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }}/>Quay lại danh sách sản phẩm</button>
      </div>
    </div>;
  }

  const p = product;
  const images = p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const mainImage = images[imageIndex] ?? images[0];
  const stock = p.stock;
  const canBuy = stock > 0 && p.price != null;
  const description = (p.description ?? '').trim();
  const specs = p.specs ?? {};
  const generalRows: [string, string][] = [['Thương hiệu', p.brand || MISSING], ['Bảo hành', p.warranty || MISSING],
    ...GENERAL_ROWS.map(([key, label]): [string, string] => [label, specText(specs, key) || MISSING])];
  const detailRows = Object.entries(DETAIL_LABELS).map(([key, label]): [string, string] => [label, specText(specs, key)]).filter(([, v]) => v);
  const setQty = (n: number) => setQuantity(Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, stock)));

  return <div className="pdp">
    <div className="breadcrumb pdp-breadcrumb">
      <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>Trang chủ</a><Icon name="chevron" size={12}/>
      <a href="#" onClick={e => { e.preventDefault(); onCategory(p.category); }}>{p.category}</a><Icon name="chevron" size={12}/>
      <span>{p.brand}</span><Icon name="chevron" size={12}/><span className="pdp-crumb-current">{p.variantName ?? p.name}</span>
    </div>
    <button className="pdp-back-btn detail-back" onClick={onBack}><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }}/>Quay lại kết quả tìm kiếm</button>

    <section className="pdp-main">
      <div className="pdp-gallery">
        <div className="pdp-image detail-art">
          {stock === 0 && <span className="pdp-badge pdp-badge-out">Tạm hết hàng</span>}
          <ProductImage key={mainImage ?? 'art'} color={p.color} kind={p.kind} name={p.variantName ?? p.name} src={mainImage}/>
        </div>
        {images.length > 1 && <div className="pdp-thumbs">
          <button aria-label="Ảnh trước" onClick={() => setImageIndex(i => (i - 1 + images.length) % images.length)}><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }}/></button>
          <div className="pdp-thumb-list">{images.map((src, i) => <button key={src + i} className={i === imageIndex ? 'is-active' : ''} aria-label={`Xem ảnh ${i + 1}`} aria-pressed={i === imageIndex} onClick={() => setImageIndex(i)}><img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"/></button>)}</div>
          <button aria-label="Ảnh sau" onClick={() => setImageIndex(i => (i + 1) % images.length)}><Icon name="chevron" size={14}/></button>
        </div>}
        <ul className="pdp-services">
          <li><Icon name="shield" size={18}/><span><b>Bảo hành chính hãng{p.warranty ? ` ${p.warranty}` : ''}</b><small>{p.warranty ? 'Theo chính sách của hãng' : 'Chưa có dữ liệu thời hạn bảo hành'}</small></span></li>
          <li><Icon name="return" size={18}/><span><b>Đổi trả trong 30 ngày</b><small>Theo chính sách đổi trả TechStore</small></span></li>
          <li><Icon name="truck" size={18}/><span><b>Giao hàng toàn quốc</b><small>Hoặc nhận tại cửa hàng</small></span></li>
          <li><Icon name="headphones" size={18}/><span><b>Tư vấn tận tâm</b><small>Hotline 1800 6868</small></span></li>
        </ul>
      </div>

      <div className="pdp-info">
        <span className="section-label">{p.brand} · {p.category}</span>
        <h1>{p.variantName ?? p.name}</h1>
        <div className="pdp-meta">
          {p.selectedSku && <small className="selected-config">SKU đang xem: {p.selectedSku}</small>}
          <span className="pdp-rating">{p.rating == null ? 'Chưa có đánh giá' : `★ ${p.rating.toFixed(1)} · ${p.reviews ?? 0} đánh giá`}</span>
        </div>

        <fieldset className="variant-selector pdp-block"><legend>1. Chọn cấu hình (SKU) <span>({p.variants.length})</span></legend>
          <div className="variant-options pdp-variant-options">{p.variants.map(v => <button type="button" key={v.sku} className={`variant-option ${p.selectedSku === v.sku ? 'is-selected' : ''}`} aria-pressed={p.selectedSku === v.sku} onClick={() => selectSku(v.sku)}>
            <b title={v.variant_name}>{variantLabel(v)}{variantColor(v) && <em> · {variantColor(v)}</em>}</b><span>{money(v.selling_price_vnd)} · {v.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</span><small>SKU: {v.sku}</small>
          </button>)}</div>
        </fieldset>

        {colors.length > 0 && <div className="pdp-block"><div className="pdp-legend">2. Chọn màu sắc</div>
          <div className="pdp-colors">{colors.map(([name, v]) => <button type="button" key={name} className={v.sku === p.selectedSku ? 'is-selected' : ''} aria-pressed={v.sku === p.selectedSku} onClick={() => selectSku(v.sku)}><i/>{name}</button>)}</div>
        </div>}

        <div className="pdp-price-box">
          <p className="detail-price" aria-live="polite">{money(p.price)}</p>
          <span className={`pdp-stock ${stock > 0 ? 'available' : 'unavailable'}`}>{stock > 0 ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng'}</span>
        </div>

        <div className="pdp-quantity">
          <span>Số lượng:</span>
          <div className="pdp-stepper">
            <button aria-label="Giảm số lượng" disabled={!canBuy || quantity <= 1} onClick={() => setQty(quantity - 1)}>−</button>
            <input aria-label="Số lượng" inputMode="numeric" value={quantity} disabled={!canBuy} onChange={e => setQty(Number(e.target.value.replace(/\D/g, '')))}/>
            <button aria-label="Tăng số lượng" disabled={!canBuy || quantity >= stock} onClick={() => setQty(quantity + 1)}>+</button>
          </div>
          <small>{canBuy ? `(Tối đa ${stock})` : p.price == null ? '(Sản phẩm chưa có giá bán)' : '(Tạm hết hàng)'}</small>
        </div>

        <div className="pdp-actions">
          <button className="pdp-add-cart" disabled={!canBuy} onClick={() => onAddToCart(p, quantity, false)}><Icon name="cart" size={18}/>Thêm vào giỏ</button>
          <button className="pdp-buy-now" disabled={!canBuy} onClick={() => onAddToCart(p, quantity, true)}><b>Mua ngay</b><small>Giao tận nơi hoặc nhận tại cửa hàng</small></button>
        </div>
        <button className={`pdp-save ${saved(p.id) ? 'is-saved' : ''}`} aria-pressed={saved(p.id)} onClick={() => onSave(p.id)}><Icon name="heart" size={16}/>{saved(p.id) ? 'Đã lưu sản phẩm' : 'Lưu để xem sau'}</button>
        <small className="mock-disclaimer">Giá tham khảo từ catalog. Tồn kho phục vụ demo. Giỏ hàng không giữ hàng trong kho (BR05).</small>
      </div>
    </section>

    <section className="pdp-lower">
      <div className="pdp-card pdp-tabs-card">
        <div className="pdp-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'specs'} onClick={() => setTab('specs')}>Thông số kỹ thuật</button>
          <button role="tab" aria-selected={tab === 'description'} onClick={() => setTab('description')}>Chi tiết sản phẩm</button>
        </div>
        {tab === 'description'
          ? <div className={`pdp-description ${expanded ? 'is-expanded' : ''}`} role="tabpanel">
              {description ? description.split(/\n+/).map((line, i) => <p key={i}>{line}</p>) : <p className="pdp-missing">Chưa có mô tả cho sản phẩm này.</p>}
            </div>
          : <div className={`pdp-specs ${expanded ? 'is-expanded' : ''}`} role="tabpanel">
              <h3>Thông tin chung</h3>
              <table><tbody>{generalRows.map(([k, v]) => <tr key={k}><th>{k}</th><td className={v === MISSING ? 'pdp-missing' : ''}>{v}</td></tr>)}</tbody></table>
              <h3>Cấu hình chi tiết</h3>
              {detailRows.length ? <table><tbody>{detailRows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table> : <p className="pdp-missing">{MISSING}</p>}
            </div>}
        <button className="pdp-more" onClick={() => setExpanded(x => !x)}>{expanded ? 'Thu gọn' : 'Xem thêm'}</button>
      </div>

      <div className="pdp-card pdp-reviews">
        <h3>Đánh giá từ khách hàng</h3>
        {p.rating == null ? <p className="pdp-missing">Chưa có đánh giá cho sản phẩm này.</p> : <p><b>{p.rating.toFixed(1)}</b> / 5 · {p.reviews ?? 0} đánh giá</p>}
      </div>
    </section>

    {similar.length > 0 && <section className="pdp-similar">
      <div className="pdp-similar-head"><h2>Sản phẩm tương tự cùng phân khúc</h2><p>Cùng danh mục, mức giá gần nhất</p></div>
      <div className="product-results pdp-similar-grid">{similar.map(s => <ProductCard key={`${s.id}:${s.selectedSku}`} product={s} saved={saved(s.id)} onSave={() => onSave(s.id)} onDetail={() => onOpenProduct(s.id, s.selectedSku)}/>)}</div>
    </section>}
  </div>;
}
