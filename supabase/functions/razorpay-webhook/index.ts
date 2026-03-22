import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    // Verify webhook signature
    if (signature) {
      const expectedSignature = hmac("sha256", secret, body, "utf8", "hex") as string;
      if (expectedSignature !== signature) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event;

    if (event === "payment_link.paid") {
      const paymentLink = payload.payload?.payment_link?.entity;
      const trackingId = paymentLink?.notes?.tracking_id;

      if (trackingId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Get current order to calculate
        const { data: order } = await supabase
          .from("repair_orders")
          .select("quotation, discount_amount")
          .eq("tracking_id", trackingId)
          .single();

        if (order) {
          const totalPaid = Number(paymentLink.amount_paid || 0) / 100;

          await supabase
            .from("repair_orders")
            .update({
              payment_status: "paid",
              status: "delivered",
              advance_paid: Number(order.quotation) - Number(order.discount_amount || 0),
            })
            .eq("tracking_id", trackingId);
        }

        console.log(`Payment completed for ${trackingId}`);
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
