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
    respirationRate?: number;
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
  recommendations: string[];
  closingMessage: string;
}

const getAlertConfig = (type: string) => {
  switch (type) {
    case "critical":
      return {
        emoji: "🚨",
        label: "CRITICAL",
        severityText: "IMMEDIATE ATTENTION REQUIRED",
        colors: { main: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#991b1b" }
      };
    case "high":
      return {
        emoji: "⚠️",
        label: "HIGH PRIORITY",
        severityText: "CLOSE MONITORING NEEDED",
        colors: { main: "#ea580c", bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" }
      };
    default:
      return {
        emoji: "ℹ️",
        label: "NORMAL",
        severityText: "ROUTINE CHECK ADVISED",
        colors: { main: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" }
      };
  }
};

const getVitalStatus = (vital: string, value: number | undefined): { status: string; color: string; isAbnormal: boolean } => {
  if (value === undefined) return { status: "N/A", color: "#6b7280", isAbnormal: false };

  if (vital === "heartRate") {
    if (value < 80 || value > 160) return { status: "CRITICAL", color: "#dc2626", isAbnormal: true };
    if (value < 100 || value > 150) return { status: "WARNING", color: "#ea580c", isAbnormal: true };
    return { status: "NORMAL", color: "#16a34a", isAbnormal: false };
  }

  if (vital === "respirationRate") {
    if (value < 30 || value > 60) return { status: "CRITICAL", color: "#dc2626", isAbnormal: true };
    if (value < 35 || value > 55) return { status: "WARNING", color: "#ea580c", isAbnormal: true };
    return { status: "NORMAL", color: "#16a34a", isAbnormal: false };
  }

  if (vital === "temperature") {
    if (value < 36.0 || value > 37.5) return { status: "CRITICAL", color: "#dc2626", isAbnormal: true };
    if (value < 36.5 || value > 37.2) return { status: "WARNING", color: "#ea580c", isAbnormal: true };
    return { status: "NORMAL", color: "#16a34a", isAbnormal: false };
  }

  if (vital === "spo2") {
    if (value < 90) return { status: "CRITICAL", color: "#dc2626", isAbnormal: true };
    if (value < 94) return { status: "LOW", color: "#ea580c", isAbnormal: true };
    return { status: "NORMAL", color: "#16a34a", isAbnormal: false };
  }

  return { status: "N/A", color: "#6b7280", isAbnormal: false };
};

const getPositionInfo = (position?: string) => {
  switch (position) {
    case "back": return { label: "Supine (Back) ✓", color: "#16a34a", isSafe: true };
    case "side": return { label: "Lateral (Side) ⚠", color: "#ea580c", isSafe: false };
    case "prone": return { label: "Prone (Stomach) ⚠", color: "#dc2626", isSafe: false };
    default: return { label: "Unknown", color: "#6b7280", isSafe: true };
  }
};

const getAbnormalVitals = (vitals?: AlertEmailRequest["vitals"]): string[] => {
  if (!vitals) return [];
  const abnormals: string[] = [];
  
  const hr = getVitalStatus("heartRate", vitals.heartRate);
  if (hr.isAbnormal) abnormals.push(`Heart Rate: ${vitals.heartRate} BPM (${hr.status})`);
  
  const rr = getVitalStatus("respirationRate", vitals.respirationRate);
  if (rr.isAbnormal) abnormals.push(`Respiration Rate: ${vitals.respirationRate}/min (${rr.status})`);
  
  const temp = getVitalStatus("temperature", vitals.temperature);
  if (temp.isAbnormal) abnormals.push(`Temperature: ${vitals.temperature}°C (${temp.status})`);
  
  const spo2 = getVitalStatus("spo2", vitals.spo2);
  if (spo2.isAbnormal) abnormals.push(`SpO₂: ${vitals.spo2}% (${spo2.status})`);
  
  const pos = getPositionInfo(vitals.sleepingPosition);
  if (!pos.isSafe) abnormals.push(`Sleeping Position: ${pos.label}`);
  
  return abnormals;
};

async function generateAIContent(request: AlertEmailRequest, apiKey: string): Promise<GeneratedContent> {
  console.log("Generating AI content for alert...");

  const abnormalVitals = getAbnormalVitals(request.vitals);
  
  const systemPrompt = `You are a clinical decision support AI for a Neonatal ICU monitoring system. Generate clear, professional alert content with actionable recommendations. Use medical terminology appropriately.`;

  const userPrompt = `Generate NICU alert content:

Patient: ${request.babyName} | Bed: ${request.bedNumber}
Alert Type: ${request.alertType.toUpperCase()}
Trigger: ${request.triggerReason || request.message}
Time: ${request.timestamp}

Abnormal Vitals: ${abnormalVitals.length > 0 ? abnormalVitals.join(", ") : "None specified"}

Current Readings:
- Heart Rate: ${request.vitals?.heartRate ?? 'N/A'} BPM (Normal: 100-150)
- Respiration: ${request.vitals?.respirationRate ?? 'N/A'}/min (Normal: 35-55)
- Temperature: ${request.vitals?.temperature ?? 'N/A'}°C (Normal: 36.5-37.2)
- SpO₂: ${request.vitals?.spo2 ?? 'N/A'}% (Normal: 95-100)

Respond with JSON:
{
  "title": "Brief clinical title",
  "medicalExplanation": "2-3 sentence clinical explanation",
  "riskLevel": "${request.alertType === 'critical' ? 'Immediate Attention Required' : 'Close Monitoring Needed'}",
  "recommendations": ["Action 1", "Action 2", "Action 3", "Action 4"],
  "closingMessage": "Professional closing"
}`;

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

    if (!response.ok) throw new Error(`AI Gateway error: ${response.status}`);

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [parsed.recommendation || "Assess patient at bedside"]
      };
    }
    throw new Error("Could not parse AI response");
  } catch (error) {
    console.log("AI generation failed, using fallback:", error);
    return generateFallbackContent(request, abnormalVitals);
  }
}

