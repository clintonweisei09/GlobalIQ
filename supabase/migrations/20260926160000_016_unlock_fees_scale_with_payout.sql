-- Tie each task's KES unlock fee to its payout: KES 100 + rounded USD payout, capped at KES 250.
CREATE OR REPLACE FUNCTION public.set_task_unlock_fee_from_payout()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.unlock_fee := LEAST(
    250::numeric,
    GREATEST(
      100::numeric,
      100 + ROUND(LEAST(150::numeric, GREATEST(0::numeric, COALESCE(NEW.payout_amount, 0::numeric))))
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_calculate_unlock_fee ON public.tasks;
CREATE TRIGGER tasks_calculate_unlock_fee
BEFORE INSERT OR UPDATE OF payout_amount, unlock_fee ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_unlock_fee_from_payout();

ALTER TABLE public.tasks ALTER COLUMN unlock_fee SET DEFAULT 100;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_unlock_fee_range;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_unlock_fee_range CHECK (unlock_fee BETWEEN 100 AND 250);

ALTER TABLE public.unlocked_tasks DROP CONSTRAINT IF EXISTS unlocked_tasks_fee_range;
ALTER TABLE public.unlocked_tasks DROP CONSTRAINT IF EXISTS unlocked_tasks_unlock_fee_check;
ALTER TABLE public.unlocked_tasks ADD CONSTRAINT unlocked_tasks_fee_range CHECK (unlock_fee BETWEEN 100 AND 250);

UPDATE public.tasks
SET unlock_fee = LEAST(
  250::numeric,
  GREATEST(
    100::numeric,
    100 + ROUND(LEAST(150::numeric, GREATEST(0::numeric, COALESCE(payout_amount, 0::numeric))))
  )
);
