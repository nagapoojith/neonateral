// OpenAI usage for Neonatal Alerts only
// This function sends AI-generated alert emails via Brevo
// Isolated implementation - completely separate from other projects

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  to: string;
  babyName: string;
  bedNumber: string;
  alertType: "normal" | "high" | "critical";
  message: string;
  timestamp: string;
  vitals?: {
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    movement?: number;
  };
}

interface GeneratedContent {
  title: string;
  medicalExplanation: string;
  riskLevel: string;
  recommendation: string;
  closingMessage: string;
}

const getAlertColor = (type: string) => {
  switch (type) {
    case "critical": return { main: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    case "high": return { main: "#f59e0b", bg: "#fffbeb", border: "#fde68a" };
    default: return { main: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" };
  }
};

const getAlertEmoji = (type: string) => {
  switch (type) {
    case "critical": return "🚨";
    case "high": return "⚠️";
    default: return "ℹ️";
  }
};

// Generate AI content using OpenAI
async function generateAIContent(
  request: AlertEmailRequest,
  openAIKey: string
): Promise<GeneratedContent> {
  console.log("Generating AI content for alert...");

  const systemPrompt = `You are an AI assistant for a neonatal intensive care unit (NICU) monitoring system. 
Generate clear, professional, and medically appropriate alert content.
Keep responses calm but urgent when necessary. Use medical terminology appropriately.
This is for the Neonatal Monitoring System only - isolated implementation.`;

  const userPrompt = `Generate alert content for:
Patient: ${request.babyName} | Bed: ${request.bedNumber}
Alert Type: ${request.alertType.toUpperCase()}
Message: ${request.message}
Time: ${request.timestamp}
${request.vitals ? `Vitals - HR: ${request.vitals.heartRate || 'N/A'} BPM, SpO2: ${request.vitals.spo2 || 'N/A'}%, Temp: ${request.vitals.temperature || 'N/A'}°C` : ''}

Provide JSON response:
{"title":"...","medicalExplanation":"...","riskLevel":"...","recommendation":"...","closingMessage":"..."}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse AI response");
  } catch (error) {
    console.log("AI generation failed, using fallback:", error);
    // Fallback content
    return {
      title: `${request.alertType.toUpperCase()} Alert - ${request.babyName}`,
      medicalExplanation: request.message,
      riskLevel: request.alertType === 'critical' ? 'Immediate Attention Required' : 
                 request.alertType === 'high' ? 'Close Observation Needed' : 'Standard Monitoring',
      recommendation: 'Please assess the patient according to standard NICU protocols.',
      closingMessage: 'This is an automated alert from the NeoGuard Monitoring System.'
    };
  }
}

// Generate premium HTML email template
function generatePremiumEmailHTML(
  request: AlertEmailRequest,
  content: GeneratedContent
): string {
  const colors = getAlertColor(request.alertType);
  const emoji = getAlertEmoji(request.alertType);
  const alertLabel = request.alertType.toUpperCase();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoGuard Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  
  <!-- Main Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%); padding: 40px 32px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background: rgba(255,255,255,0.15); width: 64px; height: 64px; border-radius: 16px; display: inline-block; line-height: 64px; margin-bottom: 16px;">
                      <span style="font-size: 32px;">🏥</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">NeoGuard NICU</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 15px;">Neonatal Monitoring System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 16px; padding: 20px 24px; margin-top: -20px; position: relative;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <span style="font-size: 28px; vertical-align: middle;">${emoji}</span>
                      <span style="color: ${colors.main}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-left: 12px; vertical-align: middle;">${alertLabel} PRIORITY ALERT</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px;">
                      <h2 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600; line-height: 1.4;">${content.title}</h2>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- AI Medical Explanation -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <div style="background-color: #f1f5f9; border-radius: 16px; padding: 24px; border-left: 4px solid ${colors.main};">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  🧠 AI Medical Assessment
                </p>
                <p style="color: #334155; margin: 0; font-size: 15px; line-height: 1.7;">${content.medicalExplanation}</p>
              </div>
            </td>
          </tr>

          <!-- Patient & Vitals Info -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Patient Info Card -->
                  <td width="48%" valign="top">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
                      <p style="color: #64748b; margin: 0 0 16px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        👶 Patient Details
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                            <span style="color: #94a3b8; font-size: 13px;">Name</span>
                          </td>
                          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                            <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${request.babyName}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                            <span style="color: #94a3b8; font-size: 13px;">Bed</span>
                          </td>
                          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                            <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${request.bedNumber}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #94a3b8; font-size: 13px;">Time</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #1e293b; font-size: 13px; font-weight: 500;">${request.timestamp}</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  
                  <td width="4%"></td>
                  
                  <!-- Vitals Card -->
                  <td width="48%" valign="top">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
                      <p style="color: #64748b; margin: 0 0 16px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        ❤️ Vital Signs
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 6px 0;">
                            <span style="color: #94a3b8; font-size: 13px;">Heart Rate</span>
                          </td>
                          <td style="padding: 6px 0; text-align: right;">
                            <span style="color: #ef4444; font-size: 14px; font-weight: 600;">${request.vitals?.heartRate || '—'} <span style="font-weight: 400; font-size: 12px;">BPM</span></span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0;">
                            <span style="color: #94a3b8; font-size: 13px;">SpO₂</span>
                          </td>
                          <td style="padding: 6px 0; text-align: right;">
                            <span style="color: #0ea5e9; font-size: 14px; font-weight: 600;">${request.vitals?.spo2 || '—'}<span style="font-weight: 400; font-size: 12px;">%</span></span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0;">
                            <span style="color: #94a3b8; font-size: 13px;">Temperature</span>
                          </td>
                          <td style="padding: 6px 0; text-align: right;">
                            <span style="color: #f59e0b; font-size: 14px; font-weight: 600;">${request.vitals?.temperature || '—'}<span style="font-weight: 400; font-size: 12px;">°C</span></span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0;">
                            <span style="color: #94a3b8; font-size: 13px;">Movement</span>
                          </td>
                          <td style="padding: 6px 0; text-align: right;">
                            <span style="color: #10b981; font-size: 14px; font-weight: 600;">${request.vitals?.movement || '—'}<span style="font-weight: 400; font-size: 12px;">/10</span></span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Risk Level & Action -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <div style="background: linear-gradient(135deg, ${colors.bg} 0%, #ffffff 100%); border: 2px solid ${colors.border}; border-radius: 16px; padding: 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <span style="display: inline-block; background-color: ${colors.main}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 12px; border-radius: 20px; margin-bottom: 12px;">
                        ⚠️ ${content.riskLevel}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px;">
                      <p style="color: #1e293b; margin: 0; font-size: 15px; font-weight: 600;">Recommended Action:</p>
                      <p style="color: #475569; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">${content.recommendation}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 32px;">
              <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">${content.closingMessage}</p>
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                NeoGuard NICU Monitoring System • Powered by AI
              </p>
              <p style="color: #cbd5e1; margin: 16px 0 0 0; font-size: 11px;">
                This email was generated automatically. Please respond according to hospital protocols.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== SEND ALERT EMAIL FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API keys at runtime
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    console.log("BREVO_API_KEY configured:", BREVO_API_KEY ? "YES (length: " + BREVO_API_KEY.length + ")" : "NO");
    console.log("OPENAI_API_KEY configured:", OPENAI_API_KEY ? "YES" : "NO");
    
    if (!BREVO_API_KEY) {
      console.error("ERROR: BREVO_API_KEY is not configured");
      throw new Error("Email service not configured - missing BREVO_API_KEY");
    }

    const requestBody: AlertEmailRequest = await req.json();
    console.log("Request body received:", JSON.stringify({ ...requestBody, message: requestBody.message.substring(0, 50) + "..." }));
    
    const { to, babyName, bedNumber, alertType, message, timestamp, vitals } = requestBody;
    
    console.log(`Preparing to send ${alertType} alert email`);
    console.log(`  Recipient: ${to}`);
    console.log(`  Baby: ${babyName}`);
    console.log(`  Bed: ${bedNumber}`);

    // Generate AI content if OpenAI key is available
    let aiContent: GeneratedContent;
    if (OPENAI_API_KEY) {
      console.log("Generating AI-powered email content...");
      aiContent = await generateAIContent(requestBody, OPENAI_API_KEY);
      console.log("AI content generated successfully");
    } else {
      console.log("OpenAI not configured, using default content");
      aiContent = {
        title: `${alertType.toUpperCase()} Alert for ${babyName}`,
        medicalExplanation: message,
        riskLevel: alertType === 'critical' ? 'Immediate Attention Required' : 
                   alertType === 'high' ? 'Close Observation Needed' : 'Standard Monitoring',
        recommendation: 'Please assess the patient according to standard NICU protocols.',
        closingMessage: 'This is an automated alert from the NeoGuard Monitoring System.'
      };
    }

    // Generate premium HTML email
    const htmlContent = generatePremiumEmailHTML(requestBody, aiContent);

    // Verified sender email - Using the user's verified Brevo sender
    const senderEmail = "nagapoojithtn@gmail.com";
    const senderName = "NeoGuard NICU Alert";
    
    console.log("=== SENDER CONFIGURATION ===");
    console.log(`  Sender Name: ${senderName}`);
    console.log(`  Sender Email: ${senderEmail}`);

    const emailPayload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [{ email: to }],
      subject: `${getAlertEmoji(alertType)} [${alertType.toUpperCase()}] ${aiContent.title}`,
      htmlContent,
    };

    console.log("=== SENDING EMAIL VIA BREVO API ===");
    console.log(`  API URL: https://api.brevo.com/v3/smtp/email`);
    console.log(`  Subject: ${emailPayload.subject}`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("=== BREVO API RESPONSE ===");
    console.log(`  Status: ${response.status}`);
    console.log(`  Status Text: ${response.statusText}`);

    const responseText = await response.text();
    console.log(`  Response Body: ${responseText}`);

    if (!response.ok) {
      console.error(`ERROR: Brevo API returned ${response.status}`);
      console.error(`Error Details: ${responseText}`);
      throw new Error(`Failed to send email: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log("=== EMAIL SENT SUCCESSFULLY ===");
    console.log(`  Message ID: ${result.messageId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: result.messageId,
      aiGenerated: !!OPENAI_API_KEY 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("=== ERROR IN SEND-ALERT-EMAIL ===");
    console.error(`  Error Type: ${error.constructor.name}`);
    console.error(`  Error Message: ${error.message}`);
    console.error(`  Stack Trace: ${error.stack}`);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
