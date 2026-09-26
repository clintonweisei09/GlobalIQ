/* Expand task unlock fees to KES 100-250. */

ALTER TABLE tasks ALTER COLUMN unlock_fee SET DEFAULT (100 + floor(random() * 151));
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_unlock_fee_range;
ALTER TABLE tasks ADD CONSTRAINT tasks_unlock_fee_range CHECK (unlock_fee BETWEEN 100 AND 250);

ALTER TABLE unlocked_tasks DROP CONSTRAINT IF EXISTS unlocked_tasks_fee_range;
ALTER TABLE unlocked_tasks DROP CONSTRAINT IF EXISTS unlocked_tasks_unlock_fee_check;
ALTER TABLE unlocked_tasks ADD CONSTRAINT unlocked_tasks_fee_range CHECK (unlock_fee BETWEEN 100 AND 250);