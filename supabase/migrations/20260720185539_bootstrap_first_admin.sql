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

-- The careers form uploads CVs here. Keep the bucket private; staff access is
-- controlled by the storage policies in the preceding migration.
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
