/*
# Per-task unlock fees

Every active task has its own unlock fee, constrained to KES 100-210.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS unlock_fee numeric(10,2);

UPDATE tasks
SET unlock_fee = 100 + floor(random() * 111)
WHERE unlock_fee IS NULL;

ALTER TABLE tasks ALTER COLUMN unlock_fee SET DEFAULT (100 + floor(random() * 111));
ALTER TABLE tasks ALTER COLUMN unlock_fee SET NOT NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_unlock_fee_range;
ALTER TABLE tasks ADD CONSTRAINT tasks_unlock_fee_range CHECK (unlock_fee BETWEEN 100 AND 210);

UPDATE unlocked_tasks AS unlocked
SET unlock_fee = tasks.unlock_fee
FROM tasks
WHERE unlocked.task_id = tasks.id
  AND (unlocked.unlock_fee < 100 OR unlocked.unlock_fee > 200);

ALTER TABLE unlocked_tasks DROP CONSTRAINT IF EXISTS unlocked_tasks_fee_range;
ALTER TABLE unlocked_tasks DROP CONSTRAINT IF EXISTS unlocked_tasks_unlock_fee_check;
ALTER TABLE unlocked_tasks ADD CONSTRAINT unlocked_tasks_fee_range CHECK (unlock_fee BETWEEN 100 AND 210);

ALTER TABLE unlocked_tasks ALTER COLUMN unlock_fee SET DEFAULT 100;
