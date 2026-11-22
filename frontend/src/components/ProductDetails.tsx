import type { Product } from '../services/productApi';
import { ProductImage } from './ProductImage';
import { Icon } from './Icon';

const money = (n: number | null | undefined) => n == null ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN').format(n) + '₫';

export function ProductDetails({ product: p, saved, onSave, onSelect, onClose }: {
  product: Product; saved: boolean; onSave: () => void; onSelect: (sku: string) => void; onClose: () => void;
}) {
  return <>
    <button className="dialog-close" aria-label="Đóng thông tin sản phẩm" onClick={onClose}><Icon name="close"/></button>
    <div className="detail-art"><ProductImage color={p.color} kind={p.kind} name={p.variantName ?? p.name} src={p.imageUrl}/></div>
    <div className="detail-content">
      <span className="section-label">{p.brand} · {p.category}</span><h2>{p.name}</h2>
      <p className="selected-variant-name">{p.variantName}</p>
      {p.selectedSku && <small className="selected-config">SKU đang xem: {p.selectedSku}</small>}
      <p className="detail-price" aria-live="polite">{money(p.price)}</p>
      <dl>{[['Bộ xử lý', p.processor], ['RAM', p.ram ? `${p.ram} GB` : 'Chưa có thông tin'], [p.kind === 'laptop' ? 'Dung lượng SSD' : 'Bộ nhớ trong', p.storage || 'Chưa có thông tin'], ['Màu sắc', p.variantColor || 'Chưa có thông tin'], ['Màn hình', p.display], ['Tình trạng', p.stock ? 'Còn hàng' : 'Tạm hết hàng']].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <fieldset className="variant-selector"><legend>Chọn phiên bản <span>({p.variants.length})</span></legend>
        <div className="variant-options">{p.variants.map(v => <button type="button" key={v.sku} className={`variant-option ${p.selectedSku === v.sku ? 'is-selected' : ''}`} aria-pressed={p.selectedSku === v.sku} onClick={() => onSelect(v.sku)}>
          <b>{v.variant_name}</b><span>{money(v.selling_price_vnd)} · {v.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</span><small>SKU: {v.sku}</small>
        </button>)}</div>
      </fieldset>
      <button className="primary-btn" onClick={onSave}><Icon name="heart" size={17}/>{saved ? 'Đã lưu sản phẩm' : 'Lưu để xem sau'}</button>
      <small className="mock-disclaimer">Giá tham khảo từ catalog. Tồn kho phục vụ demo.</small>
    </div>
  </>;
}
