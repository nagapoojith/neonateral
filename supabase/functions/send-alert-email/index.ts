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
  babyId?: string;
  bedNumber: string;
  alertType: "normal" | "high" | "critical";
  message: string;
  triggerReason?: string;
  timestamp: string;
  vitals?: {
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    movement?: number;
    sleepingPosition?: string;
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
    case "critical": return { main: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#991b1b" };
    case "high": return { main: "#f59e0b", bg: "#fffbeb", border: "#fde68a", text: "#92400e" };
    default: return { main: "#10b981", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" };
  }
};

const getAlertEmoji = (type: string) => {
  switch (type) {
    case "critical": return "🚨";
    case "high": return "⚠️";
    default: return "ℹ️";
  }
};

const getPositionLabel = (position?: string) => {
  switch (position) {
    case "back": return "Back (Safe)";
    case "side": return "Side (Caution)";
    case "prone": return "Prone (Unsafe)";
    default: return "Unknown";
  }
};

const getPositionColor = (position?: string) => {
  switch (position) {
    case "back": return "#10b981";
    case "side": return "#f59e0b";
    case "prone": return "#dc2626";
    default: return "#6b7280";
  }
};

// Generate AI content using Lovable AI Gateway
async function generateAIContent(
  request: AlertEmailRequest,
  apiKey: string
): Promise<GeneratedContent> {
  console.log("Generating AI content for alert...");

  const systemPrompt = `You are an AI assistant for a neonatal intensive care unit (NICU) monitoring system. 
Generate clear, professional, and medically appropriate alert content.
Keep responses calm but urgent when necessary. Use medical terminology appropriately.
This is for the Neonatal Monitoring System only - isolated implementation.`;

  const vitalsInfo = request.vitals 
    ? `Current Vitals:
- Heart Rate: ${request.vitals.heartRate ?? 'N/A'} BPM
- SpO₂: ${request.vitals.spo2 ?? 'N/A'}%
- Temperature: ${request.vitals.temperature ?? 'N/A'}°C
- Movement: ${request.vitals.movement ?? 'N/A'}%
- Sleeping Position: ${getPositionLabel(request.vitals.sleepingPosition)}`
    : 'No vitals data available';

  const userPrompt = `Generate alert content for:
Patient: ${request.babyName} | Bed: ${request.bedNumber}
Alert Type: ${request.alertType.toUpperCase()}
Alert Reason: ${request.triggerReason || request.message}
Time: ${request.timestamp}

${vitalsInfo}

Provide a JSON response with these exact fields:
{"title":"A clear alert title mentioning the baby name and issue","medicalExplanation":"A 2-3 sentence medical explanation of why this is concerning and what it might indicate","riskLevel":"Either 'Immediate Attention Required', 'Close Monitoring Needed', or 'Routine Check Advised'","recommendation":"Specific actionable steps the medical staff should take","closingMessage":"A brief professional closing"}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";
    console.log("AI response received:", text.substring(0, 200));
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse AI response");
  } catch (error) {
    console.log("AI generation failed, using fallback:", error);
    // Fallback content with more detail
    const reason = request.triggerReason || request.message;
    return {
      title: `${request.alertType.toUpperCase()} Alert - ${request.babyName} (Bed ${request.bedNumber})`,
      medicalExplanation: `An automatic alert was triggered: ${reason}. This requires immediate assessment by medical staff to ensure patient safety and proper care.`,
      riskLevel: request.alertType === 'critical' ? 'Immediate Attention Required' : 
                 request.alertType === 'high' ? 'Close Monitoring Needed' : 'Routine Check Advised',
      recommendation: request.alertType === 'critical' 
        ? 'Immediately assess the patient. Check all vital signs manually and prepare for potential intervention.'
        : 'Review patient status and vital signs. Document findings and continue monitoring.',
      closingMessage: 'This is an automated alert from the NeoGuard Neonatal Monitoring System. Please respond according to NICU protocols.'
    };
  }
}

// Generate premium HTML email template with all required data
function generatePremiumEmailHTML(
  request: AlertEmailRequest,
  content: GeneratedContent
): string {
  const colors = getAlertColor(request.alertType);
  const emoji = getAlertEmoji(request.alertType);
  const alertLabel = request.alertType.toUpperCase();
  
  // Ensure we have all vital data with fallbacks
  const heartRate = request.vitals?.heartRate ?? '—';
  const spo2 = request.vitals?.spo2 ?? '—';
  const temperature = request.vitals?.temperature ?? '—';
  const movement = request.vitals?.movement ?? '—';
  const sleepingPosition = request.vitals?.sleepingPosition || 'unknown';
  const positionLabel = getPositionLabel(sleepingPosition);
  const positionColor = getPositionColor(sleepingPosition);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoGuard Alert - ${request.babyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  
  <!-- Main Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        
        <!-- Email Card -->
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%); padding: 32px 28px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background: rgba(255,255,255,0.2); width: 56px; height: 56px; border-radius: 14px; display: inline-block; line-height: 56px; margin-bottom: 12px;">
                      <span style="font-size: 28px;">🏥</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">NeoGuard NICU</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 14px;">Neonatal Monitoring System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Title Banner - CRITICAL: This must be at the TOP -->
          <tr>
            <td style="padding: 0 28px;">
              <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 14px; padding: 20px; margin-top: -16px; position: relative;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <span style="font-size: 32px; vertical-align: middle;">${emoji}</span>
                      <span style="color: ${colors.main}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-left: 10px; vertical-align: middle;">${alertLabel} PRIORITY ALERT</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px;">
                      <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.4;">${content.title}</h2>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Alert Reason - CRITICAL: Must clearly state WHY the alert was triggered -->
          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.main}; border-radius: 8px; padding: 16px 20px;">
                <p style="color: ${colors.text}; margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  ⚡ Alert Trigger Reason
                </p>
                <p style="color: #1e293b; margin: 0; font-size: 15px; font-weight: 500; line-height: 1.5;">${request.triggerReason || request.message}</p>
              </div>
            </td>
          </tr>

          <!-- Patient Details Card - Baby Name & ID -->
          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px;">
                <p style="color: #64748b; margin: 0 0 14px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  👶 Patient Information
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #64748b; font-size: 13px;">Baby Name</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                      <span style="color: #0f172a; font-size: 15px; font-weight: 700;">${request.babyName}</span>
                    </td>
                  </tr>
                  ${request.babyId ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #64748b; font-size: 13px;">Patient ID</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                      <span style="color: #475569; font-size: 13px; font-family: monospace;">${request.babyId.substring(0, 8)}...</span>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #64748b; font-size: 13px;">Bed Number</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                      <span style="color: #0f172a; font-size: 15px; font-weight: 600;">${request.bedNumber}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #64748b; font-size: 13px;">Alert Time</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #0f172a; font-size: 14px; font-weight: 500;">${request.timestamp}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Vital Signs Card - CRITICAL: Must show ALL vitals with actual values -->
          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 14px; padding: 20px;">
                <p style="color: #64748b; margin: 0 0 16px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  ❤️ Current Vital Signs
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <!-- Heart Rate -->
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <div style="background-color: #fef2f2; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px;">
                              <span style="font-size: 18px;">❤️</span>
                            </div>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <span style="color: #64748b; font-size: 13px; display: block;">Heart Rate</span>
                            <span style="color: #ef4444; font-size: 20px; font-weight: 700;">${heartRate} <span style="font-size: 13px; font-weight: 400; color: #94a3b8;">BPM</span></span>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <span style="color: #94a3b8; font-size: 12px;">Normal: 120-160</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- SpO2 -->
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <div style="background-color: #eff6ff; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px;">
                              <span style="font-size: 18px;">💨</span>
                            </div>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <span style="color: #64748b; font-size: 13px; display: block;">SpO₂ (Oxygen)</span>
                            <span style="color: #3b82f6; font-size: 20px; font-weight: 700;">${spo2} <span style="font-size: 13px; font-weight: 400; color: #94a3b8;">%</span></span>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <span style="color: #94a3b8; font-size: 12px;">Normal: 95-100%</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Temperature -->
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <div style="background-color: #fffbeb; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px;">
                              <span style="font-size: 18px;">🌡️</span>
                            </div>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <span style="color: #64748b; font-size: 13px; display: block;">Body Temperature</span>
                            <span style="color: #f59e0b; font-size: 20px; font-weight: 700;">${temperature} <span style="font-size: 13px; font-weight: 400; color: #94a3b8;">°C</span></span>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <span style="color: #94a3b8; font-size: 12px;">Normal: 36.5-37.5°C</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Sleeping Position -->
                  <tr>
                    <td style="padding: 10px 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <div style="background-color: #f0fdf4; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px;">
                              <span style="font-size: 18px;">🛏️</span>
                            </div>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <span style="color: #64748b; font-size: 13px; display: block;">Sleeping Position</span>
                            <span style="color: ${positionColor}; font-size: 18px; font-weight: 700;">${positionLabel}</span>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <span style="color: #94a3b8; font-size: 12px;">Safe: Back</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- AI Medical Explanation -->
          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #f8fafc; border-radius: 14px; padding: 20px; border-left: 4px solid #0ea5e9;">
                <p style="color: #0369a1; margin: 0 0 10px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  🧠 AI Medical Assessment
                </p>
                <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.7;">${content.medicalExplanation}</p>
              </div>
            </td>
          </tr>

          <!-- Risk Level & Recommended Action -->
          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background: linear-gradient(135deg, ${colors.bg} 0%, #ffffff 100%); border: 2px solid ${colors.border}; border-radius: 14px; padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <span style="display: inline-block; background-color: ${colors.main}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 20px;">
                        ⚠️ ${content.riskLevel}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 14px;">
                      <p style="color: #0f172a; margin: 0; font-size: 14px; font-weight: 600;">Recommended Action:</p>
                      <p style="color: #475569; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">${content.recommendation}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 24px;">
              <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">${content.closingMessage}</p>
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                NeoGuard NICU Monitoring System • Powered by AI
              </p>
              <p style="color: #cbd5e1; margin: 16px 0 0 0; font-size: 11px;">
                This email was generated automatically at ${request.timestamp}. Please respond according to hospital protocols.
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log("BREVO_API_KEY configured:", BREVO_API_KEY ? "YES (length: " + BREVO_API_KEY.length + ")" : "NO");
    console.log("LOVABLE_API_KEY configured:", LOVABLE_API_KEY ? "YES" : "NO");
    
    if (!BREVO_API_KEY) {
      console.error("ERROR: BREVO_API_KEY is not configured");
      throw new Error("Email service not configured - missing BREVO_API_KEY");
    }

    const requestBody: AlertEmailRequest = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));
    
    const { to, babyName, babyId, bedNumber, alertType, message, triggerReason, timestamp, vitals } = requestBody;
    
    // Validate required data
    if (!babyName || !bedNumber || !alertType || !timestamp) {
      console.error("Missing required fields in request");
      throw new Error("Missing required email data: babyName, bedNumber, alertType, or timestamp");
    }
    
    console.log(`Preparing to send ${alertType} alert email`);
    console.log(`  Recipient: ${to}`);
    console.log(`  Baby: ${babyName} (ID: ${babyId || 'N/A'})`);
    console.log(`  Bed: ${bedNumber}`);
    console.log(`  Trigger Reason: ${triggerReason || message}`);
    console.log(`  Vitals: HR=${vitals?.heartRate}, SpO2=${vitals?.spo2}, Temp=${vitals?.temperature}, Position=${vitals?.sleepingPosition}`);

    // Generate AI content if Lovable API key is available
    let aiContent: GeneratedContent;
    if (LOVABLE_API_KEY) {
      console.log("Generating AI-powered email content via Lovable AI Gateway...");
      aiContent = await generateAIContent(requestBody, LOVABLE_API_KEY);
      console.log("AI content generated successfully");
    } else {
      console.log("Lovable AI not configured, using default content");
      const reason = triggerReason || message;
      aiContent = {
        title: `${alertType.toUpperCase()} Alert for ${babyName} - Bed ${bedNumber}`,
        medicalExplanation: `An automatic alert was triggered: ${reason}. This requires immediate assessment by medical staff to ensure patient safety.`,
        riskLevel: alertType === 'critical' ? 'Immediate Attention Required' : 
                   alertType === 'high' ? 'Close Monitoring Needed' : 'Routine Check Advised',
        recommendation: alertType === 'critical' 
          ? 'Immediately assess the patient. Check all vital signs manually and prepare for potential intervention.'
          : 'Review patient status and vital signs. Document findings and continue monitoring.',
        closingMessage: 'This is an automated alert from the NeoGuard Neonatal Monitoring System.'
      };
    }

    // Generate premium HTML email with all data
    const htmlContent = generatePremiumEmailHTML(requestBody, aiContent);

    // Verified sender email
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

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const responseBody = await emailResponse.text();
    
    console.log("=== BREVO API RESPONSE ===");
    console.log(`  Status: ${emailResponse.status}`);
    console.log(`  Status Text: ${emailResponse.statusText}`);
    console.log(`  Response Body: ${responseBody}`);

    if (!emailResponse.ok) {
      console.error("Brevo API error:", emailResponse.status, responseBody);
      throw new Error(`Failed to send email: ${emailResponse.status} - ${responseBody}`);
    }

    const result = JSON.parse(responseBody);
    console.log("=== EMAIL SENT SUCCESSFULLY ===");
    console.log(`  Message ID: ${result.messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        details: {
          recipient: to,
          babyName,
          alertType,
          triggerReason: triggerReason || message,
          vitalsIncluded: !!vitals
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("=== ERROR IN SEND-ALERT-EMAIL ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
