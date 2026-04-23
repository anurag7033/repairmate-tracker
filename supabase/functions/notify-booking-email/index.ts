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
  // base64url encode
  const b64 = btoa(unescape(encodeURIComponent(message)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

    const booking = await req.json();

    const subject = `🔔 New Booking: ${booking.booking_id} – ${booking.customer_name}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
        <div style="background:#f97316;color:#fff;padding:16px 20px">
          <h2 style="margin:0;font-size:18px">New Repair Booking Received</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.9">Booking ID: <strong>${booking.booking_id}</strong></p>
        </div>
        <div style="padding:20px;color:#333;font-size:14px;line-height:1.6">
          <h3 style="margin:0 0 8px;color:#f97316;font-size:15px">Customer</h3>
          <p style="margin:0 0 12px">
            <strong>${booking.customer_name}</strong><br/>
            📞 ${booking.customer_phone}${booking.alternate_phone ? ` / ${booking.alternate_phone}` : ''}<br/>
            ${booking.customer_email ? `✉️ ${booking.customer_email}<br/>` : ''}
            📍 ${booking.full_address}, ${booking.city} - ${booking.pincode}
          </p>

          <h3 style="margin:0 0 8px;color:#f97316;font-size:15px">Device</h3>
          <p style="margin:0 0 12px">
            ${booking.device_type?.toUpperCase()} – ${booking.device_brand} ${booking.device_model}<br/>
            ${booking.imei_serial ? `IMEI/Serial: ${booking.imei_serial}<br/>` : ''}
          </p>

          <h3 style="margin:0 0 8px;color:#f97316;font-size:15px">Issue</h3>
          <p style="margin:0 0 12px">
            <strong>${booking.issue_type}</strong><br/>
            ${booking.issue_description}
          </p>

          <h3 style="margin:0 0 8px;color:#f97316;font-size:15px">Service</h3>
          <p style="margin:0 0 12px">
            Type: ${booking.service_type}<br/>
            Date: ${booking.preferred_date || '—'} | Slot: ${booking.preferred_time_slot || '—'}<br/>
            Payment: ${booking.payment_method}
          </p>

          <div style="background:#fff7ed;padding:12px;border-radius:6px;margin-top:16px;font-size:12px;color:#9a3412">
            Login to admin dashboard to manage this booking.
          </div>
        </div>
      </div>
    `;

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
    console.error('notify-booking-email error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
