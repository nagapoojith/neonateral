// OpenAI usage for Neonatal Alerts only
// This function generates intelligent medical alert content using OpenAI
// Isolated implementation - does not share state with any other project

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertContentRequest {
  babyName: string;
  bedNumber: string;
  alertType: "normal" | "high" | "critical";
  message: string;
  vitals?: {
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    movement?: number;
  };
  timestamp: string;
}

interface GeneratedContent {
  title: string;
  medicalExplanation: string;
  riskLevel: string;
  recommendation: string;
  closingMessage: string;
}

serve(async (req) => {
  console.log("=== GENERATE ALERT CONTENT STARTED ===");
  console.log("Request method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    console.log("OPENAI_API_KEY configured:", OPENAI_API_KEY ? "YES" : "NO");
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error("AI service not configured - missing OPENAI_API_KEY");
    }

    const requestBody: AlertContentRequest = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));

    const { babyName, bedNumber, alertType, message, vitals, timestamp } = requestBody;

    // Build the prompt for OpenAI - Neonatal Alert specific
    const systemPrompt = `You are an AI assistant for a neonatal intensive care unit (NICU) monitoring system. 
Your role is to generate clear, professional, and medically appropriate alert content for healthcare staff.
Keep responses calm but urgent when necessary. Use medical terminology appropriately but keep explanations accessible.
Never provide medical advice - only observations and recommendations to seek professional assessment.
This is for the Neonatal Monitoring System - completely isolated from any other systems.`;

    const userPrompt = `Generate alert content for a neonatal patient alert:

Patient: ${babyName}
Bed Number: ${bedNumber}
Alert Type: ${alertType.toUpperCase()}
Alert Message: ${message}
Timestamp: ${timestamp}
${vitals ? `
Current Vitals:
- Heart Rate: ${vitals.heartRate || 'Not available'} BPM
- Oxygen Saturation (SpO2): ${vitals.spo2 || 'Not available'}%
- Temperature: ${vitals.temperature || 'Not available'}°C
- Movement Level: ${vitals.movement || 'Not available'}/10
` : 'Vitals data not available'}

Please provide:
1. A clear alert title (include what the issue is and why it was triggered)
2. A brief medical explanation (2-3 sentences, calm but informative)
3. Risk level classification (Normal Monitoring / Close Observation / Immediate Attention Required)
4. A short actionable recommendation for medical staff
5. A professional closing statement

Format your response as JSON with these exact keys:
{
  "title": "...",
  "medicalExplanation": "...",
  "riskLevel": "...",
  "recommendation": "...",
  "closingMessage": "..."
}`;

    console.log("Calling OpenAI API...");

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent medical content
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    console.log("OpenAI response received");

    const generatedText = openAIData.choices[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error("No content generated from OpenAI");
    }

    // Parse the JSON response from OpenAI
    let generatedContent: GeneratedContent;
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract JSON from response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Fallback content if parsing fails
      generatedContent = {
        title: `${alertType.toUpperCase()} Alert - ${babyName}`,
        medicalExplanation: message,
        riskLevel: alertType === 'critical' ? 'Immediate Attention Required' : 
                   alertType === 'high' ? 'Close Observation' : 'Normal Monitoring',
        recommendation: 'Please assess the patient as per standard protocols.',
        closingMessage: 'This is an automated alert from the Neonatal Monitoring System.'
      };
    }

    console.log("=== CONTENT GENERATED SUCCESSFULLY ===");
    console.log("Generated title:", generatedContent.title);

    return new Response(JSON.stringify(generatedContent), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("=== ERROR IN GENERATE-ALERT-CONTENT ===");
    console.error("Error:", error.message);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
