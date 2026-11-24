import { Router } from 'express';
import { cartController } from './cart.controller.js';

const router = Router();

router.get('/', (req, res, next) => cartController.getCart(req, res, next));
router.post('/coupon', (req, res, next) => cartController.applyCoupon(req, res, next));
router.delete('/coupon', (req, res, next) => cartController.removeCoupon(req, res, next));
router.post('/items', (req, res, next) => cartController.addItem(req, res, next));
router.delete('/items', (req, res, next) => cartController.clearCart(req, res, next));
router.patch('/items/:sku', (req, res, next) => cartController.updateQuantity(req, res, next));
router.delete('/items/:sku', (req, res, next) => cartController.removeItem(req, res, next));

export default router;
