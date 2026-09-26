import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) return json({ error: "Invalid token" }, 401);

    const { amountUSD, bankName, bankAccountName, bankAccountNumber, bankBranchCode } = await req.json();
    const amount = Number(amountUSD);
    if (!Number.isFinite(amount) || amount < 1 || !bankName || !bankAccountName || !bankAccountNumber || !bankBranchCode) {
      return json({ error: "Amount and complete bank details are required" }, 400);
    }

    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("available_balance, locked_earnings, last_earning_time")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (walletError || !wallet) return json({ error: "Wallet not found" }, 404);

    const holdUntil = wallet.last_earning_time
      ? new Date(wallet.last_earning_time).getTime() + 48 * 60 * 60 * 1000
      : 0;
    const lockedAmount = holdUntil > Date.now() ? Number(wallet.locked_earnings || 0) : 0;
    const withdrawable = Math.max(0, Number(wallet.available_balance) - lockedAmount);
    if (amount > withdrawable) return json({ error: "Amount exceeds your withdrawable balance" }, 400);

    const { data: withdrawal, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: userData.user.id,
        amount,
        currency: "USD",
        withdrawal_method: "bank",
        bank_name: bankName,
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
        bank_branch_code: bankBranchCode,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !withdrawal) return json({ error: "Unable to create bank transfer request" }, 500);

    return json({
      withdrawalId: withdrawal.id,
      status: "pending",
      message: "Bank transfer request queued for review.",
    }, 202);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Server error" }, 500);
  }
});

function json(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
