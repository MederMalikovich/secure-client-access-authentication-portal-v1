ALTER TABLE public.loyalty_settings
  ADD COLUMN IF NOT EXISTS silver_max_redeem numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS gold_max_redeem numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS vip_max_redeem numeric NOT NULL DEFAULT 70;