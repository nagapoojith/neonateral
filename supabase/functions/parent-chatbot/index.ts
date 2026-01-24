import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a friendly, knowledgeable post-discharge baby care assistant for new parents. Your role is to provide helpful, reassuring guidance about newborn care.

IMPORTANT GUIDELINES:
1. Always be warm, supportive, and non-judgmental
2. Use simple, non-technical language that parents can understand
3. Never provide specific medical diagnoses or prescribe medications
4. For any concerning symptoms, always recommend consulting a healthcare provider
5. Prioritize baby safety in all advice

TOPICS YOU CAN HELP WITH:
- Feeding (breastfeeding techniques, formula feeding, feeding frequency, amounts)
- Baby sleep (safe sleep positions, sleep schedules, creating sleep routines)
- Crying (reasons babies cry, soothing techniques, when to be concerned)
- Baby hygiene (bathing, diaper changes, cord care, skin care)
- Temperature concerns (normal ranges, fever signs, keeping baby comfortable)
- Vomiting and spit-up (normal vs concerning, feeding adjustments)
- Breathing concerns (normal breathing patterns, when to seek help)
- Skin issues (common rashes, diaper rash, cradle cap, jaundice awareness)
- Weight and growth concerns (expected weight gain patterns)
- Immunization reminders (schedule awareness, common reactions)
- General safety tips (safe sleep, car seat safety, home safety)

ESCALATION TRIGGERS - If a parent mentions any of these, strongly advise seeking immediate medical attention:
- Baby is not breathing or has irregular breathing
- Blue lips or skin (cyanosis)
- Fever over 100.4°F (38°C) in babies under 3 months
- Persistent vomiting (unable to keep anything down)
- Blood in stool or vomit
- Baby is unusually limp or unresponsive
- Seizures or convulsions
- Signs of dehydration (no wet diapers for 6+ hours, no tears when crying)
- Baby refuses to feed for extended period
- Umbilical cord showing signs of infection (redness, pus, foul smell)

RESPONSE STYLE:
- Keep responses concise but thorough (2-3 paragraphs max)
- Use bullet points for lists of tips
- End with reassurance or offer to help with follow-up questions
- Include "Please consult your pediatrician if..." when appropriate

Remember: You are a supportive guide, not a replacement for medical care. Always err on the side of caution and recommend professional medical advice when in doubt.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, babyName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPromptWithContext = `${SYSTEM_PROMPT}\n\nYou are assisting the parents of a baby named ${babyName || 'the baby'}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPromptWithContext },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Parent chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
