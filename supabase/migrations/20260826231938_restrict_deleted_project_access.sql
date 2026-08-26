-- Deleted projects are soft-deleted with archived_at. Only admins can archive,
-- restore, or view archived projects; hard deletes are not exposed to the app.

DROP POLICY IF EXISTS "Admin/manager read all requests" ON public.client_requests;
DROP POLICY IF EXISTS "Staff read assigned or own requests" ON public.client_requests;
DROP POLICY IF EXISTS "Admin/manager update requests" ON public.client_requests;
DROP POLICY IF EXISTS "Staff update assigned requests limited" ON public.client_requests;
DROP POLICY IF EXISTS "Admin delete requests" ON public.client_requests;

CREATE POLICY "Admins read all requests" ON public.client_requests FOR SELECT TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

CREATE POLICY "Managers read active requests" ON public.client_requests FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'manager'))
    AND archived_at IS NULL
  );

CREATE POLICY "Staff read active assigned requests" ON public.client_requests FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'staff'))
    AND archived_at IS NULL
    AND (assigned_to = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()))
  );

CREATE POLICY "Admins update all requests" ON public.client_requests FOR UPDATE TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

CREATE POLICY "Managers update active requests" ON public.client_requests FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'manager'))
    AND archived_at IS NULL
  )
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'manager'))
    AND archived_at IS NULL
  );

CREATE POLICY "Staff update active assigned requests" ON public.client_requests FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'staff'))
    AND archived_at IS NULL
    AND assigned_to = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'staff'))
    AND archived_at IS NULL
    AND assigned_to = (SELECT auth.uid())
  );

REVOKE DELETE ON TABLE public.client_requests FROM authenticated;
