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
  recommendations: string[];
  closingMessage: string;
}

const getVitalStatus = (vital: string, value: number | undefined): { status: string; color: string; bgColor: string; isNormal: boolean } => {
  if (value === undefined) return { status: "N/A", color: "#6b7280", bgColor: "#f3f4f6", isNormal: true };

  if (vital === "heartRate") {
    if (value >= 100 && value <= 150) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
  }

  if (vital === "respirationRate") {
    if (value >= 35 && value <= 55) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
  }

  if (vital === "temperature") {
    if (value >= 36.5 && value <= 37.2) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
  }

  if (vital === "spo2") {
    if (value >= 95) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
  }

  return { status: "N/A", color: "#6b7280", bgColor: "#f3f4f6", isNormal: true };
};

const getPositionInfo = (position?: string) => {
  switch (position) {
    case "back": return { label: "Supine (Back)", isSafe: true };
    case "side": return { label: "Lateral (Side)", isSafe: false };
    case "prone": return { label: "Prone (Stomach) - High Risk", isSafe: false };
    default: return { label: "Unknown", isSafe: true };
  }
};

const getAbnormalVitals = (vitals?: AlertEmailRequest["vitals"]): string[] => {
  if (!vitals) return [];
  const abnormals: string[] = [];
  
  const hr = getVitalStatus("heartRate", vitals.heartRate);
  if (!hr.isNormal) abnormals.push(`Heart Rate: ${vitals.heartRate} BPM`);
  
  const rr = getVitalStatus("respirationRate", vitals.respirationRate);
  if (!rr.isNormal) abnormals.push(`Respiration Rate: ${vitals.respirationRate}/min`);
  
  const temp = getVitalStatus("temperature", vitals.temperature);
  if (!temp.isNormal) abnormals.push(`Temperature: ${vitals.temperature}°C`);
  
  const spo2 = getVitalStatus("spo2", vitals.spo2);
  if (!spo2.isNormal) abnormals.push(`SpO₂: ${vitals.spo2}%`);
  
  const pos = getPositionInfo(vitals.sleepingPosition);
  if (!pos.isSafe) abnormals.push(`Sleeping Position: ${pos.label}`);
  
  return abnormals;
};

const getAlertTypeBadge = (alertType: string): { label: string; bgColor: string; textColor: string } => {
  switch (alertType) {
    case "critical":
      return { label: "CRITICAL", bgColor: "#dc2626", textColor: "#ffffff" };
    case "high":
      return { label: "WARNING", bgColor: "#f59e0b", textColor: "#ffffff" };
    default:
      return { label: "NORMAL", bgColor: "#059669", textColor: "#ffffff" };
  }
};

