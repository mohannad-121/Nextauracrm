-- NextAura CRM complete database setup
-- Run this entire file ONCE in Supabase SQL Editor on a brand-new project.
-- All statements run in one transaction: any failure rolls back the setup.
--
-- For an existing database, use the timestamped files in supabase/migrations
-- and apply only pending migrations instead.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     OR to_regclass('public.user_roles') IS NOT NULL
     OR to_regclass('public.client_requests') IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'NextAura CRM tables already exist.',
      HINT = 'Do not rerun fresh-project-setup.sql. Apply only pending timestamped migrations.';
  END IF;
END;
$$;

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','manager','staff');
CREATE TYPE public.request_status AS ENUM (
  'new_lead','contacted','requirements_gathering','preparing_quote','quote_sent',
  'negotiating','approved','in_progress','waiting_for_client','testing','delivered',
  'completed','on_hold','rejected','cancelled'
);
CREATE TYPE public.payment_status AS ENUM (
  'not_quoted','quoted','awaiting_deposit','partially_paid','fully_paid','refunded','cancelled'
);
CREATE TYPE public.priority_level AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','cliq','paypal','card','other');
CREATE TYPE public.activity_type AS ENUM ('note','call','whatsapp','email','meeting','status_change','payment','quote','delivery','other');
CREATE TYPE public.career_status AS ENUM ('new','reviewing','potential_match','contacted','interview_planned','talent_pool','rejected','hired','archived');

-- ============ COMMON UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROJECT CATEGORIES / SERVICES ============
CREATE TABLE public.project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_categories TO authenticated, anon;
GRANT ALL ON public.project_categories TO service_role;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active categories" ON public.project_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.project_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.project_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.project_categories (slug, name_en, name_ar, sort_order) VALUES
('business-website','Business Website','موقع أعمال',1),
('portfolio-website','Portfolio Website','موقع أعمال شخصي',2),
('ecommerce','E-commerce Store','متجر إلكتروني',3),
('booking-system','Booking System','نظام حجوزات',4),
('admin-dashboard','Admin Dashboard','لوحة تحكم',5),
('web-app','Web Application','تطبيق ويب',6),
('mobile-app','Mobile Application','تطبيق جوال',7),
('ai-chatbot','AI Chatbot','شات بوت ذكي',8),
('ai-automation','AI Automation','أتمتة بالذكاء الاصطناعي',9),
('rag-system','RAG System','نظام RAG',10),
('custom-ai','Custom AI Solution','حل ذكاء اصطناعي مخصص',11),
('data-dashboard','Data Dashboard','لوحة بيانات',12),
('maintenance','Maintenance and Support','صيانة ودعم',13),
('seo-analytics','SEO and Analytics','SEO وتحليلات',14),
('ui-ux','UI/UX Design','تصميم واجهات',15),
('other','Other','أخرى',99);

CREATE TABLE public.project_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_services TO authenticated, anon;
GRANT ALL ON public.project_services TO service_role;
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read services" ON public.project_services FOR SELECT USING (true);
CREATE POLICY "Admins manage services" ON public.project_services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ REQUEST NUMBER SEQUENCE ============
CREATE SEQUENCE public.request_number_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.request_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.request_number_seq TO service_role;

CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n BIGINT;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    n := nextval('public.request_number_seq');
    NEW.request_number := 'NA-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

