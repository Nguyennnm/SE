import { useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import {
  applyCartCoupon,
  clearCart,
  getCart,
  removeCartCoupon,
  removeCartItem,
  setCartItemQuantity,
  type Cart,
  type CartItem,
} from '../services/cartApi';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';
import '../cart.css';
import '../cart-design.css';

const money = (value: number | null) => value == null
  ? 'Chưa có giá'
  : `${new Intl.NumberFormat('vi-VN').format(value)}₫`;

const quantityValidationMessage = (item: CartItem, value: string) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    return 'Số lượng phải là số nguyên dương.';
  }
  if (Number(value) > item.availableStock) return `Chỉ còn ${item.availableStock} sản phẩm.`;
  return '';
};

export function CartPage({ token, onCountChange, onContinueShopping, onOpenProduct }: {
  token: string;
  onCountChange: (count: number) => void;
  onContinueShopping: () => void;
  onOpenProduct: (productId: string, sku: string) => void;
}) {
  const [cart, setCart] = useState<Cart>({
    items: [], itemCount: 0, subtotal: 0, couponCode: null, discount: 0, total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponDraft, setCouponDraft] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getCart(token, controller.signal)
      .then(next => {
        if (controller.signal.aborted) return;
        setCart(next);
        setCouponDraft(next.couponCode ?? '');
        setQuantityDrafts({});
        onCountChange(next.itemCount);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Không tải được giỏ hàng.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, retry, onCountChange]);

  const applyCart = (next: Cart) => {
    setCart(next);
    setCouponDraft(next.couponCode ?? '');
    setQuantityDrafts({});
    setError('');
    setCouponError('');
    onCountChange(next.itemCount);
  };

  const mutate = async (action: () => Promise<Cart>, message = 'Không lưu được giỏ hàng, vui lòng thử lại.') => {
    setBusy(true);
    setError('');
    try { applyCart(await action()); }
    catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : message);
    } finally { setBusy(false); }
  };

  const removeItem = (sku: string) => mutate(() => removeCartItem(token, sku));

  const changeQuantity = (item: CartItem, quantity: number) => {
    setQuantityDrafts(current => ({ ...current, [item.sku]: String(quantity) }));
    void mutate(() => setCartItemQuantity(token, item.sku, quantity));
  };

  const commitQuantity = (item: CartItem) => {
    const draft = quantityDrafts[item.sku];
    if (draft === undefined) return;
    if (quantityValidationMessage(item, draft)) return;
    const quantity = Number(draft);
    if (quantity !== item.quantity) changeQuantity(item, quantity);
    else setQuantityDrafts(current => {
      const next = { ...current };
      delete next[item.sku];
      return next;
    });
  };

  const empty = () => mutate(() => clearCart(token));

  const confirmChanges = async () => {
    setBusy(true);
    setError('');
    let latest = cart;
    let unresolved = false;
    try {
      for (const item of cart.items) {
        if (!item.priceChanged && item.quantity <= item.availableStock) continue;
        if (item.unitPrice == null || item.availableStock < 1) {
          unresolved = true;
          continue;
        }
        latest = await setCartItemQuantity(token, item.sku, Math.min(item.quantity, item.availableStock));
        setCart(latest);
        onCountChange(latest.itemCount);
      }
      applyCart(latest);
      if (unresolved) setError('Một số sản phẩm đã hết hàng hoặc chưa có giá. Hãy xóa sản phẩm đó khỏi giỏ.');
    } catch (err) {
      setCart(latest);
      onCountChange(latest.itemCount);
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Không xác nhận được thay đổi.');
    } finally { setBusy(false); }
  };

  const applyCoupon = async () => {
    setBusy(true);
    setCouponError('');
    try { applyCart(await applyCartCoupon(token, couponDraft)); }
    catch (err) { setCouponError(err instanceof Error ? err.message : 'Không áp dụng được mã giảm giá.'); }
    finally { setBusy(false); }
  };

  const clearCoupon = () => mutate(() => removeCartCoupon(token));

  const changedItems = cart.items.filter(item => item.priceChanged || item.quantity > item.availableStock);
  const invalidQuantity = cart.items.some(item => {
    const value = quantityDrafts[item.sku];
    return value !== undefined && Boolean(quantityValidationMessage(item, value));
  });
  const checkoutBlocked = busy || invalidQuantity || cart.items.some(item => !item.isAvailable || item.priceChanged);

  return <section className="cart-page" aria-labelledby="cart-title">
    <div className="cart-breadcrumb"><button onClick={onContinueShopping}>Trang chủ</button><span>/</span><b>Giỏ hàng</b></div>
    <div className="cart-heading">
      <div>
        <h1 id="cart-title">Giỏ hàng ({cart.items.length} sản phẩm)</h1>
        <p>{cart.items.length ? 'Kiểm tra sản phẩm, số lượng và mã giảm giá trước khi đặt hàng.' : 'Trạng thái khi khách hàng chưa thêm sản phẩm nào vào giỏ.'}</p>
      </div>
      {error && cart.items.length > 0 && <div className="cart-save-error" role="alert">
        <div><Icon name="close" size={17}/><b>Không lưu được giỏ hàng, vui lòng thử lại</b></div>
        <p>{error} Đang hiển thị trạng thái giỏ hàng đã lưu gần nhất.</p>
        <button onClick={() => setRetry(value => value + 1)} disabled={busy}>Thử lại</button>
      </div>}
    </div>

    {changedItems.length > 0 && <div className="cart-change-notice" role="alert">
      <div><b><Icon name="shield" size={18}/>Giá/tồn kho đã thay đổi, vui lòng xác nhận lại</b>
        <p>{changedItems.map(item => item.priceChanged
          ? `${item.name}: ${money(item.observedUnitPrice)} → ${money(item.unitPrice)}`
          : `${item.name}: chỉ còn ${item.availableStock} sản phẩm`).join(' · ')}</p>
      </div>
      <button onClick={confirmChanges} disabled={busy}>Xác nhận thay đổi</button>
    </div>}

    {loading ? <div className="cart-state" role="status"><span className="loading-spinner"/>Đang tải giỏ hàng...</div>
      : error && cart.items.length === 0 ? <div className="cart-state cart-error" role="alert"><Icon name="return" size={28}/><p>{error}</p><button className="cart-primary" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>
      : cart.items.length === 0 ? <div className="cart-empty">
        <div className="cart-empty-icon"><Icon name="cart" size={44}/></div>
        <h2>Giỏ hàng của bạn đang trống</h2>
        <p>Hãy thêm sản phẩm vào giỏ để tiến hành đặt hàng.</p>
        <button className="cart-primary" onClick={onContinueShopping}>TIẾP TỤC MUA SẮM</button>
      </div> : <>
        <div className="cart-layout">
          <section className="cart-table" aria-label="Sản phẩm trong giỏ">
            <div className="cart-table-head"><span>SẢN PHẨM</span><span>ĐƠN GIÁ</span><span>SỐ LƯỢNG</span><span>THÀNH TIỀN</span></div>
            {cart.items.map(item => {
              const quantity = quantityDrafts[item.sku] ?? String(item.quantity);
              const quantityError = quantityDrafts[item.sku] === undefined ? '' : quantityValidationMessage(item, quantity);
              const lineTotal = (item.unitPrice ?? 0) * item.quantity;
              const kind = item.categoryCode === 'phone' ? 'phone' : item.categoryCode === 'tablet' ? 'tablet' : 'laptop';
              return <article className={`cart-row ${!item.isAvailable ? 'cart-row-warning' : ''}`} key={item.sku}>
                <div className="cart-product">
                  <button type="button" className="cart-item-image" aria-label={`Xem chi tiết ${item.name}`} onClick={() => onOpenProduct(item.productId, item.sku)}>
                    <ProductImage color="#4879bd" kind={kind} name={item.name} src={item.imageUrl ?? undefined}/>
                  </button>
                  <div className="cart-product-info">
                    <button type="button" className="cart-item-link" onClick={() => onOpenProduct(item.productId, item.sku)}>{item.name}</button>
                    <p>Cấu hình: {[item.ramGb ? `RAM ${item.ramGb}GB` : '', item.storageGb ? `Bộ nhớ ${item.storageGb}GB` : ''].filter(Boolean).join(' · ') || item.category}</p>
                    {item.color && <p>Màu: {item.color}</p>}
                    <small>SKU: {item.sku}</small>
                  </div>
                </div>
                <div className={`cart-unit-price ${item.priceChanged ? 'has-change' : ''}`}>
                  <b>{money(item.unitPrice)}</b>
                  {item.priceChanged && item.observedUnitPrice != null && <del>{money(item.observedUnitPrice)}</del>}
                  {item.priceChanged && <span className="cart-new-price">Giá mới</span>}
                </div>
                <div className="cart-quantity">
                  <div className={`cart-stepper ${quantityError ? 'has-error' : ''}`}>
                    <button aria-label={`Giảm số lượng ${item.name}`} disabled={busy || Number(quantity) <= 1} onClick={() => changeQuantity(item, item.quantity - 1)}>−</button>
                    <input aria-label={`Số lượng ${item.name}`} inputMode="numeric" value={quantity} onChange={event => setQuantityDrafts(current => ({ ...current, [item.sku]: event.target.value }))} onBlur={() => commitQuantity(item)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}/>
                    <button aria-label={`Tăng số lượng ${item.name}`} disabled={busy || item.quantity >= item.availableStock} onClick={() => changeQuantity(item, item.quantity + 1)}>+</button>
                  </div>
                  {quantityError ? <small className="cart-quantity-error" role="alert">{quantityError}</small>
                    : item.quantity > item.availableStock ? <small className="cart-quantity-error">Đã vượt số lượng tồn kho</small>
                    : item.availableStock <= 2 && item.availableStock > 0 ? <small className="cart-stock-warning">⚠ Chỉ còn {item.availableStock} sản phẩm</small>
                    : item.availableStock > 0 && <small className="cart-stock-note">Còn {item.availableStock} sản phẩm</small>}
                </div>
                <div className="cart-line-total">
                  <b>{money(lineTotal)}</b>
                  <button aria-label={`Xóa ${item.name}`} onClick={() => void removeItem(item.sku)} disabled={busy}><Icon name="close" size={14}/>Xóa</button>
                </div>
              </article>;
            })}
          </section>

          <aside className="cart-summary">
            <h2>Tóm tắt đơn hàng</h2>
            <div className="cart-summary-row"><span>Tạm tính ({cart.itemCount} sản phẩm)</span><b>{money(cart.subtotal)}</b></div>
            <div className="cart-summary-row"><span>Phí giao hàng</span><b className="cart-free-shipping">Miễn phí</b></div>
            <div className="cart-coupon">
              <label htmlFor="cart-coupon">Mã giảm giá</label>
              <div><input id="cart-coupon" value={couponDraft} onChange={event => setCouponDraft(event.target.value)} placeholder="Nhập mã giảm giá" disabled={busy}/>
                {cart.couponCode && <button className="cart-coupon-clear" aria-label="Xóa mã giảm giá" onClick={clearCoupon} disabled={busy}><Icon name="close" size={15}/></button>}
                <button className="cart-coupon-apply" onClick={applyCoupon} disabled={busy || !couponDraft.trim()}>Áp dụng</button>
              </div>
              {couponError && <p className="cart-coupon-error" role="alert">{couponError}</p>}
              {cart.couponCode && cart.discount > 0 && <p className="cart-coupon-success">✓ Đã áp dụng mã {cart.couponCode} – giảm {money(cart.discount)}</p>}
            </div>
            {cart.discount > 0 && <div className="cart-summary-row cart-promotion"><span>Khuyến mãi</span><b>−{money(cart.discount)}</b></div>}
            <div className="cart-summary-total"><b>Tổng tiền</b><strong>{money(cart.total)}</strong></div>
            <small className="cart-vat">(Đã bao gồm VAT)</small>
            <button className="cart-checkout" disabled={checkoutBlocked} onClick={() => setCheckoutNotice('Luồng đặt hàng chưa được triển khai trong phạm vi demo.')}>TIẾN HÀNH ĐẶT HÀNG</button>
            {checkoutNotice && <p className="cart-checkout-note" role="status">{checkoutNotice}</p>}
            {!invalidQuantity && !busy && cart.items.some(item => !item.isAvailable || item.priceChanged)
              && <p className="cart-confirm-hint">Vui lòng xác nhận thay đổi giá/tồn kho trước khi đặt hàng</p>}
            <button className="cart-continue" onClick={onContinueShopping}>← Tiếp tục mua sắm</button>
            <p className="cart-disclaimer">ℹ️ Giỏ hàng không giữ hàng trong kho. Giá và tồn kho sẽ được kiểm tra lại khi đặt hàng.</p>
          </aside>
        </div>
        {invalidQuantity && <p className="cart-validation-note" role="alert">Vui lòng sửa số lượng không hợp lệ trước khi tiếp tục.</p>}
      </>}

    <footer className="cart-design-footer">
      <div><b>TechStore</b><span>Chọn công nghệ tốt, sống tiện nghi hơn</span></div>
      <p>Hotline hỗ trợ: 1800 6868 (Miễn phí) · Chính sách bảo hành · Chính sách đổi trả 30 ngày · Bảo mật thông tin</p>
      <small>© 2026 TechStore · Đồ án Nhóm 07 - CSC13002 Nhập môn Công nghệ phần mềm</small>
    </footer>
  </section>;
}
