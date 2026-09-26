-- Only the trusted M-Pesa callback may create or modify task unlock records.
DROP POLICY IF EXISTS "unlocked_tasks_insert_own" ON unlocked_tasks;
DROP POLICY IF EXISTS "unlocked_tasks_update_own" ON unlocked_tasks;
DROP POLICY IF EXISTS "unlocked_tasks_delete_own" ON unlocked_tasks;