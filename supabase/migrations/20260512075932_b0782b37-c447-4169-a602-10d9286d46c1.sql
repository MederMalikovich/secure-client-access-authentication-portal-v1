
CREATE OR REPLACE FUNCTION public.apply_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.loyalty_settings%ROWTYPE;
BEGIN
  IF NEW.referred_by_client_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.referred_by_client_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.referred_by_client_id = NEW.id THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.loyalty_settings LIMIT 1;
  IF NOT FOUND OR NOT s.is_enabled THEN RETURN NEW; END IF;

  IF COALESCE(s.referrer_bonus,0) > 0 THEN
    INSERT INTO public.loyalty_transactions (client_id, amount, type, description)
    VALUES (NEW.referred_by_client_id, s.referrer_bonus, 'referral', 'Бонус за приглашение клиента ' || COALESCE(NEW.full_name,''));
  END IF;
  IF COALESCE(s.referee_bonus,0) > 0 THEN
    INSERT INTO public.loyalty_transactions (client_id, amount, type, description)
    VALUES (NEW.id, s.referee_bonus, 'referral', 'Приветственный бонус по реферальному коду');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_referral_bonus_ins ON public.clients;
CREATE TRIGGER trg_apply_referral_bonus_ins
AFTER INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.apply_referral_bonus();

DROP TRIGGER IF EXISTS trg_apply_referral_bonus_upd ON public.clients;
CREATE TRIGGER trg_apply_referral_bonus_upd
AFTER UPDATE OF referred_by_client_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.apply_referral_bonus();
