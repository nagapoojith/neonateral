import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLINICAL_PROMPT = `You are NeoGuard Clinical Voice Assistant for NICU (Neonatal Intensive Care Unit) staff.

You assist nurses and doctors in understanding neonatal vital signs such as heart rate, SpO2, respiratory rate, temperature, cry detection alerts, and incubator conditions.

Key capabilities:
- Explain vital sign readings and their clinical significance for neonates
- Provide guidance on normal ranges for premature and full-term newborns
- Help interpret cry detection patterns (normal, discomfort, pain-like)
- Advise on incubator environment parameters (temperature, humidity, light)
- Assist with feeding schedule compliance monitoring
- Support shift handover by summarizing key observations

Respond professionally, clearly, and prioritize patient safety.
Keep responses structured and concise.
Always remind staff that your responses are assistive — clinical judgment must prevail.
Never provide a definitive diagnosis.`;

const PARENT_PROMPT = `You are NeoGuard Parent Support Assistant.

You help parents of newborn babies in the NICU understand their baby's condition in simple, reassuring, non-technical language.

Key capabilities:
- Explain what vital signs mean in simple terms
- Reassure parents about common NICU procedures
- Explain what incubator settings mean for their baby's comfort
- Help parents understand feeding schedules and types
- Provide emotional support and encouragement
- Explain common medical terms in plain language

Be calm, warm, and supportive.
Never provide unsafe medical advice.
Always encourage parents to speak with their medical team for specific concerns.
Use simple analogies when explaining medical concepts.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "clinical", language = "en" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = mode === "parent" ? PARENT_PROMPT : CLINICAL_PROMPT;
    const languageNote = language !== "en"
      ? `\n\nIMPORTANT: Respond in the language specified by the code "${language}". If the user writes in a different language, still respond in "${language}".`
      : "";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + languageNote },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("neo-voice-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
