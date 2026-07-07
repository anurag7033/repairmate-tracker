import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderPayload,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderPayload) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const items = orderPayload.items as Array<any>;
    const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0);
    const discount = Math.max(0, Number(orderPayload.discountAmount || 0));
    const grand = Math.max(0, subtotal - discount);

    const { data: orderRow, error: orderErr } = await supabase
      .from("customer_orders")
      .insert({
        customer_name: orderPayload.customerName,
        customer_phone: orderPayload.customerPhone,
        customer_email: orderPayload.customerEmail || null,
        delivery_address: orderPayload.deliveryAddress,
        payment_method: "online",
        payment_status: "paid",
        subtotal,
        discount_amount: discount,
        grand_total: grand,
        voucher_id: orderPayload.voucherId || null,
        voucher_code: orderPayload.voucherCode || null,
        admin_notes: `Razorpay payment_id: ${razorpay_payment_id}`,
      })
      .select("*")
      .single();

    if (orderErr) {
      console.error(orderErr);
      return new Response(JSON.stringify({ error: orderErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemsPayload = items.map((i) => ({
      order_id: orderRow.id,
      product_id: i.productId,
      product_code: i.productCode,
      product_name: i.productName,
      unit_price: Number(i.unitPrice),
      quantity: Number(i.quantity),
      line_total: Number(i.unitPrice) * Number(i.quantity),
    }));

    const { error: itemsErr } = await supabase.from("customer_order_items").insert(itemsPayload);
    if (itemsErr) {
      console.error(itemsErr);
      return new Response(JSON.stringify({ error: itemsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ orderId: orderRow.order_id, id: orderRow.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
