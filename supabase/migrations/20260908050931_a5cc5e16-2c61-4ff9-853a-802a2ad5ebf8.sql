ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider_id text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_provider_id_unique
  ON public.orders (payment_provider_id)
  WHERE payment_provider_id IS NOT NULL;

DROP POLICY IF EXISTS "Users confirm payment on own pending orders" ON public.orders;