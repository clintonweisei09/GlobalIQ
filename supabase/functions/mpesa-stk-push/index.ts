import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const PASSKEY = Deno.env.get("MPESA_PASSKEY");
const BUSINESS_SHORTCODE = Deno.env.get("MPESA_BUSINESS_SHORTCODE") || Deno.env.get("MPESA_SHORTCODE");
const TILL_NUMBER = Deno.env.get("MPESA_TILL_NUMBER") || "1712962";
const CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL") ||
  "https://rwxfcwooyrldqualtbpn.supabase.co/functions/v1/mpesa-callback";

const MPESA_ENV = Deno.env.get("MPESA_ENV") || "live";
const MPESA_HOST = MPESA_ENV === "sandbox" ? "sandbox.safaricom.co.ke" : "api.safaricom.co.ke";
const AUTH_URL = `https://${MPESA_HOST}/oauth/v1/generate?grant_type=client_credentials`;
const STK_URL = `https://${MPESA_HOST}/mpesa/stkpush/v1/processrequest`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  const resp = await fetchWithTimeout(AUTH_URL, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OAuth failed (${resp.status}): ${body}`);
  }
  const data = await resp.json();
  return data.access_token;
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s|\+|-/g, "");
  if (p.startsWith("254")) return p;
  if (p.startsWith("0")) return "254" + p.slice(1);
  if (p.startsWith("7") && p.length === 9) return "254" + p;
  return p;
}

function getUnlockFeeForPayout(payoutAmount: number): number {
  return Math.min(250, Math.max(100, 100 + Math.round(Math.min(150, Math.max(0, payoutAmount)))));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !BUSINESS_SHORTCODE) {
      return new Response(JSON.stringify({ error: "Safaricom M-Pesa is not configured. Add live Daraja credentials to the function secrets." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const userName = profile?.full_name || userData.user.email || "User";

    const { taskId, phone, amount, accountReference, transactionDesc } = await req.json();
    if (!taskId || !phone || amount === undefined || amount === null || amount === "") {
      return new Response(JSON.stringify({ error: "Task, mobile number, and amount are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stkPhone = normalizePhone(phone);
    if (!/^254[17]\d{8}$/.test(stkPhone)) {
      return new Response(JSON.stringify({ error: "Invalid M-Pesa phone number. Use format 07XXXXXXXX." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("payout_amount")
      .eq("id", taskId)
      .eq("status", "active")
      .maybeSingle();
    const kesAmount = task ? getUnlockFeeForPayout(Number(task.payout_amount)) : Number.NaN;
    if (taskError || !task || !Number.isInteger(kesAmount) || kesAmount < 100 || kesAmount > 250) {
      return new Response(JSON.stringify({ error: "Invalid or unavailable task" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Number(amount) !== kesAmount) {
      return new Response(JSON.stringify({ error: "The unlock amount does not match this task" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingUnlock, error: unlockLookupError } = await supabase
      .from("unlocked_tasks")
      .select("id, mpesa_payments!inner(status)")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("mpesa_payments.status", "success")
      .maybeSingle();
    if (unlockLookupError) {
      return new Response(JSON.stringify({ error: "Unable to verify this task's unlock status" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existingUnlock) {
      return new Response(JSON.stringify({ error: "This task is already unlocked" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pendingSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: pendingPayment, error: pendingLookupError } = await supabase
      .from("mpesa_payments")
      .select("id")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("status", "pending")
      .gte("created_at", pendingSince)
      .limit(1)
      .maybeSingle();
    if (pendingLookupError) {
      return new Response(JSON.stringify({ error: "Unable to verify pending payments for this task" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pendingPayment) {
      return new Response(JSON.stringify({ error: "A payment prompt for this task is already awaiting confirmation. Check your phone or wait a few minutes before retrying." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentReference = accountReference || "EarnIQ Task Unlock";
    const paymentDescription = transactionDesc || "EarnIQ Task Unlock";
    const { data: paymentRow, error: paymentInsertError } = await supabase
      .from("mpesa_payments")
      .insert({
        user_id: userId,
        task_id: taskId,
        phone: stkPhone,
        amount: kesAmount,
        account_reference: paymentReference,
        transaction_desc: paymentDescription,
        status: "pending",
        result_desc: `Awaiting Safaricom response for Till ${TILL_NUMBER}`,
      })
      .select("id")
      .single();
    if (paymentInsertError || !paymentRow) {
      return new Response(JSON.stringify({ error: "Unable to create a payment record. No M-Pesa prompt was sent." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start a real Safaricom STK push and wait for its checkout identifiers.
    let stkAccepted = false;
    try {
      const accessToken = await getAccessToken();
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T]/g, "")
        .slice(0, 14);
      const password = btoa(`${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`);

      const stkPayload = {
        BusinessShortCode: BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline",
        Amount: kesAmount,
        PartyA: stkPhone,
        PartyB: TILL_NUMBER,
        PhoneNumber: stkPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: paymentReference,
        TransactionDesc: paymentDescription,
      };

      const stkResponse = await fetchWithTimeout(STK_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }, 10000);
      const stkResult = await stkResponse.json();
      if (!stkResponse.ok || !stkResult.CheckoutRequestID) {
        throw new Error(stkResult.errorMessage || stkResult.ResponseDescription || "Safaricom did not accept the STK request.");
      }
      stkAccepted = true;

      const { error: paymentUpdateError } = await supabase
        .from("mpesa_payments")
        .update({
          checkout_request_id: stkResult.CheckoutRequestID,
          merchant_request_id: stkResult.MerchantRequestID,
          result_desc: `Safaricom Till ${TILL_NUMBER}`,
        })
        .eq("id", paymentRow.id);
      if (paymentUpdateError) {
        throw new Error("Safaricom accepted the prompt, but the payment could not be linked for confirmation. Contact support before retrying.");
      }

      return new Response(JSON.stringify({
        paymentId: paymentRow.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
        phone: stkPhone,
        tillNumber: TILL_NUMBER,
        mode: MPESA_ENV,
        status: "pending",
        amount: kesAmount,
        userName,
        customerMessage: `Check your phone to approve the EarnIQ payment to Till ${TILL_NUMBER}.`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (_err) {
      const errorMessage = _err instanceof Error ? _err.message : "Unable to start Safaricom payment.";
      if (!stkAccepted) {
        await supabase
          .from("mpesa_payments")
          .update({ status: "failed", result_desc: errorMessage })
          .eq("id", paymentRow.id)
          .eq("status", "pending");
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
