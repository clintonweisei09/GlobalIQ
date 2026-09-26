import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedOrigins = (Deno.env.get("APP_ORIGIN") || "https://earniq.africa,http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || allowedOrigins[0];
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  };
}

const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE");
const INITIATOR_NAME = Deno.env.get("MPESA_INITIATOR_NAME");
const SECURITY_CREDENTIAL = Deno.env.get("MPESA_SECURITY_CREDENTIAL");

const MPESA_ENV = Deno.env.get("MPESA_ENV") || "live";
const MPESA_HOST = MPESA_ENV === "sandbox" ? "sandbox.safaricom.co.ke" : "api.safaricom.co.ke";
const AUTH_URL = `https://${MPESA_HOST}/oauth/v1/generate?grant_type=client_credentials`;
const B2C_URL = `https://${MPESA_HOST}/mpesa/b2c/v1/paymentrequest`;
const B2B_URL = `https://${MPESA_HOST}/mpesa/b2b/v1/paymentrequest`;

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
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("M-Pesa credentials are not configured");
  }

  const credentials = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  const resp = await fetchWithTimeout(AUTH_URL, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`OAuth failed: ${await resp.text()}`);
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    if (!SHORTCODE || !INITIATOR_NAME || !SECURITY_CREDENTIAL) {
      return new Response(JSON.stringify({ error: "M-Pesa payout credentials are not configured. Add the initiator name and encrypted security credential." }), {
        status: 503, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { phone, amountUSD, destinationType = "phone", tillNumber } = await req.json();
    if (!amountUSD || !["phone", "till"].includes(destinationType)) {
      return new Response(JSON.stringify({ error: "Amount and a valid M-Pesa destination are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const stkPhone = destinationType === "phone" ? normalizePhone(String(phone || "")) : null;
    const cleanTillNumber = destinationType === "till" ? String(tillNumber || "").replace(/\s/g, "") : null;
    if (destinationType === "phone" && !/^2547\d{8}$/.test(stkPhone || "")) {
      return new Response(JSON.stringify({ error: "Invalid M-Pesa phone number. Use format 07XXXXXXXX." }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (destinationType === "till" && (!/^\d{5,7}$/.test(cleanTillNumber || "") || (Deno.env.get("MPESA_TILL_NUMBER") && Deno.env.get("MPESA_TILL_NUMBER") !== cleanTillNumber))) {
      return new Response(JSON.stringify({ error: "Invalid or unconfigured M-Pesa till number." }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const amountNum = Number(amountUSD);
    if (isNaN(amountNum) || amountNum < 1) {
      return new Response(JSON.stringify({ error: "Minimum withdrawal is $1.00" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const kesAmount = Math.round(amountNum * 150);

    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, available_balance, locked_earnings, last_earning_time")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const holdUntil = wallet.last_earning_time
      ? new Date(wallet.last_earning_time).getTime() + 48 * 60 * 60 * 1000
      : 0;
    const lockedAmount = holdUntil > Date.now() ? Number(wallet.locked_earnings || 0) : 0;
    const withdrawableBalance = Math.max(0, Number(wallet.available_balance) - lockedAmount);

    if (withdrawableBalance < amountNum) {
      return new Response(JSON.stringify({ error: "Insufficient balance for this withdrawal." }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Create pending withdrawal record
    const { data: withdrawal } = await supabase
      .from("withdrawals")
      .insert({
        user_id: userId,
        amount: amountNum,
        currency: "USD",
        withdrawal_method: "mpesa",
        mpesa_phone: stkPhone,
        mpesa_destination_type: destinationType,
        mpesa_till_number: cleanTillNumber,
        status: "processing",
      })
      .select("id")
      .single();

    if (!withdrawal) {
      return new Response(JSON.stringify({ error: "Failed to create withdrawal record" }), {
        status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Deduct from wallet immediately
    const newBalance = Number(wallet.available_balance) - amountNum;
    await supabase
      .from("wallets")
      .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);

    // Try real B2C payment
    let b2cSucceeded = false;
    let conversationId: string | null = null;
    let providerError = "Safaricom did not accept the payout request.";

    try {
      const accessToken = await getAccessToken();
      const originatorConversationID = `EarnIQ-WD-${withdrawal.id.slice(0, 8)}`;

      const isTillPayment = destinationType === "till";
      const paymentPayload = {
        Initiator: INITIATOR_NAME,
        SecurityCredential: SECURITY_CREDENTIAL,
        CommandID: isTillPayment ? (Deno.env.get("MPESA_B2B_COMMAND_ID") || "BusinessBuyGoods") : "BusinessPayment",
        Amount: kesAmount,
        PartyA: SHORTCODE,
        PartyB: isTillPayment ? cleanTillNumber : stkPhone,
        Remarks: `EarnIQ withdrawal of KES ${kesAmount}`,
        QueueTimeOutURL: "https://rwxfcwooyrldqualtbpn.supabase.co/functions/v1/mpesa-b2c-result",
        ResultURL: "https://rwxfcwooyrldqualtbpn.supabase.co/functions/v1/mpesa-b2c-result",
        AccountReference: originatorConversationID,
        SenderIdentifierType: "4",
        RecieverIdentifierType: isTillPayment ? "4" : "1",
      };

      const paymentResp = await fetchWithTimeout(isTillPayment ? B2B_URL : B2C_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      }, 5000);

      const b2cData = await paymentResp.json();

      if (paymentResp.ok && b2cData.ResponseCode === "0") {
        b2cSucceeded = true;
        conversationId = b2cData.ConversationID;
      } else {
        providerError = b2cData.ResponseDescription || b2cData.errorMessage || providerError;
      }
    } catch (_err) {
      providerError = _err instanceof Error ? _err.message : providerError;
    }

    if (b2cSucceeded && conversationId) {
      await supabase.from("withdrawals").update({
        mpesa_transaction_id: conversationId,
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawal.id);

      return new Response(JSON.stringify({
        withdrawalId: withdrawal.id,
        conversationId,
        kesAmount,
        recipient: isTillPayment ? cleanTillNumber : stkPhone,
        phone: stkPhone,
        tillNumber: cleanTillNumber,
        mode: "live",
        message: `Withdrawal of KES ${kesAmount} initiated.`,
      }), {
        status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    await supabase.from("withdrawals").update({
      status: "failed",
      failure_reason: providerError,
      updated_at: new Date().toISOString(),
    }).eq("id", withdrawal.id);

    await supabase.from("wallets").update({
      available_balance: Number(wallet.available_balance),
      updated_at: new Date().toISOString(),
    }).eq("id", wallet.id);

    return new Response(JSON.stringify({
      withdrawalId: withdrawal.id,
      status: "failed",
      error: "Safaricom did not accept the payout. Your balance was restored.",
    }), {
      status: 502, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
