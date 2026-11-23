import { useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { clearCart, getCart, removeCartItem, setCartItemQuantity, type Cart } from '../services/cartApi';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';
import '../cart.css';

const money = (value: number | null) => value == null
  ? 'Chưa có giá'
  : `${new Intl.NumberFormat('vi-VN').format(value)}₫`;

export function CartPage({ token, onCountChange, onContinueShopping, onOpenProduct }: {
  token: string;
  onCountChange: (count: number) => void;
  onContinueShopping: () => void;
  onOpenProduct: (productId: string, sku: string) => void;
}) {
  const [cart, setCart] = useState<Cart>({ items: [], itemCount: 0, subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busySku, setBusySku] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getCart(token, controller.signal)
      .then(next => {
        if (controller.signal.aborted) return;
        setCart(next);
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
    onCountChange(next.itemCount);
    setError('');
  };

  const mutate = async (sku: string, action: () => Promise<Cart>) => {
    setBusySku(sku);
    setError('');
    try { applyCart(await action()); }
    catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Không cập nhật được giỏ hàng.');
    } finally { setBusySku(''); }
  };

  const empty = async () => {
    setBusySku('__all__');
    setError('');
    try { applyCart(await clearCart(token)); }
    catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Không xóa được giỏ hàng.');
    } finally { setBusySku(''); }
  };

  return <section className="cart-page" aria-labelledby="cart-title">
    <div className="cart-breadcrumb"><button onClick={onContinueShopping}>Tiếp tục mua sắm</button><Icon name="chevron" size={12}/><span>Giỏ hàng</span></div>
    <div className="cart-heading">
      <div><span className="section-label">ĐƠN HÀNG CỦA BẠN</span><h1 id="cart-title">Giỏ hàng <span>{cart.itemCount}</span></h1><p>Kiểm tra sản phẩm và số lượng trước khi tiếp tục.</p></div>
      {cart.items.length > 0 && <button className="cart-clear" disabled={busySku !== ''} onClick={empty}><Icon name="close" size={15}/>Xóa tất cả</button>}
    </div>
    {loading ? <div className="cart-state" role="status"><span className="loading-spinner"/>Đang tải giỏ hàng...</div>
      : error && cart.items.length === 0 ? <div className="cart-state cart-error" role="alert"><Icon name="return" size={28}/><p>{error}</p><button className="cart-primary" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>
      : cart.items.length === 0 ? <div className="cart-empty"><div><Icon name="cart" size={30}/></div><h2>Giỏ hàng đang trống</h2><p>Hãy chọn sản phẩm phù hợp và thêm vào giỏ hàng nhé.</p><button className="cart-primary" onClick={onContinueShopping}>Khám phá sản phẩm<Icon name="arrow" size={16}/></button></div>
      : <>
        {error && <p className="cart-message" role="alert">{error}</p>}
        <div className="cart-layout">
          <div className="cart-items">
            {cart.items.map(item => <article className={`cart-item ${!item.isAvailable ? 'cart-item-unavailable' : ''}`} key={item.sku}>
              <button type="button" className="cart-item-image" aria-label={`Xem chi tiết ${item.name}`} onClick={() => onOpenProduct(item.productId, item.sku)}><ProductImage color="#4879bd" kind={item.categoryCode === 'phone' ? 'phone' : item.categoryCode === 'tablet' ? 'tablet' : 'laptop'} name={item.name} src={item.imageUrl ?? undefined}/></button>
              <div className="cart-item-main">
                <div className="cart-item-top"><div><span className="cart-item-brand">{item.brand} · {item.category}</span><h2><button type="button" className="cart-item-link" onClick={() => onOpenProduct(item.productId, item.sku)}>{item.name}</button></h2><small>SKU: {item.sku}</small></div>
                  <button className="cart-remove" aria-label={`Xóa ${item.name} khỏi giỏ`} disabled={busySku !== ''} onClick={() => mutate(item.sku, () => removeCartItem(token, item.sku))}><Icon name="close" size={17}/></button>
                </div>
                <div className="cart-item-bottom">
                  <div className="cart-stepper" aria-label={`Số lượng ${item.name}`}>
                    <button aria-label={`Giảm số lượng ${item.name}`} disabled={busySku !== '' || item.quantity <= 1} onClick={() => mutate(item.sku, () => setCartItemQuantity(token, item.sku, item.quantity - 1))}>−</button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button aria-label={`Tăng số lượng ${item.name}`} disabled={busySku !== '' || !item.isAvailable || item.quantity >= item.availableStock} onClick={() => mutate(item.sku, () => setCartItemQuantity(token, item.sku, item.quantity + 1))}>+</button>
                  </div>
                  <strong className="cart-item-price">{money(item.unitPrice)}</strong>
                </div>
                {!item.isAvailable && <p className="cart-line-warning" role="alert">{item.unitPrice == null ? 'Sản phẩm hiện không còn được bán.' : `Chỉ còn ${item.availableStock} sản phẩm trong kho. Hãy giảm số lượng hoặc xóa sản phẩm.`}</p>}
                {item.priceChanged && item.unitPrice != null && <p className="cart-line-warning" role="alert">Giá đã thay đổi từ {money(item.observedUnitPrice)} thành {money(item.unitPrice)}. <button disabled={busySku !== ''} onClick={() => mutate(item.sku, () => setCartItemQuantity(token, item.sku, item.quantity))}>Cập nhật giá</button></p>}
              </div>
            </article>)}
          </div>
          <aside className="cart-summary">
            <h2>Tóm tắt đơn hàng</h2>
            <div className="cart-summary-row"><span>Tạm tính ({cart.itemCount} sản phẩm)</span><b>{money(cart.subtotal)}</b></div>
            <div className="cart-summary-row"><span>Phí vận chuyển</span><b>Tính khi đặt hàng</b></div>
            <div className="cart-summary-total"><span>Tổng cộng</span><strong>{money(cart.subtotal)}</strong></div>
            <p className="cart-disclaimer"><Icon name="shield" size={17}/>Giá tham khảo từ catalog, có thể thay đổi. Tồn kho phục vụ demo và chưa được giữ cho giỏ hàng.</p>
            <button className="cart-primary cart-continue" onClick={onContinueShopping}>Tiếp tục mua sắm<Icon name="arrow" size={16}/></button>
          </aside>
        </div>
      </>}
  </section>;
}
