import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/response.js';
import { cartService } from './cart.service.js';
import { validateCartToken, validateQuantity, validateSku } from './cart.validation.js';

function cartToken(req: Request): string {
  const header = req.header('x-cart-token');
  return validateCartToken(header);
}

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(successResponse(await cartService.getCart(cartToken(req))));
    } catch (error) { next(error); }
  }

  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sku = validateSku(req.body?.sku);
      const quantity = validateQuantity(req.body?.quantity);
      res.status(201).json(successResponse(await cartService.addItem(cartToken(req), sku, quantity)));
    } catch (error) { next(error); }
  }

  async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sku = validateSku(req.params.sku);
      const quantity = validateQuantity(req.body?.quantity);
      res.json(successResponse(await cartService.updateQuantity(cartToken(req), sku, quantity)));
    } catch (error) { next(error); }
  }

  async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(successResponse(await cartService.removeItem(cartToken(req), validateSku(req.params.sku))));
    } catch (error) { next(error); }
  }

  async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(successResponse(await cartService.clearCart(cartToken(req))));
    } catch (error) { next(error); }
  }
}

export const cartController = new CartController();
