CREATE OR REPLACE FUNCTION public.enforce_same_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'sales' THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND owner_id = NEW.owner_id) THEN
      RAISE EXCEPTION 'Access denied: customer not found';
    END IF;
  ELSIF TG_TABLE_NAME = 'installments' THEN
    IF NOT EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id AND owner_id = NEW.owner_id) THEN
      RAISE EXCEPTION 'Access denied: sale not found';
    END IF;
  ELSIF TG_TABLE_NAME = 'payments' THEN
    IF NOT EXISTS (SELECT 1 FROM installments WHERE id = NEW.installment_id AND sale_id = NEW.sale_id AND owner_id = NEW.owner_id) THEN
      RAISE EXCEPTION 'Access denied: installment not found';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enforce_same_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sales_same_owner BEFORE INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.enforce_same_owner();
CREATE TRIGGER installments_same_owner BEFORE INSERT OR UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.enforce_same_owner();
CREATE TRIGGER payments_same_owner BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enforce_same_owner();