-- ============ CLIENT REQUESTS ============
CREATE TABLE public.client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE,

  -- Customer
  customer_name TEXT NOT NULL,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  phone_secondary TEXT,
  whatsapp TEXT,
  country TEXT,
  city TEXT,
  preferred_language TEXT DEFAULT 'en',
  contact_source TEXT,

  -- Project
  project_title TEXT NOT NULL,
  category_id UUID REFERENCES public.project_categories(id) ON DELETE SET NULL,
  requested_services JSONB DEFAULT '[]'::jsonb,
  project_description TEXT,
  customer_requirements TEXT,
  internal_notes TEXT,

  -- Pricing
  quoted_price NUMERIC(12,2) CHECK (quoted_price IS NULL OR quoted_price >= 0),
  agreed_price NUMERIC(12,2) CHECK (agreed_price IS NULL OR agreed_price >= 0),
  currency TEXT DEFAULT 'JOD',
  estimated_cost NUMERIC(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_status public.payment_status NOT NULL DEFAULT 'not_quoted',

  -- Workflow
  status public.request_status NOT NULL DEFAULT 'new_lead',
  priority public.priority_level NOT NULL DEFAULT 'normal',

  -- Dates
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_contact_date DATE,
  quote_date DATE,
  agreement_date DATE,
  project_start_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  next_follow_up_date DATE,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Extras
  rejection_reason TEXT,
  cancellation_reason TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_requests_status ON public.client_requests(status);
CREATE INDEX idx_client_requests_assigned ON public.client_requests(assigned_to);
CREATE INDEX idx_client_requests_category ON public.client_requests(category_id);
CREATE INDEX idx_client_requests_follow_up ON public.client_requests(next_follow_up_date);
CREATE INDEX idx_client_requests_archived ON public.client_requests(archived_at);
CREATE INDEX idx_client_requests_number ON public.client_requests(request_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_requests TO authenticated;
GRANT ALL ON public.client_requests TO service_role;
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager read all requests" ON public.client_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Staff read assigned or own requests" ON public.client_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid()));
CREATE POLICY "Admin/manager insert requests" ON public.client_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admin/manager update requests" ON public.client_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Staff update assigned requests limited" ON public.client_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND assigned_to = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'staff') AND assigned_to = auth.uid());
CREATE POLICY "Admin delete requests" ON public.client_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_requests_number BEFORE INSERT ON public.client_requests FOR EACH ROW EXECUTE FUNCTION public.generate_request_number();
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.client_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REQUEST SERVICE LINKS ============
CREATE TABLE public.request_service_links (
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.project_services(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, service_id)
);
GRANT SELECT, INSERT, DELETE ON public.request_service_links TO authenticated;
GRANT ALL ON public.request_service_links TO service_role;
ALTER TABLE public.request_service_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff access via request" ON public.request_service_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));

-- ============ REQUEST STATUS HISTORY ============
CREATE TABLE public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  previous_status public.request_status,
  new_status public.request_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.request_status_history TO authenticated;
