/*
# Task Unlock System & Payment Processing Flow

## Purpose
Replaces the global account activation with a per-task unlock system. Each task
must be individually unlocked with a small fee. Also adds a multi-step payment
processing flow for completed tasks.

## Changes

### unlocked_tasks (NEW TABLE)
- `id` — uuid primary key
- `user_id` — uuid, the user who unlocked the task (defaults to auth.uid())
- `task_id` — uuid, foreign key to tasks table
- `unlock_fee` — numeric, the fee paid to unlock this specific task (in KES)
- `mpesa_payment_id` — uuid, optional link to the mpesa_payments record
- `created_at` — timestamp

### user_tasks (MODIFIED)
- Adds `payment_status` column: one of 'pending', 'processing', 'waiting_payment', 'paid'
- Adds `accepted_at` — timestamp when task was accepted by client
- Adds `payment_processed_at` — timestamp when payment processing started
- Adds `paid_at` — timestamp when payment reflected on account

### wallets (MODIFIED)
- Adds `locked_earnings` — numeric, earnings locked for 48 hours before withdrawal
- Adds `last_earning_time` — timestamp of most recent earning

## Security
- RLS enabled on unlocked_tasks with owner-scoped CRUD policies.
*/

CREATE TABLE IF NOT EXISTS unlocked_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  unlock_fee numeric(10,2) NOT NULL DEFAULT 100 CHECK (unlock_fee BETWEEN 100 AND 210),
  mpesa_payment_id uuid REFERENCES mpesa_payments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_id)
);

ALTER TABLE unlocked_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unlocked_tasks_select_own" ON unlocked_tasks;
CREATE POLICY "unlocked_tasks_select_own" ON unlocked_tasks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "unlocked_tasks_insert_own" ON unlocked_tasks;
CREATE POLICY "unlocked_tasks_insert_own" ON unlocked_tasks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "unlocked_tasks_update_own" ON unlocked_tasks;
CREATE POLICY "unlocked_tasks_update_own" ON unlocked_tasks
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "unlocked_tasks_delete_own" ON unlocked_tasks;
CREATE POLICY "unlocked_tasks_delete_own" ON unlocked_tasks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_unlocked_tasks_user ON unlocked_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_tasks_task ON unlocked_tasks(task_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tasks' AND column_name = 'payment_status') THEN
    ALTER TABLE user_tasks ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'waiting_payment', 'paid'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tasks' AND column_name = 'accepted_at') THEN
    ALTER TABLE user_tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tasks' AND column_name = 'payment_processed_at') THEN
    ALTER TABLE user_tasks ADD COLUMN payment_processed_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tasks' AND column_name = 'paid_at') THEN
    ALTER TABLE user_tasks ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'locked_earnings') THEN
    ALTER TABLE wallets ADD COLUMN locked_earnings numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'last_earning_time') THEN
    ALTER TABLE wallets ADD COLUMN last_earning_time timestamptz;
  END IF;
END $$;
