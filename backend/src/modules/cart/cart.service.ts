import type { PoolClient } from 'pg';
import { pool, isDatabaseConnected } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export interface CartItem {
  id: number;
  sku: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  categoryCode: string;
  ramGb: number | null;
  storageGb: number | null;
  color: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number | null;
  observedUnitPrice: number | null;
  availableStock: number;
  isAvailable: boolean;
  priceChanged: boolean;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  couponCode: string | null;
  discount: number;
  total: number;
}

interface CartItemRow {
  id: number;
  sku: string;
  product_id: number;
  model_name: string;
  variant_name: string;
  brand: string;
  category: string;
  category_code: string;
  ram_gb: number | null;
  storage_gb: number | null;
  color: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number | null;
  observed_unit_price: number | null;
  available_stock: number;
  product_active: boolean;
  variant_active: boolean;
}

interface VariantRow {
  id: number;
  product_active: boolean;
  variant_active: boolean;
  unit_price: number | null;
}

interface SellableVariantRow extends VariantRow {
  available_stock: number;
}

function requireDatabase(): void {
  if (!isDatabaseConnected()) {
    throw new AppError('Giỏ hàng cần kết nối PostgreSQL. Vui lòng thử lại sau.', 503, 'DATABASE_UNAVAILABLE');
  }
}

