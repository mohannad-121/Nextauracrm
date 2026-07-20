-- Replace public job applications with an authenticated, staff-managed talent directory.
-- Keep the legacy table and CV bucket intact so historical data is not destroyed,
-- but remove every anonymous write path.
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
