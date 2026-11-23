import { apiClient } from './apiClient';

export interface CartItem {
  id: number;
  sku: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  categoryCode: string;
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
}

interface Envelope<T> { success: boolean; data: T }

const headers = (token: string) => ({ 'X-Cart-Token': token });

export async function getCart(token: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<Cart>>('/cart', {
    signal,
    headers: headers(token),
  });
  return data.data;
}

async function updateCart(token: string, method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) {
  const { data } = await apiClient.request<Envelope<Cart>>(path, {
    method,
    headers: headers(token),
    body,
  });
  return data.data;
}

export function addCartItem(token: string, sku: string, quantity: number) {
  return updateCart(token, 'POST', '/cart/items', { sku, quantity });
}

export function setCartItemQuantity(token: string, sku: string, quantity: number) {
  return updateCart(token, 'PATCH', `/cart/items/${encodeURIComponent(sku)}`, { quantity });
}

export function removeCartItem(token: string, sku: string) {
  return updateCart(token, 'DELETE', `/cart/items/${encodeURIComponent(sku)}`);
}

export function clearCart(token: string) {
  return updateCart(token, 'DELETE', '/cart/items');
}
