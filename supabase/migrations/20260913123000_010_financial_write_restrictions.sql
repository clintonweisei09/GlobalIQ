-- Financial and verification state must be changed by trusted server functions only.
DROP POLICY IF EXISTS "wallets_update_own" ON wallets;
DROP POLICY IF EXISTS "withdrawals_insert_own" ON withdrawals;
DROP POLICY IF EXISTS "mpesa_payments_insert_own" ON mpesa_payments;
DROP POLICY IF EXISTS "mpesa_payments_update_own" ON mpesa_payments;

DROP POLICY IF EXISTS "user_tasks_update_own" ON user_tasks;

CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_type IS DISTINCT FROM OLD.user_type
    OR NEW.is_activated IS DISTINCT FROM OLD.is_activated
    OR NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
    RAISE EXCEPTION 'Protected profile fields can only be changed by trusted server functions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_escalation();