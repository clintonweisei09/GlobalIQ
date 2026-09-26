import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function getUnlockFeeForPayout(payoutAmount: number): number {
  return Math.min(250, Math.max(100, 100 + Math.round(Math.min(150, Math.max(0, payoutAmount)))));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;
    if (!callback) {
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Invalid callback" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      MerchantRequestID: merchantRequestId,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc: resultDesc,
    } = callback;

    const success = Number(resultCode) === 0;
    let receiptNo: string | null = null;
    let paidAmount: number | null = null;

    if (success && callback.CallbackMetadata?.Item) {
      for (const item of callback.CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") {
          receiptNo = item.Value;
        } else if (item.Name === "Amount") {
          paidAmount = Number(item.Value);
        }
      }
    }

    const { data: payment, error: paymentLookupError } = await supabase
      .from("mpesa_payments")
      .select("id, user_id, task_id, amount, status")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (paymentLookupError) throw paymentLookupError;
    if (!payment) {
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Payment record not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.status === "success" || payment.status === "failed") {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!success) {
      const { error } = await supabase
        .from("mpesa_payments")
        .update({
          status: "failed",
          result_code: Number(resultCode),
          result_desc: resultDesc,
        })
        .eq("id", payment.id);
      if (error) throw error;
    } else {
        if (!payment.task_id) {
          const { error } = await supabase
            .from("mpesa_payments")
            .update({
              status: "failed",
              result_code: Number(resultCode),
              result_desc: "Successful payment is not linked to a task.",
              mpesa_receipt_no: receiptNo,
            })
            .eq("id", payment.id);
          if (error) throw error;
          return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Processed without task unlock" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("payout_amount")
        .eq("id", payment.task_id)
        .maybeSingle();

      if (taskError) throw taskError;
      const expectedUnlockFee = task ? getUnlockFeeForPayout(Number(task.payout_amount)) : Number.NaN;
      if (!task || !receiptNo || paidAmount !== Number(payment.amount) || paidAmount !== expectedUnlockFee) {
        const { error } = await supabase
          .from("mpesa_payments")
          .update({
            status: "failed",
            result_code: Number(resultCode),
            result_desc: "Safaricom confirmation did not match the recorded task fee or receipt.",
            mpesa_receipt_no: receiptNo,
          })
          .eq("id", payment.id);
        if (error) throw error;
      } else {
        const { error: unlockError } = await supabase.from("unlocked_tasks").upsert({
          user_id: payment.user_id,
          task_id: payment.task_id,
          unlock_fee: expectedUnlockFee,
          mpesa_payment_id: payment.id,
        }, { onConflict: "user_id,task_id" });
        if (unlockError) throw unlockError;

        const { error: paymentUpdateError } = await supabase
          .from("mpesa_payments")
          .update({
            status: "success",
            result_code: Number(resultCode),
            result_desc: resultDesc,
            mpesa_receipt_no: receiptNo,
          })
          .eq("id", payment.id);
        if (paymentUpdateError) throw paymentUpdateError;
      }
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
