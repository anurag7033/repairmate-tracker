import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackingId } = await req.json();
    if (!trackingId) {
      return new Response(JSON.stringify({ error: "trackingId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await supabase
      .from("repair_orders")
      .select("payment_link")
      .eq("tracking_id", trackingId)
      .maybeSingle();

    if (!order?.payment_link) {
      return new Response(JSON.stringify({ payments: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract payment_link id from short_url (e.g. https://rzp.io/i/xxxx) — we stored short_url only.
    // We need to query Razorpay using payment links search by reference. Instead, fetch all payment links by notes.tracking_id.
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // Fetch all payment links and filter by notes.tracking_id (Razorpay does not support notes filter; we filter client-side)
    const linksRes = await fetch(
      `https://api.razorpay.com/v1/payment_links?count=100`,
      {
        headers: { Authorization: `Basic ${authHeader}` },
      }
    );
    const linksData = await linksRes.json();
    const matchingLinks = (linksData.payment_links || []).filter(
      (l: any) => l.notes?.tracking_id === trackingId
    );

    const allPayments: any[] = [];
    for (const link of matchingLinks) {
      // Fetch payments associated with the link
      const payRes = await fetch(
        `https://api.razorpay.com/v1/payment_links/${link.id}`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      const payData = await payRes.json();
      const payments = payData.payments || [];
      for (const p of payments) {
        if (p.status !== "captured") continue;
        // Fetch full payment details
        const detailRes = await fetch(
          `https://api.razorpay.com/v1/payments/${p.payment_id}`,
          { headers: { Authorization: `Basic ${authHeader}` } }
        );
        const detail = await detailRes.json();
        allPayments.push({
          payment_id: detail.id,
          order_id: detail.order_id,
          method: detail.method,
          amount: detail.amount / 100,
          currency: detail.currency,
          status: detail.status,
          created_at: detail.created_at,
          transaction_id:
            detail.method === "upi"
              ? detail.acquirer_data?.rrn || detail.id
              : detail.id,
          vpa: detail.vpa,
          bank: detail.bank,
          card_last4: detail.card?.last4,
        });
      }
    }

    // Dedupe by payment_id
    const seen = new Set();
    const unique = allPayments.filter((p) => {
      if (seen.has(p.payment_id)) return false;
      seen.add(p.payment_id);
      return true;
    });

    return new Response(JSON.stringify({ payments: unique }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-payment-details error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", payments: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
