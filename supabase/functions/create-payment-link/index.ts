import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Fetch order from DB to validate amount server-side
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: dbErr } = await supabase
      .from("repair_orders")
      .select("*")
      .eq("tracking_id", trackingId)
      .single();

    if (dbErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "completed") {
      return new Response(JSON.stringify({ error: "Repair is not completed yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const balanceDue = Number(order.quotation) - Number(order.advance_paid || 0) - Number(order.discount_amount || 0);

    if (balanceDue <= 0) {
      return new Response(JSON.stringify({ error: "No balance due" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountInPaise = Math.round(balanceDue * 100);

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayRes = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        description: `Mobile Repair Payment - ${trackingId}`,
        customer: {
          name: order.customer_name,
          contact: order.customer_phone,
        },
        notify: { sms: true, email: false },
        reminder_enable: true,
        notes: {
          tracking_id: trackingId,
          purpose: "mobile_repair_payment",
        },
        callback_url: `https://tracking.anuragmobile.in/track/${trackingId}`,
        callback_method: "get",
      }),
    });

    const razorpayData = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay error:", razorpayData);
      return new Response(JSON.stringify({ error: "Failed to create payment link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store payment link in order
    await supabase
      .from("repair_orders")
      .update({ payment_link: razorpayData.short_url })
      .eq("tracking_id", trackingId);

    return new Response(
      JSON.stringify({ short_url: razorpayData.short_url, amount: balanceDue }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