async function getOrCreateCartId(client: PoolClient, token: string): Promise<number> {
  const result = await client.query<{ id: number }>(
    `INSERT INTO shopping_carts (guest_token)
     VALUES ($1)
     ON CONFLICT (guest_token) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [token]
  );
  return result.rows[0].id;
}

function toCart(rows: CartItemRow[], couponCode: string | null): Cart {
  const items = rows.map((row): CartItem => {
    const unitPrice = row.product_active && row.variant_active && row.unit_price != null && row.unit_price > 0
      ? Number(row.unit_price) : null;
    return {
      id: Number(row.id),
      sku: row.sku,
      productId: String(row.product_id),
      name: row.variant_name || row.model_name,
      brand: row.brand,
      category: row.category,
      categoryCode: row.category_code,
      ramGb: row.ram_gb == null ? null : Number(row.ram_gb),
      storageGb: row.storage_gb == null ? null : Number(row.storage_gb),
      color: row.color,
      imageUrl: row.image_url,
      quantity: Number(row.quantity),
      unitPrice,
      observedUnitPrice: row.observed_unit_price == null ? null : Number(row.observed_unit_price),
      availableStock: Number(row.available_stock),
      isAvailable: unitPrice != null && Number(row.available_stock) >= Number(row.quantity),
      priceChanged: row.observed_unit_price == null
        ? unitPrice != null
        : unitPrice !== Number(row.observed_unit_price),
    };
  });
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
  const discount = couponCode === 'TECH500K' && subtotal >= 5_000_000 ? 500_000 : 0;
  return {
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal,
    couponCode,
    discount,
    total: Math.max(0, subtotal - discount),
  };
}

const CART_ITEMS_SQL = `
  SELECT ci.id, v.sku, p.id AS product_id, p.model_name, v.variant_name,
    b.name AS brand, c.name AS category, c.code AS category_code,
    v.ram_gb, v.storage_gb, v.specifications->>'color' AS color,
    (SELECT img.image_url FROM product_images img
      WHERE img.product_id = p.id AND (img.variant_id = v.id OR img.variant_id IS NULL)
      ORDER BY (img.variant_id = v.id) DESC NULLS LAST, img.is_primary DESC,
        img.display_order, img.id LIMIT 1) AS image_url,
    ci.quantity, v.selling_price_vnd AS unit_price, ci.observed_unit_price_vnd AS observed_unit_price,
    GREATEST(COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0), 0) AS available_stock,
    p.is_active AS product_active, v.is_active AS variant_active
  FROM cart_items ci
  JOIN product_variants v ON v.id = ci.variant_id
  JOIN products p ON p.id = v.product_id
  JOIN brands b ON b.id = p.brand_id
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN inventory_items i ON i.variant_id = v.id
  WHERE ci.cart_id = $1
  ORDER BY ci.created_at, ci.id`;

async function readCart(client: PoolClient, cartId: number): Promise<Cart> {
  const [cart, result] = await Promise.all([
    client.query<{ coupon_code: string | null }>('SELECT coupon_code FROM shopping_carts WHERE id = $1', [cartId]),
    client.query<CartItemRow>(CART_ITEMS_SQL, [cartId]),
  ]);
  return toCart(result.rows, cart.rows[0]?.coupon_code ?? null);
}

async function clearIneligibleCoupon(client: PoolClient, cartId: number): Promise<void> {
  await client.query(
    `UPDATE shopping_carts c SET coupon_code = NULL
     WHERE c.id = $1 AND c.coupon_code IS NOT NULL
       AND (SELECT COALESCE(SUM(v.selling_price_vnd * ci.quantity), 0)
            FROM cart_items ci
            JOIN product_variants v ON v.id = ci.variant_id
            JOIN products p ON p.id = v.product_id
            WHERE ci.cart_id = c.id AND p.is_active AND v.is_active
              AND v.selling_price_vnd IS NOT NULL) < 5000000`,
    [cartId]
  );
}

async function lockSellableVariant(client: PoolClient, sku: string): Promise<SellableVariantRow> {
  const result = await client.query<VariantRow>(
    `SELECT v.id, p.is_active AS product_active, v.is_active AS variant_active,
      v.selling_price_vnd AS unit_price
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.sku = $1
     FOR UPDATE OF v`,
    [sku]
  );
  const variant = result.rows[0];
  if (!variant) throw new AppError('Không tìm thấy SKU.', 404, 'CART_VARIANT_NOT_FOUND');
  if (!variant.product_active || !variant.variant_active) {
    throw new AppError('Sản phẩm đã ngừng kinh doanh.', 409, 'CART_PRODUCT_UNAVAILABLE');
  }
  if (variant.unit_price == null || variant.unit_price <= 0) {
    throw new AppError('SKU chưa có giá bán nên không thể thêm vào giỏ.', 409, 'CART_PRICE_UNAVAILABLE');
  }
  const inventory = await client.query<{ available_stock: number }>(
    `SELECT GREATEST(quantity_on_hand - quantity_reserved, 0) AS available_stock
     FROM inventory_items WHERE variant_id = $1 FOR UPDATE`,
    [variant.id]
  );
  const sellable = { ...variant, available_stock: Number(inventory.rows[0]?.available_stock ?? 0) };
  if (sellable.available_stock < 1) {
    throw new AppError('SKU hiện đã hết hàng.', 409, 'CART_OUT_OF_STOCK');
  }
  return sellable;
}

async function inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export class CartService {
  async getCart(token: string): Promise<Cart> {
    requireDatabase();
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM shopping_carts WHERE guest_token = $1',
      [token]
    );
    if (!result.rows[0]) return { items: [], itemCount: 0, subtotal: 0, couponCode: null, discount: 0, total: 0 };
    const client = await pool.connect();
    try {
      return await readCart(client, result.rows[0].id);
    } finally {
      client.release();
    }
  }

  async addItem(token: string, sku: string, quantity: number): Promise<Cart> {
    requireDatabase();
    return inTransaction(async client => {
      const cartId = await getOrCreateCartId(client, token);
      const variant = await lockSellableVariant(client, sku);
      const existing = await client.query<{ quantity: number }>(
        'SELECT quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2 FOR UPDATE',
        [cartId, variant.id]
      );
      const nextQuantity = Number(existing.rows[0]?.quantity ?? 0) + quantity;
      if (nextQuantity > variant.available_stock) {
        throw new AppError(`Chỉ còn ${variant.available_stock} sản phẩm có thể mua.`, 409, 'CART_INSUFFICIENT_STOCK');
      }
      await client.query(
        `INSERT INTO cart_items (cart_id, variant_id, quantity, observed_unit_price_vnd)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (cart_id, variant_id) DO UPDATE SET
           quantity = EXCLUDED.quantity,
           observed_unit_price_vnd = EXCLUDED.observed_unit_price_vnd,
           updated_at = NOW()`,
        [cartId, variant.id, nextQuantity, variant.unit_price]
      );
      await clearIneligibleCoupon(client, cartId);
      await client.query('UPDATE shopping_carts SET updated_at = NOW() WHERE id = $1', [cartId]);
      return readCart(client, cartId);
    });
  }

  async updateQuantity(token: string, sku: string, quantity: number): Promise<Cart> {
    requireDatabase();
    return inTransaction(async client => {
      const cartResult = await client.query<{ id: number }>(
        'SELECT id FROM shopping_carts WHERE guest_token = $1 FOR UPDATE',
        [token]
      );
      const cartId = cartResult.rows[0]?.id;
      if (!cartId) throw new AppError('Không tìm thấy giỏ hàng.', 404, 'CART_NOT_FOUND');
      const variant = await lockSellableVariant(client, sku);
      if (quantity > variant.available_stock) {
        throw new AppError(`Chỉ còn ${variant.available_stock} sản phẩm có thể mua.`, 409, 'CART_INSUFFICIENT_STOCK');
      }
      const result = await client.query(
        `UPDATE cart_items SET quantity = $3, observed_unit_price_vnd = $4, updated_at = NOW()
         WHERE cart_id = $1 AND variant_id = $2`,
        [cartId, variant.id, quantity, variant.unit_price]
      );
      if (!result.rowCount) throw new AppError('Không tìm thấy sản phẩm trong giỏ.', 404, 'CART_ITEM_NOT_FOUND');
      await clearIneligibleCoupon(client, cartId);
      await client.query('UPDATE shopping_carts SET updated_at = NOW() WHERE id = $1', [cartId]);
      return readCart(client, cartId);
    });
  }

  async removeItem(token: string, sku: string): Promise<Cart> {
    requireDatabase();
    return inTransaction(async client => {
      const cartResult = await client.query<{ id: number }>(
        'SELECT id FROM shopping_carts WHERE guest_token = $1 FOR UPDATE',
        [token]
      );
      const cartId = cartResult.rows[0]?.id;
      if (!cartId) return { items: [], itemCount: 0, subtotal: 0, couponCode: null, discount: 0, total: 0 };
      await client.query(
        `DELETE FROM cart_items ci USING product_variants v
         WHERE ci.cart_id = $1 AND ci.variant_id = v.id AND v.sku = $2`,
        [cartId, sku]
      );
      await clearIneligibleCoupon(client, cartId);
      await client.query('UPDATE shopping_carts SET updated_at = NOW() WHERE id = $1', [cartId]);
      return readCart(client, cartId);
    });
  }

  async clearCart(token: string): Promise<Cart> {
    requireDatabase();
    return inTransaction(async client => {
      const cartResult = await client.query<{ id: number }>(
        'SELECT id FROM shopping_carts WHERE guest_token = $1 FOR UPDATE',
        [token]
      );
      const cartId = cartResult.rows[0]?.id;
      if (!cartId) return { items: [], itemCount: 0, subtotal: 0, couponCode: null, discount: 0, total: 0 };
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      await client.query('UPDATE shopping_carts SET coupon_code = NULL WHERE id = $1', [cartId]);
      await client.query('UPDATE shopping_carts SET updated_at = NOW() WHERE id = $1', [cartId]);
      return { items: [], itemCount: 0, subtotal: 0, couponCode: null, discount: 0, total: 0 };
    });
  }

  async applyCoupon(token: string, code: string): Promise<Cart> {
    requireDatabase();
    if (code !== 'TECH500K') {
      throw new AppError('Mã giảm giá không hợp lệ.', 400, 'INVALID_COUPON');
    }
    return inTransaction(async client => {
      const cartResult = await client.query<{ id: number }>(
        'SELECT id FROM shopping_carts WHERE guest_token = $1 FOR UPDATE',
        [token]
      );
      const cartId = cartResult.rows[0]?.id;
      if (!cartId) throw new AppError('Giỏ hàng đang trống.', 409, 'COUPON_CART_EMPTY');
      const cart = await readCart(client, cartId);
      if (cart.subtotal < 5_000_000) {
        throw new AppError('Đơn hàng cần từ 5.000.000₫ để áp dụng mã này.', 409, 'COUPON_MINIMUM_NOT_MET');
      }
      await client.query(
        'UPDATE shopping_carts SET coupon_code = $2, updated_at = NOW() WHERE id = $1',
        [cartId, code]
      );
      return readCart(client, cartId);
    });
  }

  async removeCoupon(token: string): Promise<Cart> {
    requireDatabase();
    return inTransaction(async client => {
      const cartResult = await client.query<{ id: number }>(
        'SELECT id FROM shopping_carts WHERE guest_token = $1 FOR UPDATE',
        [token]
      );
      const cartId = cartResult.rows[0]?.id;
      if (!cartId) return { items: [], itemCount: 0, subtotal: 0, couponCode: null, discount: 0, total: 0 };
      await client.query(
        'UPDATE shopping_carts SET coupon_code = NULL, updated_at = NOW() WHERE id = $1',
        [cartId]
      );
      return readCart(client, cartId);
    });
  }
}

export const cartService = new CartService();
