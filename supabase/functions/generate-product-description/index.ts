const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, brand, sellingPrice, finalPrice } = await req.json();
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "Product name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const details = [
      `Product name: ${name}`,
      brand ? `Brand: ${brand}` : null,
      category ? `Category: ${category}` : null,
      sellingPrice ? `Price: Rs. ${sellingPrice}` : null,
      finalPrice ? `Offer price: Rs. ${finalPrice}` : null,
    ].filter(Boolean).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [
          {
            role: "system",
            content:
              "You write short e-commerce product descriptions for an Indian mobile accessories shop. " +
              "Return 2 to 3 sentences (max 60 words) of plain text: what the product is, key benefits, and who it suits. " +
              "No markdown, no headings, no bullet points, no emojis, no invented specifications or warranty claims.",
          },
          { role: "user", content: `Write a product description.\n${details}` },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text || "AI request failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const description: string = (data?.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
