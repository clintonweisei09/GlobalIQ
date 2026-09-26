/*
  Add poster imagery and bank withdrawal destination fields.
  Bank payouts remain pending until a configured bank payout provider processes them.
*/

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS poster_avatar_url text;

ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS withdrawal_method text NOT NULL DEFAULT 'mpesa'
    CHECK (withdrawal_method IN ('mpesa', 'bank'));
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS bank_branch_code text;
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS mpesa_destination_type text NOT NULL DEFAULT 'phone'
    CHECK (mpesa_destination_type IN ('phone', 'till'));
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS mpesa_till_number text;

ALTER TABLE withdrawals ALTER COLUMN mpesa_phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawals_method ON withdrawals(withdrawal_method);
