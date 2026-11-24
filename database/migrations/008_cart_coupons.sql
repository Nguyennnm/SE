-- PA4 | UC19 | Persist demo coupon selection on guest carts.
ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