GRANT ALL ON public.request_status_history TO service_role;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read via request" ON public.request_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));
CREATE POLICY "Insert via request" ON public.request_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.request_status_history (request_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_status_history (request_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_request_status_history
  AFTER INSERT OR UPDATE OF status ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

-- ============ REQUEST PAYMENTS ============
CREATE TABLE public.request_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'JOD',
  method public.payment_method NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_request ON public.request_payments(request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_payments TO authenticated;
GRANT ALL ON public.request_payments TO service_role;
ALTER TABLE public.request_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read payments if can read request" ON public.request_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));
CREATE POLICY "Admin/manager insert payments" ON public.request_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admin/manager update payments" ON public.request_payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admin delete payments" ON public.request_payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.recalc_request_paid()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE rid UUID;
BEGIN
  rid := COALESCE(NEW.request_id, OLD.request_id);
  UPDATE public.client_requests
    SET amount_paid = COALESCE((SELECT SUM(amount) FROM public.request_payments WHERE request_id = rid), 0)
    WHERE id = rid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_recalc_paid AFTER INSERT OR UPDATE OR DELETE ON public.request_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_request_paid();

-- ============ REQUEST ACTIVITIES ============
CREATE TABLE public.request_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  activity_type public.activity_type NOT NULL DEFAULT 'note',
  content TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_request ON public.request_activities(request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_activities TO authenticated;
GRANT ALL ON public.request_activities TO service_role;
ALTER TABLE public.request_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read activities via request" ON public.request_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));
CREATE POLICY "Insert activities if authenticated" ON public.request_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_requests r WHERE r.id = request_id));
CREATE POLICY "Update own activities" ON public.request_activities FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete activities" ON public.request_activities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ LEGACY CAREER APPLICATIONS ============
-- Kept for historical data compatibility. New records are created only in
-- career_profiles through the authenticated internal portal below.
CREATE TABLE public.career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  country TEXT,
  city TEXT,
  preferred_language TEXT DEFAULT 'en',
  field_of_interest TEXT NOT NULL,
  experience_level TEXT,
  years_of_experience NUMERIC(4,1) CHECK (years_of_experience IS NULL OR years_of_experience >= 0),
  current_job_title TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  personal_website TEXT,
  cv_path TEXT,
  short_intro TEXT,
  key_skills TEXT,
  preferred_work_type TEXT,
  availability TEXT,
  expected_compensation TEXT,
  cover_letter TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  status public.career_status NOT NULL DEFAULT 'new',
  internal_notes TEXT,
  internal_rating INT CHECK (internal_rating IS NULL OR (internal_rating BETWEEN 1 AND 5)),
  archived_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_careers_status ON public.career_applications(status);
CREATE INDEX idx_careers_field ON public.career_applications(field_of_interest);

GRANT SELECT, UPDATE, DELETE ON public.career_applications TO authenticated;
GRANT ALL ON public.career_applications TO service_role;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read applications" ON public.career_applications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin/manager update applications" ON public.career_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admin delete applications" ON public.career_applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_careers_updated BEFORE UPDATE ON public.career_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AI CHAT SESSIONS & MESSAGES ============
CREATE TABLE public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_sessions TO authenticated;
GRANT ALL ON public.ai_chat_sessions TO service_role;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sessions" ON public.ai_chat_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ai_sessions_updated BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_session ON public.ai_chat_messages(session_id);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own messages" ON public.ai_chat_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_chat_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_chat_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- Revoke broad execute; keep only where needed
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_request_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_request_paid() FROM PUBLIC, anon, authenticated;

-- has_role & is_staff must be callable by RLS as authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Storage: legacy CV bucket policies. There is intentionally no upload policy.
CREATE POLICY "Staff can read CVs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND public.is_staff(auth.uid()));
CREATE POLICY "Admin/manager delete CVs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));

-- Keep public signup safe while making a fresh CRM installation usable:
-- the first account becomes the administrator and later accounts wait for
-- an administrator to assign them a role.
--
-- This is an incremental migration. On a brand-new Supabase project, run
-- supabase/fresh-project-setup.sql instead so the base tables exist first.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'The base CRM schema is missing.',
      HINT = 'Run supabase/fresh-project-setup.sql on a new Supabase project instead of this incremental migration.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  should_bootstrap_admin BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  -- Serialize the first-role decision so concurrent signups cannot both
  -- become administrators.
  PERFORM pg_catalog.pg_advisory_xact_lock(20260720185539);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles)
  INTO should_bootstrap_admin;

  IF should_bootstrap_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- If an account was created before this migration, make the oldest account
-- the initial administrator. This block is a no-op once any role exists.
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(20260720185539);

  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    SELECT id
    INTO first_user_id
    FROM auth.users
    ORDER BY created_at, id
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (first_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- Preserve the private legacy bucket for historical files. Public uploads are disabled.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'cvs',
  'cvs',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============ INTERNAL CAREER PORTAL ============
-- Public applications are disabled. The legacy table and bucket remain so
-- historical records are preserved, but only the internal portal accepts data.
REVOKE INSERT ON TABLE public.career_applications FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit application" ON public.career_applications;
DROP POLICY IF EXISTS "Anyone can upload CV" ON storage.objects;

CREATE TABLE public.career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (length(btrim(full_name)) > 0),
  phone TEXT NOT NULL CHECK (length(btrim(phone)) > 0),
  identity_number TEXT NOT NULL CHECK (length(btrim(identity_number)) > 0),
  field TEXT NOT NULL CHECK (length(btrim(field)) > 0),
  links TEXT[] NOT NULL DEFAULT '{}'::TEXT[] CHECK (cardinality(links) <= 20),
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX career_profiles_identity_number_unique
  ON public.career_profiles (lower(identity_number));
CREATE INDEX career_profiles_field_idx ON public.career_profiles (field);
CREATE INDEX career_profiles_active_created_idx
  ON public.career_profiles (created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX career_profiles_created_by_idx ON public.career_profiles (created_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.career_profiles TO authenticated;
GRANT ALL ON TABLE public.career_profiles TO service_role;

ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read career profiles"
  ON public.career_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff((SELECT auth.uid()))));

CREATE POLICY "Staff create career profiles"
  ON public.career_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_staff((SELECT auth.uid())))
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "Staff update career profiles"
  ON public.career_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_staff((SELECT auth.uid()))))
  WITH CHECK ((SELECT public.is_staff((SELECT auth.uid()))));

CREATE POLICY "Admins delete career profiles"
  ON public.career_profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

CREATE TRIGGER trg_career_profiles_updated
  BEFORE UPDATE ON public.career_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