async function generateAIContent(request: AlertEmailRequest, apiKey: string): Promise<GeneratedContent> {
  console.log("Generating AI content for alert...");

  const abnormalVitals = getAbnormalVitals(request.vitals);
  const posInfo = getPositionInfo(request.vitals?.sleepingPosition);
  
  const systemPrompt = `You are a clinical decision support AI for a Neonatal ICU monitoring system. Generate clear, professional alert content.`;

  const userPrompt = `Generate NICU alert content for:

Patient: ${request.babyName} | Bed: ${request.bedNumber}
Alert Type: ${request.alertType.toUpperCase()}
Trigger: ${request.triggerReason || request.message}

Abnormal Vitals: ${abnormalVitals.length > 0 ? abnormalVitals.join(", ") : "None"}

Current Readings:
- Heart Rate: ${request.vitals?.heartRate ?? 'N/A'} BPM (Normal: 120-160)
- Respiration: ${request.vitals?.respirationRate ?? 'N/A'}/min (Normal: 35-55)
- Temperature: ${request.vitals?.temperature ?? 'N/A'}°C (Normal: 36.5-37.5)
- SpO₂: ${request.vitals?.spo2 ?? 'N/A'}% (Normal: 95-100%)
- Position: ${posInfo.label} (Safe: Back/Supine)

Respond with JSON:
{
  "title": "CRITICAL ALERT: [BABY_NAME] (Bed [BED]) - [Issue Description]",
  "medicalExplanation": "2-3 sentence clinical explanation about the specific issue detected and its medical significance",
  "recommendations": ["1. First action step", "2. Second action step", "3. Third action step"],
  "closingMessage": "Always verify clinical alerts with direct patient assessment before initiating any interventions."
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
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ["Assess patient at bedside"]
      };
    }
    throw new Error("Could not parse AI response");
  } catch (error) {
    console.log("AI generation failed, using fallback:", error);
    return generateFallbackContent(request, abnormalVitals);
  }
}

function generateFallbackContent(request: AlertEmailRequest, abnormalVitals: string[]): GeneratedContent {
  const posInfo = getPositionInfo(request.vitals?.sleepingPosition);
  
  if (!posInfo.isSafe) {
    return {
      title: `CRITICAL ALERT: ${request.babyName} (Bed ${request.bedNumber}) - Unsafe Prone Positioning Detected`,
      medicalExplanation: `Infant ${request.babyName} (Bed ${request.bedNumber}) is detected in a prone (stomach) sleeping position. Prone positioning in neonates significantly increases the risk of Sudden Infant Death Syndrome (SIDS) and is contraindicated. Immediate repositioning to supine (back) is crucial to mitigate this life-threatening risk.`,
      recommendations: [
        `1. Immediately reposition infant ${request.babyName} to a supine (back) sleeping position. Ensure the airway is clear.`,
        "2. Assess for any signs of respiratory distress, cyanosis, or changes in vital signs following repositioning.",
        "3. Document the event, intervention, and infant's response in the electronic health record. Notify the primary nurse and attending neonatologist of the incident."
      ],
      closingMessage: "Always verify clinical alerts with direct patient assessment before initiating any interventions."
    };
  }
  
  return {
    title: `CRITICAL ALERT: ${request.babyName} (Bed ${request.bedNumber}) - Vital Sign Deviation`,
    medicalExplanation: abnormalVitals.length > 0 
      ? `Vital sign deviation detected: ${abnormalVitals.join("; ")}. Immediate clinical assessment recommended.`
      : request.triggerReason || request.message,
    recommendations: [
      "1. Immediately assess patient at bedside. Verify vital signs manually with clinical-grade equipment.",
      "2. Check airway, breathing, and circulation (ABC). Assess for signs of distress.",
      "3. Document the event, intervention, and infant's response in the patient's chart."
    ],
    closingMessage: "Always verify clinical alerts with direct patient assessment before initiating any interventions."
  };
}

function generateEmailHTML(request: AlertEmailRequest, content: GeneratedContent): string {
  const hrStatus = getVitalStatus("heartRate", request.vitals?.heartRate);
  const rrStatus = getVitalStatus("respirationRate", request.vitals?.respirationRate);
  const spo2Status = getVitalStatus("spo2", request.vitals?.spo2);
  const tempStatus = getVitalStatus("temperature", request.vitals?.temperature);
  const posInfo = getPositionInfo(request.vitals?.sleepingPosition);
  const alertBadge = getAlertTypeBadge(request.alertType);

  // Ultra-compact vital card for 3-column horizontal layout - reduces vertical height
  const createVitalCard = (
    icon: string,
    bgColor: string,
    label: string,
    value: string | number | undefined,
    unit: string,
    normalRange: string,
    status: { status: string; color: string; bgColor: string }
  ) => `
    <td width="33%" style="padding: 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border-radius: 8px;">
        <tr>
          <td style="padding: 10px 8px; text-align: center;">
            <span style="font-size: 20px;">${icon}</span>
            <p style="margin: 4px 0 2px 0; color: #6b7280; font-size: 9px; font-weight: 700; text-transform: uppercase;">${label}</p>
            <p style="margin: 0;">
              <span style="font-size: 20px; font-weight: 800; color: #1f2937;">${value ?? '—'}</span>
              <span style="font-size: 10px; color: #6b7280;">${unit}</span>
            </p>
            <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: ${status.bgColor}; color: ${status.color}; font-size: 8px; font-weight: 700; border-radius: 10px;">${status.status}</span>
            <p style="margin: 2px 0 0 0; color: #9ca3af; font-size: 8px;">${normalRange}</p>
          </td>
        </tr>
      </table>
    </td>
  `;

  const createPositionCard = () => `
    <td width="33%" style="padding: 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${posInfo.isSafe ? '#ecfdf5' : '#fef3c7'}; border-radius: 8px;">
        <tr>
          <td style="padding: 10px 8px; text-align: center;">
            <span style="font-size: 20px;">🛏️</span>
            <p style="margin: 4px 0 2px 0; color: #6b7280; font-size: 9px; font-weight: 700; text-transform: uppercase;">POSITION</p>
            <p style="margin: 0;">
              <span style="font-size: 12px; font-weight: 700; color: ${posInfo.isSafe ? '#059669' : '#dc2626'};">${posInfo.isSafe ? 'Safe' : 'UNSAFE'}</span>
            </p>
            <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: ${posInfo.isSafe ? '#d1fae5' : '#fee2e2'}; color: ${posInfo.isSafe ? '#059669' : '#dc2626'}; font-size: 8px; font-weight: 700; border-radius: 10px;">${posInfo.label.split(' ')[0]}</span>
          </td>
        </tr>
      </table>
    </td>
  `;

  const createMovementCard = () => `
    <td width="33%" style="padding: 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; border-radius: 8px;">
        <tr>
          <td style="padding: 10px 8px; text-align: center;">
            <span style="font-size: 20px;">📊</span>
            <p style="margin: 4px 0 2px 0; color: #6b7280; font-size: 9px; font-weight: 700; text-transform: uppercase;">MOVEMENT</p>
            <p style="margin: 0;">
              <span style="font-size: 20px; font-weight: 800; color: #1f2937;">${request.vitals?.movement ?? 60}</span>
              <span style="font-size: 10px; color: #6b7280;">%</span>
            </p>
            <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #e5e7eb; color: #374151; font-size: 8px; font-weight: 700; border-radius: 10px;">ACTIVITY</span>
          </td>
        </tr>
      </table>
    </td>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NICU Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #e8eef4; -webkit-font-smoothing: antialiased;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8eef4;">
    <tr>
      <td align="center" style="padding: 12px 8px;">
        
        <!-- Main Container - ULTRA WIDE 800px for one-screen viewing -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 800px; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);">
          
          <!-- Compact Header with Alert Badge -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d4f5f 0%, #0f766e 100%); padding: 12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" valign="middle">
                    <span style="font-size: 28px;">🏥</span>
                  </td>
                  <td style="padding-left: 10px;" valign="middle">
                    <h1 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 700;">NICU Alert</h1>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 6px 16px; background: ${alertBadge.bgColor}; color: ${alertBadge.textColor}; font-size: 12px; font-weight: 800; border-radius: 16px; text-transform: uppercase; letter-spacing: 1px;">${alertBadge.label}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Patient + Alert Trigger - Horizontal -->
          <tr>
            <td style="padding: 12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="30%" style="padding-right: 8px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 10px;">
                          <p style="color: #64748b; margin: 0 0 4px 0; font-size: 9px; font-weight: 700; text-transform: uppercase;">👶 PATIENT</p>
                          <p style="color: #0f172a; margin: 0; font-size: 16px; font-weight: 700;">${request.babyName}</p>
                          <p style="color: #64748b; margin: 2px 0 0 0; font-size: 10px;">Bed: ${request.bedNumber} | ${request.timestamp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="70%" style="padding-left: 8px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 6px;">
                      <tr>
                        <td style="padding: 10px;">
                          <p style="color: #b45309; margin: 0 0 4px 0; font-size: 9px; font-weight: 700; text-transform: uppercase;">⚡ ALERT TRIGGER</p>
                          <p style="color: #1f2937; margin: 0; font-size: 12px; line-height: 1.4; font-weight: 500;">${request.triggerReason || request.message}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Vital Signs - 3x2 Horizontal Grid for minimal height -->
          <tr>
            <td style="padding: 0 16px 10px;">
              <p style="color: #dc2626; margin: 0 0 8px 0; font-size: 10px; font-weight: 700; text-transform: uppercase;">❤️ VITAL SIGNS</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${createVitalCard("❤️", "#fef2f2", "Heart Rate", request.vitals?.heartRate, "BPM", "100-150", hrStatus)}
                  ${createVitalCard("🫁", "#eff6ff", "Respiration", request.vitals?.respirationRate, "/min", "35-55", rrStatus)}
                  ${createVitalCard("💧", "#ecfdf5", "SpO₂", request.vitals?.spo2, "%", "95-100%", spo2Status)}
                </tr>
                <tr>
                  ${createVitalCard("🌡️", "#fff7ed", "Temperature", request.vitals?.temperature, "°C", "36.5-37.2", tempStatus)}
                  ${createPositionCard()}
                  ${createMovementCard()}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Analysis + Actions - Side by Side compact -->
          <tr>
            <td style="padding: 0 16px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="45%" style="padding-right: 6px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 10px;">
                          <p style="color: #475569; margin: 0 0 6px 0; font-size: 9px; font-weight: 700; text-transform: uppercase;">🔬 ANALYSIS</p>
                          <p style="color: #475569; margin: 0; font-size: 11px; line-height: 1.4;">${content.medicalExplanation}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="55%" style="padding-left: 6px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
                      <tr>
                        <td style="padding: 10px;">
                          <p style="color: #dc2626; margin: 0 0 6px 0; font-size: 9px; font-weight: 700; text-transform: uppercase;">🚨 ACTIONS REQUIRED</p>
                          ${content.recommendations.slice(0, 3).map((rec) => `
                            <p style="color: #b91c1c; margin: 0 0 4px 0; font-size: 10px; line-height: 1.3; font-weight: 500;">• ${rec.replace(/^\d+\.\s*/, '')}</p>
                          `).join("")}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer - Minimal -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d4f5f 0%, #0f766e 100%); padding: 10px 16px; text-align: center;">
              <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 9px;">Automated alert - Do not reply</p>
              <p style="color: rgba(255,255,255,0.5); margin: 4px 0 0 0; font-size: 9px;">© 2026 Hospital Systems</p>
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

serve(async (req) => {
  console.log("=== SEND-ALERT-EMAIL FUNCTION STARTED ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const request: AlertEmailRequest = await req.json();
    console.log("Alert request:", JSON.stringify(request, null, 2));

    const content = await generateAIContent(request, LOVABLE_API_KEY || "");

    const htmlContent = generateEmailHTML(request, content);

    const alertBadge = getAlertTypeBadge(request.alertType);
    const subject = `🚨 [${alertBadge.label}] NICU ALERT | Baby ${request.babyName} | Bed ${request.bedNumber}`;

    const emailPayload = {
      sender: { name: "NeoGuard NICU", email: "nagapoojithtn@gmail.com" },
      to: [{ email: request.to }],
      subject,
      htmlContent,
    };

    console.log("Sending email via Brevo...");
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const brevoResult = await brevoResponse.json();
    console.log("Brevo response:", JSON.stringify(brevoResult));

    if (!brevoResponse.ok) {
      throw new Error(`Brevo API error: ${JSON.stringify(brevoResult)}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: brevoResult.messageId,
      message: "Alert email sent successfully"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-alert-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
