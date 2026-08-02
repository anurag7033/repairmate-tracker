const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';

function createRawEmail(to: string, subject: string, htmlBody: string): string {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
  ].join('\r\n');
  const b64 = btoa(unescape(encodeURIComponent(message)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAIL_API_KEY = Deno.env.get('GOOGLE_MAIL_API_KEY');
    const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!GOOGLE_MAIL_API_KEY) throw new Error('GOOGLE_MAIL_API_KEY not configured');
    if (!ADMIN_EMAIL) throw new Error('ADMIN_NOTIFICATION_EMAIL not configured');

    const order = await req.json();
    const items: Array<Record<string, unknown>> = Array.isArray(order.items) ? order.items : [];

    const rows = items.map((it) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.product_name ?? ''}<br/>
          <span style="color:#888;font-size:12px">${it.product_code ?? ''}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity ?? ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${inr(it.unit_price)}</td>
      </tr>`).join('');

    const subject = `🛒 New Order: ${order.order_id} – ${order.customer_name} (${inr(order.grand_total)})`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
        <div style="background:#f97316;color:#fff;padding:16px 20px">
          <h2 style="margin:0;font-size:18px">New Online Order Received</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.9">Order ID: <strong>${order.order_id}</strong></p>
        </div>
        <div style="padding:20px;color:#333;font-size:14px;line-height:1.6">
          <h3 style="margin:0 0 8px;color:#f97316;font-size:15px">Customer</h3>
          <p style="margin:0 0 12px">
            <strong>${order.customer_name ?? ''}</strong><br/>
            📞 ${order.customer_phone ?? ''}<br/>
            ${order.customer_email ? `✉️ ${order.customer_email}<br/>` : ''}
            📍 ${order.delivery_address ?? ''}
          </p>

          <h3 style="margin:0 0 8px;color:#f97316;font-size:15px">Items</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#fff7ed;color:#9a3412">
                <th style="padding:6px 8px;text-align:left">Product</th>
                <th style="padding:6px 8px;text-align:center">Qty</th>
                <th style="padding:6px 8px;text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <h3 style="margin:16px 0 8px;color:#f97316;font-size:15px">Payment</h3>
          <p style="margin:0 0 12px">
            Method: <strong>${String(order.payment_method ?? '').toUpperCase()}</strong><br/>
            Subtotal: ${inr(order.subtotal)}<br/>
            ${Number(order.discount_amount || 0) > 0
              ? `Discount${order.voucher_name ? ` (${order.voucher_name})` : ''}${order.voucher_code ? ` [${order.voucher_code}]` : ''}: -${inr(order.discount_amount)}<br/>`
              : ''}
            <strong>Grand Total: ${inr(order.grand_total)}</strong>
          </p>

          <div style="background:#fff7ed;padding:12px;border-radius:6px;margin-top:16px;font-size:12px;color:#9a3412">
            Login to the admin dashboard → Orders to confirm and process this order.
          </div>
        </div>
      </div>`;

    const raw = createRawEmail(ADMIN_EMAIL, subject, html);

    const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAIL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Gmail send failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('notify-order-email error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
