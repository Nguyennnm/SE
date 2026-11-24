import { AppError } from '../../middleware/errorHandler.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCartToken(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new AppError('Mã giỏ hàng không hợp lệ.', 400, 'INVALID_CART_TOKEN');
  }
  return value.toLowerCase();
}

export function validateSku(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 180) {
    throw new AppError('SKU không hợp lệ.', 400, 'INVALID_SKU');
  }
  return value.trim();
}

export function validateQuantity(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new AppError('Số lượng phải là số nguyên dương.', 400, 'INVALID_QUANTITY');
  }
  return Number(value);
}

export function validateCouponCode(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 40) {
    throw new AppError('Mã giảm giá không hợp lệ.', 400, 'INVALID_COUPON');
  }
  return value.trim().toUpperCase();
}
