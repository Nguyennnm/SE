import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errorHandler.js';
import { validateCartToken, validateQuantity, validateSku } from '../src/modules/cart/cart.validation.js';

function rejectsCode(run: () => unknown, code: string) {
  assert.throws(run, error => error instanceof AppError && error.code === code);
}

assert.equal(validateCartToken('550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
rejectsCode(() => validateCartToken(undefined), 'INVALID_CART_TOKEN');
rejectsCode(() => validateCartToken('not-a-token'), 'INVALID_CART_TOKEN');

assert.equal(validateSku(' PV-123 '), 'PV-123');
rejectsCode(() => validateSku(''), 'INVALID_SKU');
rejectsCode(() => validateSku('x'.repeat(181)), 'INVALID_SKU');

assert.equal(validateQuantity(2), 2);
for (const quantity of [0, -1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1]) {
  rejectsCode(() => validateQuantity(quantity), 'INVALID_QUANTITY');
}

console.log('Cart validation: 12 checks passed.');
