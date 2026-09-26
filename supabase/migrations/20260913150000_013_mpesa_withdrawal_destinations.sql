/* Store whether an M-Pesa withdrawal targets a phone or a till. */
ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS mpesa_destination_type text NOT NULL DEFAULT 'phone'
    CHECK (mpesa_destination_type IN ('phone', 'till'));

ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS mpesa_till_number text;

CREATE INDEX IF NOT EXISTS idx_withdrawals_mpesa_destination
  ON withdrawals(mpesa_destination_type);
