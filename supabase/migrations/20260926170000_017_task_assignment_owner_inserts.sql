-- Let signed-in users post assignments owned by their own profile.
DROP POLICY IF EXISTS "tasks_insert_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_owner" ON public.tasks;
CREATE POLICY "tasks_insert_owner" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
