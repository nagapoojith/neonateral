import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  english: "Respond in English.",
  hindi: "Respond entirely in Hindi (हिन्दी). Use Devanagari script only.",
  tamil: "Respond entirely in Tamil (தமிழ்). Use Tamil script only.",
  telugu: "Respond entirely in Telugu (తెలుగు). Use Telugu script only.",
  malayalam: "Respond entirely in Malayalam (മലയാളം). Use Malayalam script only.",
};

const SYSTEM_PROMPT = `You are a friendly, warm, and supportive baby care assistant for new parents.

CRITICAL RESPONSE RULES:
1. Keep responses SHORT - maximum 6 lines or 4-5 sentences
2. Use SIMPLE, non-technical language that any parent can understand
3. Be warm, reassuring, and supportive in tone
4. Focus on practical, actionable guidance
5. Use bullet points for multiple tips (max 3-4 bullets)
6. Never provide specific medical diagnoses or prescribe medications
7. For concerning symptoms, briefly recommend consulting a doctor

TOPICS YOU HELP WITH:
- Feeding (breastfeeding, formula, amounts, schedules)
- Sleep (safe positions, patterns, routines)
- Crying & soothing techniques
- Bathing & hygiene
- Temperature & fever basics
- Common rashes & skin care
- Growth & development milestones
- Vaccination awareness

RESPONSE STYLE:
- Start with a brief acknowledgment or reassurance
- Give 1-2 key points or quick tips
- End with a supportive note
- Keep it conversational and calming

IMPORTANT - EMERGENCY & HOSPITAL REQUESTS:
If the user mentions ANY of these keywords: "emergency", "hospital", "nearest hospital", "urgent", "ambulance", "critical", "serious", "breathing difficulty", "not breathing", "unconscious", "seizure", "choking", "severe bleeding", "high fever", "blue lips", "emergency room", "ER", "help me find hospital", or asks for directions to a hospital:

You MUST respond with EXACTLY this format (include the special tag):
"I understand this is urgent. Please use the 'Find Hospitals' button above or click the link below to find the nearest hospital with directions from your current location.

[SHOW_HOSPITAL_MAP]

If this is a life-threatening emergency, please call emergency services (911/108/102) immediately."

The [SHOW_HOSPITAL_MAP] tag is essential - it triggers the hospital map feature in the app.

IMPORTANT:
- You are in GENERAL GUIDANCE MODE
- You do NOT have access to any specific baby's medical records
- If asked about specific test results or medical history, politely explain you provide general guidance only
- For serious symptoms, briefly advise seeking medical care AND include [SHOW_HOSPITAL_MAP]

Remember: Parents are often tired and worried. Be their calm, supportive guide.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = "english", isGeneralMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build language-specific system prompt
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english;
    const systemPromptWithLang = `${SYSTEM_PROMPT}\n\nLANGUAGE INSTRUCTION: ${languageInstruction}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPromptWithLang },
          ...messages,
        ],
        stream: true,
        max_tokens: 500, // Shorter responses
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
