-- PA4 | UC19 | Allow the storefront to persist carts before account login.
BEGIN;

ALTER TABLE shopping_carts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS guest_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_shopping_carts_guest_token
  ON shopping_carts(guest_token);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shopping_carts_owner_check'
      AND conrelid = 'shopping_carts'::regclass
  ) THEN
    ALTER TABLE shopping_carts
      ADD CONSTRAINT shopping_carts_owner_check
      CHECK ((user_id IS NOT NULL) <> (guest_token IS NOT NULL));
  END IF;
END $$;

COMMIT;
