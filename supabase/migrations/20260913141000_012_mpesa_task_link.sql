/* Link each STK payment to the task it unlocks so the trusted callback can finalize it. */
ALTER TABLE mpesa_payments
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mpesa_payments_task ON mpesa_payments(task_id);
