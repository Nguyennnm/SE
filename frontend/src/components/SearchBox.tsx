import { useEffect, useId, useRef, useState } from 'react';
import { getSuggestions, type Product, type SearchParams } from '../services/productApi';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';

interface Props { value: string; onChange: (value: string) => void; onSearch: (value: string) => void; onSelectProduct?: (product: Product) => void; criteria: SearchParams }
export function SearchBox({ value, onChange, onSearch, onSelectProduct, criteria }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const key = JSON.stringify(criteria);
  const canSuggest = value.trim().length >= 2;

  useEffect(() => {
    const controller = new AbortController();
    setItems([]); setActive(-1); setError(false);
    if (!open || value.trim().length < 2) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    const timer = setTimeout(() => {
      const params: SearchParams = JSON.parse(key);
      getSuggestions({ ...params, q: value.trim(), page: 1, limit: 5 }, controller.signal)
        .then(products => { if (!controller.signal.aborted) setItems(products); })
        .catch(() => { if (!controller.signal.aborted) setError(true); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, key, open]);

  const submit = (text: string) => { setOpen(false); setActive(-1); onSearch(text); };
  const selectProduct = (product: Product) => {
    setOpen(false);
    setActive(-1);
    if (onSelectProduct) onSelectProduct(product);
    else onSearch(product.variantName ?? product.name);
  };
  const show = open && canSuggest;
  return <form className="header-search autocomplete" role="search" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onSubmit={e => { e.preventDefault(); if (active >= 0 && items[active]) selectProduct(items[active]); else submit(value); }}>
    <Icon name="search"/>
    <input ref={input} role="combobox" aria-label="Tìm sản phẩm" aria-autocomplete="list" aria-controls={listId} aria-expanded={show} aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" maxLength={200} placeholder="Tìm laptop, điện thoại, phụ kiện..." value={value}
      onFocus={() => setOpen(true)} onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setOpen(true);
          if (items.length) setActive(old => e.key === 'ArrowDown' ? (old + 1) % items.length : old <= 0 ? items.length - 1 : old - 1);
        }
      }}/>
    {value && <button type="button" className="clear-input" aria-label="Xóa từ khóa" onClick={() => { submit(''); input.current?.focus(); }}><Icon name="close" size={15}/></button>}
    <button className="search-button" aria-label="Tìm kiếm"><Icon name="search" size={19}/></button>
    {show && <div className="suggestions-panel">
      <div className="suggestions-heading">Gợi ý sản phẩm <span>Theo danh mục & bộ lọc đã chọn</span></div>
      <div role="status" className="suggestion-status">{loading ? 'Đang tìm gợi ý...' : error ? 'Không tải được gợi ý. Bạn vẫn có thể nhấn Enter để tìm kiếm.' : items.length ? `${items.length} gợi ý phù hợp` : 'Không có gợi ý phù hợp. Thử từ khóa khác hoặc bỏ bớt bộ lọc.'}</div>
      <div id={listId} role="listbox" aria-label="Gợi ý sản phẩm">{!loading && !error && items.map((product, index) => <div id={`${listId}-${index}`} role="option" aria-selected={active === index} className={`suggestion-option ${active === index ? 'suggestion-active' : ''}`} key={`${product.id}:${product.selectedSku ?? index}`} onMouseEnter={() => setActive(index)} onMouseDown={e => e.preventDefault()} onClick={() => selectProduct(product)}>
        <div className="suggestion-image"><ProductImage src={product.imageUrl} name={product.name} color={product.color} kind={product.kind}/></div>
        <div className="suggestion-copy"><b>{product.variantName ?? product.name}</b><small>{product.brand} · {product.category}</small></div>
        <strong>{product.price == null ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN').format(product.price) + '₫'}</strong>
      </div>)}</div>
      <button className="suggestions-all" type="button" onClick={() => submit(value)}>Xem kết quả cho “{value.trim()}”<Icon name="arrow" size={15}/></button>
      <div className="suggestions-help"><span>↑ ↓ để chọn</span><span>Enter để tìm · Esc để đóng</span></div>
    </div>}
  </form>;
}
