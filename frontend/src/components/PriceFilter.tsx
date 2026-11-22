interface Props {
  ceiling: number | null;
  selected: number | null;
  loaded: boolean;
  onChange: (value: number) => void;
}

export function PriceFilter({ ceiling, selected, loaded, onChange }: Props) {
  const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + '₫';
  return <fieldset>
    <legend>Khoảng giá</legend>
    <div className="price-values"><span>0₫</span><span>{selected === null ? loaded ? 'Chưa có giá' : 'Đang tải...' : money(selected)}</span></div>
    <input className="price-slider" aria-label="Giá tối đa" type="range" min="0" max={ceiling ?? 0} step="1" disabled={ceiling === null || ceiling === 0} value={selected ?? 0} onChange={e => onChange(Number(e.target.value))}/>
    <div className="price-presets">{[15000000, 20000000, 30000000].filter(price => ceiling !== null && price <= ceiling).map(price =>
      <button className={selected === price ? 'chosen' : ''} key={price} onClick={() => onChange(price)}>Dưới {price / 1000000}tr</button>
    )}</div>
  </fieldset>;
}
