import type { Product } from '../services/productApi';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';

export function ProductCard({ product: p, saved, onSave, onDetail }: { product: Product; saved: boolean; onSave: () => void; onDetail: () => void }) {
  const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + '₫';
  return <article className="product">
    <div className="product-visual">
      <span className="product-badge">{p.category}</span>
      <button className={`save-product ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} ${p.name}`} aria-pressed={saved} onClick={onSave}><Icon name="heart" size={18}/></button>
      <button className="product-art-button" onClick={onDetail} aria-label={`Xem thông tin ${p.name}`}><ProductImage color={p.color} kind={p.kind} name={p.name} src={p.imageUrl}/></button>
    </div>
    <div className="product-content">
      <div className="product-meta"><span>{p.brand}</span><span className={p.stock ? 'available' : 'unavailable'}><i/>{p.stock ? 'Còn hàng' : 'Tạm hết hàng'}</span></div>
      <h3><button onClick={onDetail}>{p.name}</button></h3>
      <p className="product-specs">{[p.processor, p.ram ? `${p.ram}GB` : '', p.storage].filter(Boolean).join(' · ')}</p>
      <div className="rating">{p.rating != null && <span>★</span>}<b>{p.rating == null ? 'Chưa có đánh giá' : p.rating.toFixed(1)}</b>{p.reviews != null && <span className="review-count">({p.reviews} đánh giá)</span>}</div>
      <div className="product-price"><strong>{p.price == null ? 'Chưa có giá' : money(p.price)}</strong>{p.originalPrice != null && p.price != null && p.originalPrice > p.price && <del>{money(p.originalPrice)}</del>}</div>
      <div className="product-bottom"><span>{p.variants.length} cấu hình · Xem chi tiết</span><button aria-label={`Xem chi tiết ${p.name}`} onClick={onDetail}><Icon name="arrow" size={17}/></button></div>
    </div>
  </article>;
}
