
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

-- Storage: CVs bucket policies
CREATE POLICY "Staff can read CVs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND public.is_staff(auth.uid()));
CREATE POLICY "Anyone can upload CV" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cvs');
CREATE POLICY "Admin/manager delete CVs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
