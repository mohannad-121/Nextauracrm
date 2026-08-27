-- Let staff maintain the activity notes they create, while managers can correct
-- or remove any activity on requests they can access.
DROP POLICY IF EXISTS "Update own activities" ON public.request_activities;
DROP POLICY IF EXISTS "Admin delete activities" ON public.request_activities;

CREATE POLICY "Authors and managers update activities"
  ON public.request_activities
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Authors and managers delete activities"
  ON public.request_activities
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

-- Remove the placeholder activity requested for Al-Kamal Restaurant without
-- touching similarly named notes on other projects.
DELETE FROM public.request_activities AS activity
USING public.client_requests AS request
WHERE activity.request_id = request.id
  AND request.request_number = 'NA-2026-0100'
  AND lower(btrim(activity.content)) = 'step 1. front-end developing';

-- Client files remain private and capped at 10 MB, but staff can now attach
-- any file type. RLS still controls uploads and downloads.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'client-files';
