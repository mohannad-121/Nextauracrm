-- CRM operations hub: clients, tasks, files, invoicing, payment milestones, and automation controls.
-- All exposed tables use RLS; no service/secret keys are ever used by the client application.

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  country TEXT,
  city TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  source TEXT,
  notes TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clients_owner_idx ON public.clients(owner_id);
CREATE INDEX clients_source_idx ON public.clients(source);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read clients" ON public.clients FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Managers can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_requests ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS client_requests_client_idx ON public.client_requests(client_id);

CREATE OR REPLACE FUNCTION public.crm_request_client_key(
  p_name TEXT, p_email TEXT, p_phone TEXT, p_business TEXT
) RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN nullif(lower(trim(coalesce(p_email,''))), '') IS NOT NULL THEN 'email:' || lower(trim(p_email))
    WHEN nullif(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g'), '') IS NOT NULL THEN 'phone:' || regexp_replace(p_phone, '[^0-9]', '', 'g')
    ELSE 'name:' || lower(trim(coalesce(p_business, '') || '|' || coalesce(p_name, '')))
  END
$$;

CREATE OR REPLACE FUNCTION public.crm_sync_request_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_client_id UUID;
BEGIN
  INSERT INTO public.clients (display_name, business_name, email, phone, whatsapp, country, city, preferred_language, source, owner_id, dedupe_key)
  VALUES (
    NEW.customer_name, NEW.business_name, NEW.email, NEW.phone, NEW.whatsapp, NEW.country, NEW.city,
    coalesce(NEW.preferred_language, 'en'), NEW.contact_source, NEW.assigned_to,
    public.crm_request_client_key(NEW.customer_name, NEW.email, NEW.phone, NEW.business_name)
  )
  ON CONFLICT (dedupe_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    business_name = coalesce(EXCLUDED.business_name, public.clients.business_name),
    email = coalesce(EXCLUDED.email, public.clients.email),
    phone = coalesce(EXCLUDED.phone, public.clients.phone),
    whatsapp = coalesce(EXCLUDED.whatsapp, public.clients.whatsapp),
    source = coalesce(EXCLUDED.source, public.clients.source),
    owner_id = coalesce(EXCLUDED.owner_id, public.clients.owner_id)
  RETURNING id INTO v_client_id;
  NEW.client_id := v_client_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_request_client BEFORE INSERT OR UPDATE OF customer_name, business_name, email, phone, whatsapp, country, city, preferred_language, contact_source, assigned_to
  ON public.client_requests FOR EACH ROW EXECUTE FUNCTION public.crm_sync_request_client();
UPDATE public.client_requests SET customer_name = customer_name WHERE client_id IS NULL;

CREATE TABLE public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.client_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 240),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  priority public.priority_level NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX client_tasks_assignee_due_idx ON public.client_tasks(assigned_to, due_at) WHERE status IN ('open','in_progress');
CREATE INDEX client_tasks_request_idx ON public.client_tasks(request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tasks TO authenticated;
GRANT ALL ON public.client_tasks TO service_role;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read relevant tasks" ON public.client_tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Staff create tasks" ON public.client_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Staff update own tasks" ON public.client_tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR assigned_to = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers delete tasks" ON public.client_tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_client_tasks_updated BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_paid','paid','overdue','void')),
  issue_date DATE NOT NULL DEFAULT current_date,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'JOD',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invoices_request_idx ON public.invoices(request_id);
CREATE INDEX invoices_due_idx ON public.invoices(due_date) WHERE status IN ('sent','partially_paid');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read invoices through requests" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));
CREATE POLICY "Managers create invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Managers update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admins delete invoices" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invoice_number_seq TO service_role;
CREATE OR REPLACE FUNCTION public.crm_assign_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_invoice_number BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.crm_assign_invoice_number();

CREATE TABLE public.payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payment_milestones_request_idx ON public.payment_milestones(request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_milestones TO authenticated;
GRANT ALL ON public.payment_milestones TO service_role;
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read milestones through requests" ON public.payment_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));
CREATE POLICY "Managers create milestones" ON public.payment_milestones FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Managers update milestones" ON public.payment_milestones FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admins delete milestones" ON public.payment_milestones FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payment_milestones_updated BEFORE UPDATE ON public.payment_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.client_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.client_files TO authenticated;
GRANT ALL ON public.client_files TO service_role;
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read client files" ON public.client_files FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert client files" ON public.client_files FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "Managers delete client files" ON public.client_files FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-files', 'client-files', false, 10485760, ARRAY['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Staff can read client file objects" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-files' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can upload client file objects" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-files' AND public.is_staff(auth.uid()));
CREATE POLICY "Managers delete client file objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));

CREATE TABLE public.crm_automation_rules (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.crm_automation_rules TO authenticated;
GRANT ALL ON public.crm_automation_rules TO service_role;
ALTER TABLE public.crm_automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read automation rules" ON public.crm_automation_rules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers update automation rules" ON public.crm_automation_rules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
INSERT INTO public.crm_automation_rules (key, label, config) VALUES
  ('quote_follow_up', 'Create a follow-up after a quote is sent', '{"days":3}'),
  ('delivery_reminder', 'Create a delivery reminder before due date', '{"days":2}'),
  ('cold_lead', 'Mark inactive new leads as on hold', '{"days":7}'),
  ('invoice_overdue', 'Flag unpaid invoices after their due date', '{}')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crm_apply_automations()
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE cold_count INT := 0; invoice_count INT := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.client_requests r SET status = 'on_hold'
  WHERE r.status = 'new_lead' AND r.created_at < now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.request_activities a WHERE a.request_id = r.id AND a.created_at > r.created_at)
    AND EXISTS (SELECT 1 FROM public.crm_automation_rules WHERE key = 'cold_lead' AND enabled);
  GET DIAGNOSTICS cold_count = ROW_COUNT;
  UPDATE public.invoices SET status = 'overdue'
  WHERE status IN ('sent','partially_paid') AND due_date < current_date
    AND EXISTS (SELECT 1 FROM public.crm_automation_rules WHERE key = 'invoice_overdue' AND enabled);
  GET DIAGNOSTICS invoice_count = ROW_COUNT;
  RETURN jsonb_build_object('cold_leads', cold_count, 'overdue_invoices', invoice_count);
END; $$;
GRANT EXECUTE ON FUNCTION public.crm_apply_automations() TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_automation_on_request_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'quote_sent' AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.next_follow_up_date IS NULL
    AND EXISTS (SELECT 1 FROM public.crm_automation_rules WHERE key = 'quote_follow_up' AND enabled) THEN
    NEW.next_follow_up_date := current_date + 3;
  END IF;
  IF NEW.expected_delivery_date IS NOT NULL
    AND (OLD.expected_delivery_date IS DISTINCT FROM NEW.expected_delivery_date OR OLD.status IS DISTINCT FROM NEW.status)
    AND NEW.status IN ('approved','in_progress')
    AND EXISTS (SELECT 1 FROM public.crm_automation_rules WHERE key = 'delivery_reminder' AND enabled)
    AND NOT EXISTS (SELECT 1 FROM public.client_tasks t WHERE t.request_id = NEW.id AND t.title = 'Prepare delivery' AND t.status IN ('open','in_progress')) THEN
    INSERT INTO public.client_tasks (request_id, client_id, title, priority, assigned_to, due_at, reminder_at, created_by)
    VALUES (NEW.id, NEW.client_id, 'Prepare delivery', 'high', NEW.assigned_to, NEW.expected_delivery_date::timestamptz, (NEW.expected_delivery_date - 2)::timestamptz, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_crm_automation_request BEFORE UPDATE OF status, expected_delivery_date ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.crm_automation_on_request_change();

REVOKE EXECUTE ON FUNCTION public.crm_request_client_key(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_sync_request_client() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_assign_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_automation_on_request_change() FROM PUBLIC, anon, authenticated;
