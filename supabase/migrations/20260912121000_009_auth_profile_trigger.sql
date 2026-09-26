/*
# Create profiles and wallets for unverified signups

Email and SMS signups do not have an authenticated client session until the
verification step completes, so these records must be created server-side.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_type text := new.raw_user_meta_data ->> 'user_type';
BEGIN
  INSERT INTO public.profiles (id, email, phone, user_type)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    new.phone,
    CASE WHEN requested_type IN ('worker', 'client') THEN requested_type ELSE 'worker' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  INSERT INTO public.wallets (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