function generateFallbackContent(request: AlertEmailRequest, abnormalVitals: string[]): GeneratedContent {
  const isCritical = request.alertType === "critical";
  
  return {
    title: `${request.alertType.toUpperCase()} Alert - ${request.babyName}`,
    medicalExplanation: abnormalVitals.length > 0 
      ? `Vital sign deviation detected: ${abnormalVitals.join("; ")}. Immediate clinical assessment recommended.`
      : request.triggerReason || request.message,
    riskLevel: isCritical ? "Immediate Attention Required" : "Close Monitoring Needed",
    recommendations: isCritical ? [
      "Immediately assess patient at bedside",
      "Verify vital signs manually with clinical-grade equipment",
      "Check airway, breathing, and circulation (ABC)",
      "Prepare for potential intervention and notify attending physician"
    ] : [
      "Review patient vital signs and trending data",
      "Perform visual clinical assessment",
      "Document observations in patient chart",
      "Continue enhanced monitoring per protocol"
    ],
    closingMessage: "This is an automated alert from NeoGuard NICU. Verify all findings clinically before intervention."
  };
}

function generateEmailHTML(request: AlertEmailRequest, content: GeneratedContent): string {
  const config = getAlertConfig(request.alertType);
  const abnormalVitals = getAbnormalVitals(request.vitals);
  
  const hrStatus = getVitalStatus("heartRate", request.vitals?.heartRate);
  const rrStatus = getVitalStatus("respirationRate", request.vitals?.respirationRate);
  const tempStatus = getVitalStatus("temperature", request.vitals?.temperature);
  const spo2Status = getVitalStatus("spo2", request.vitals?.spo2);
  const posInfo = getPositionInfo(request.vitals?.sleepingPosition);

  const recommendationsHTML = content.recommendations
    .map((rec, i) => `
      <tr>
        <td style="padding: 8px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="28" valign="top">
                <div style="width: 22px; height: 22px; border-radius: 50%; background-color: ${config.colors.main}; color: white; font-size: 12px; font-weight: bold; text-align: center; line-height: 22px;">${i + 1}</div>
              </td>
              <td style="padding-left: 12px; font-size: 14px; color: #334155; line-height: 1.5;">${rec}</td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

  const abnormalVitalsHTML = abnormalVitals.length > 0 ? `
    <tr>
      <td style="padding: 20px 28px 0;">
        <div style="background-color: ${config.colors.bg}; border: 2px solid ${config.colors.border}; border-left: 6px solid ${config.colors.main}; border-radius: 12px; padding: 16px;">
          <p style="color: ${config.colors.main}; margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
            ⚡ VITALS OUTSIDE NORMAL RANGE
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #0f172a;">
            ${abnormalVitals.map(v => `<li style="margin: 6px 0; font-size: 14px; font-weight: 500;">${v}</li>`).join("")}
          </ul>
        </div>
      </td>
    </tr>
  ` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoGuard NICU Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; background-color: #f8fafc;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c4a6e 0%, #0e7490 100%); padding: 20px 28px; text-align: center;">
              <span style="font-size: 28px;">🏥</span>
              <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 22px; font-weight: 700;">NeoGuard NICU</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 12px;">Neonatal Monitoring System</p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background-color: ${config.colors.main}; padding: 16px 28px; text-align: center;">
              <span style="font-size: 32px;">${config.emoji}</span>
              <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 11px; font-weight: 600; letter-spacing: 2px;">${config.label} ALERT</p>
              <h2 style="color: #ffffff; margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">${config.severityText}</h2>
            </td>
          </tr>

          <!-- Patient Information -->
          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px;">
                <p style="color: #475569; margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  👶 PATIENT INFORMATION
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding: 8px 0;">
                      <p style="color: #64748b; margin: 0; font-size: 12px;">Patient Name</p>
                      <p style="color: #0f172a; margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">${request.babyName}</p>
                    </td>
                    <td width="50%" style="padding: 8px 0;">
                      <p style="color: #64748b; margin: 0; font-size: 12px;">Bed Number</p>
                      <p style="color: #0f172a; margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">${request.bedNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 8px 0;">
                      <p style="color: #64748b; margin: 0; font-size: 12px;">Alert Type</p>
                      <p style="color: ${config.colors.main}; margin: 4px 0 0 0; font-size: 14px; font-weight: 700;">${config.label}</p>
                    </td>
                    <td width="50%" style="padding: 8px 0;">
                      <p style="color: #64748b; margin: 0; font-size: 12px;">Alert Time</p>
                      <p style="color: #0f172a; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">${request.timestamp}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Abnormal Vitals Highlight -->
          ${abnormalVitalsHTML}

          <!-- All Vital Signs -->
          <tr>
            <td style="padding: 20px 28px 0;">
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <p style="color: #475569; margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  ❤️ CURRENT VITAL SIGNS
                </p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td width="50">❤️</td>
                          <td>
                            <p style="margin: 0; color: #64748b; font-size: 12px;">Heart Rate</p>
                            <p style="margin: 2px 0 0 0; font-size: 20px; font-weight: 700; color: ${hrStatus.color};">${request.vitals?.heartRate ?? '—'} <span style="font-size: 12px; color: #94a3b8;">BPM</span></p>
                          </td>
                          <td style="text-align: right;">
                            <span style="font-size: 10px; color: #94a3b8; display: block;">Normal: 100-150</span>
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${hrStatus.color}; color: white;">${hrStatus.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td style="height: 8px;"></td></tr>
                  <tr>
                    <td style="padding: 10px; background: #eff6ff; border-radius: 8px;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td width="50">🫁</td>
                          <td>
                            <p style="margin: 0; color: #64748b; font-size: 12px;">Respiration Rate</p>
                            <p style="margin: 2px 0 0 0; font-size: 20px; font-weight: 700; color: ${rrStatus.color};">${request.vitals?.respirationRate ?? '—'} <span style="font-size: 12px; color: #94a3b8;">/min</span></p>
                          </td>
                          <td style="text-align: right;">
                            <span style="font-size: 10px; color: #94a3b8; display: block;">Normal: 35-55</span>
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${rrStatus.color}; color: white;">${rrStatus.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td style="height: 8px;"></td></tr>
                  <tr>
                    <td style="padding: 10px; background: #fefce8; border-radius: 8px;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td width="50">🌡️</td>
                          <td>
                            <p style="margin: 0; color: #64748b; font-size: 12px;">Temperature</p>
                            <p style="margin: 2px 0 0 0; font-size: 20px; font-weight: 700; color: ${tempStatus.color};">${request.vitals?.temperature ?? '—'} <span style="font-size: 12px; color: #94a3b8;">°C</span></p>
                          </td>
                          <td style="text-align: right;">
                            <span style="font-size: 10px; color: #94a3b8; display: block;">Normal: 36.5-37.2</span>
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${tempStatus.color}; color: white;">${tempStatus.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td style="height: 8px;"></td></tr>
                  <tr>
                    <td style="padding: 10px; background: #f0fdf4; border-radius: 8px;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td width="50">💨</td>
                          <td>
                            <p style="margin: 0; color: #64748b; font-size: 12px;">Oxygen Saturation (SpO₂)</p>
                            <p style="margin: 2px 0 0 0; font-size: 20px; font-weight: 700; color: ${spo2Status.color};">${request.vitals?.spo2 ?? '—'} <span style="font-size: 12px; color: #94a3b8;">%</span></p>
                          </td>
                          <td style="text-align: right;">
                            <span style="font-size: 10px; color: #94a3b8; display: block;">Normal: 95-100%</span>
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${spo2Status.color}; color: white;">${spo2Status.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td style="height: 8px;"></td></tr>
                  <tr>
                    <td style="padding: 10px; background: #f5f3ff; border-radius: 8px;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td width="50">🛏️</td>
                          <td>
                            <p style="margin: 0; color: #64748b; font-size: 12px;">Sleeping Position</p>
                            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: 700; color: ${posInfo.color};">${posInfo.label}</p>
                          </td>
                          <td style="text-align: right;">
                            <span style="font-size: 10px; color: #94a3b8;">Safe: Back (Supine)</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Clinical Analysis -->
          <tr>
            <td style="padding: 20px 28px 0;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <p style="color: #475569; margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  🔬 CLINICAL ANALYSIS
                </p>
                <h3 style="color: #0f172a; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">${content.title}</h3>
                <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.6;">${content.medicalExplanation}</p>
              </div>
            </td>
          </tr>

          <!-- Recommended Actions -->
          <tr>
            <td style="padding: 20px 28px 0;">
              <div style="background-color: ${config.colors.bg}; border: 2px solid ${config.colors.border}; border-radius: 12px; padding: 20px;">
                <p style="color: ${config.colors.main}; margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  ⚕️ RECOMMENDED ACTIONS
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${recommendationsHTML}
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px;">
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center;">
                <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">${content.closingMessage}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0c4a6e; padding: 16px 28px; text-align: center;">
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 12px; font-weight: 600;">NeoGuard NICU Monitoring System</p>
              <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0 0; font-size: 11px;">Automated medical alert - Do not reply</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== SEND ALERT EMAIL FUNCTION STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!BREVO_API_KEY) {
      throw new Error("Email service not configured - missing BREVO_API_KEY");
    }

    const requestBody: AlertEmailRequest = await req.json();
    const { to, babyName, babyId, bedNumber, alertType, message, triggerReason, timestamp, vitals } = requestBody;
    
    if (!babyName || !bedNumber || !alertType || !timestamp) {
      throw new Error("Missing required email data");
    }
    
    console.log(`Preparing ${alertType} alert for ${babyName} (Bed: ${bedNumber})`);

    let aiContent: GeneratedContent;
    if (LOVABLE_API_KEY) {
      aiContent = await generateAIContent(requestBody, LOVABLE_API_KEY);
    } else {
      aiContent = generateFallbackContent(requestBody, getAbnormalVitals(vitals));
    }

    const htmlContent = generateEmailHTML(requestBody, aiContent);
    const config = getAlertConfig(alertType);

    const emailPayload = {
      sender: {
        name: "NeoGuard NICU Alert",
        email: "nagapoojithtn@gmail.com"
      },
      to: [{ email: to }],
      subject: `${config.emoji} ${config.label} NICU ALERT | ${babyName} | Bed ${bedNumber}`,
      htmlContent,
    };

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

    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${emailResponse.status} - ${responseBody}`);
    }

    const emailResult = JSON.parse(responseBody);
    console.log("=== EMAIL SENT SUCCESSFULLY ===", emailResult.messageId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult.messageId,
        details: { recipient: to, babyName, alertType, bedNumber }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== ERROR ===", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
