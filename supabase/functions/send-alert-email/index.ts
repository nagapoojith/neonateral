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
        colors: { main: "#059669", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" }
      };
  }
};

const getVitalStatus = (vital: string, value: number | undefined): { status: string; color: string; bgColor: string; isAbnormal: boolean } => {
  if (value === undefined) return { status: "N/A", color: "#6b7280", bgColor: "#f3f4f6", isAbnormal: false };

  if (vital === "heartRate") {
    if (value < 80 || value > 160) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isAbnormal: true };
    if (value < 100 || value > 150) return { status: "WARNING", color: "#ea580c", bgColor: "#fff7ed", isAbnormal: true };
    return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isAbnormal: false };
  }

  if (vital === "respirationRate") {
    if (value < 30 || value > 60) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isAbnormal: true };
    if (value < 35 || value > 55) return { status: "WARNING", color: "#ea580c", bgColor: "#fff7ed", isAbnormal: true };
    return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isAbnormal: false };
  }

  if (vital === "temperature") {
    if (value < 36.0 || value > 37.5) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isAbnormal: true };
    if (value < 36.5 || value > 37.2) return { status: "WARNING", color: "#ea580c", bgColor: "#fff7ed", isAbnormal: true };
    return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isAbnormal: false };
  }

  if (vital === "spo2") {
    if (value < 90) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isAbnormal: true };
    if (value < 94) return { status: "LOW", color: "#ea580c", bgColor: "#fff7ed", isAbnormal: true };
    return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isAbnormal: false };
  }

  return { status: "N/A", color: "#6b7280", bgColor: "#f3f4f6", isAbnormal: false };
};

const getPositionInfo = (position?: string) => {
  switch (position) {
    case "back": return { label: "Supine (Back)", color: "#059669", bgColor: "#ecfdf5", isSafe: true };
    case "side": return { label: "Lateral (Side)", color: "#ea580c", bgColor: "#fff7ed", isSafe: false };
    case "prone": return { label: "Prone (Stomach)", color: "#dc2626", bgColor: "#fef2f2", isSafe: false };
    default: return { label: "Unknown", color: "#6b7280", bgColor: "#f3f4f6", isSafe: true };
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
  if (!pos.isSafe) abnormals.push(`Sleeping Position: ${pos.label} ⚠`);
  
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
  "title": "Brief clinical title about the specific vital that triggered the alert",
  "medicalExplanation": "2-3 sentence clinical explanation of what is happening and why it matters",
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
      "Document the event, intervention, and infant's response in the patient's chart"
    ] : [
      "Review patient vital signs and trending data",
      "Perform visual clinical assessment",
      "Document observations in patient chart",
      "Continue enhanced monitoring per protocol"
    ],
    closingMessage: "Prompt intervention is crucial. Please ensure continuous monitoring."
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
        <td style="padding: 8px 0; vertical-align: top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="28" valign="top">
                <div style="width: 22px; height: 22px; border-radius: 50%; background: #dc2626; color: white; font-size: 12px; font-weight: 600; text-align: center; line-height: 22px;">${i + 1}</div>
              </td>
              <td style="padding-left: 12px; font-size: 14px; color: #374151; line-height: 1.5;">${rec}</td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

  // Build vitals outside normal range section
  const abnormalVitalsHTML = abnormalVitals.length > 0 ? `
    <tr>
      <td style="padding: 20px 24px 0;">
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
          <p style="color: #b45309; margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            ⚡ VITALS OUTSIDE NORMAL RANGE
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #1f2937;">
            ${abnormalVitals.map(v => `<li style="margin: 6px 0; font-size: 14px; font-weight: 500;">${v}</li>`).join("")}
          </ul>
        </div>
      </td>
    </tr>
  ` : "";

  // Create vital card HTML
  const createVitalCard = (
    icon: string, 
    label: string, 
    value: string | number | undefined, 
    unit: string, 
    normalRange: string, 
    status: { status: string; color: string; bgColor: string }
  ) => `
    <tr>
      <td style="padding: 8px 0;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top">
                <span style="font-size: 20px;">${icon}</span>
              </td>
              <td style="padding-left: 12px;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">${label}</p>
                <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 700; color: ${status.color};">${value ?? '—'} <span style="font-size: 14px; font-weight: 400;">${unit}</span></p>
              </td>
              <td align="right" valign="top">
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">Normal: ${normalRange}</p>
                <div style="display: inline-block; margin-top: 6px; padding: 3px 10px; background: ${status.bgColor}; border-radius: 12px;">
                  <span style="font-size: 11px; font-weight: 600; color: ${status.color};">${status.status}</span>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoGuard NICU Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 24px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 44px; height: 44px; background: rgba(255,255,255,0.15); border-radius: 10px; line-height: 44px; margin-bottom: 8px;">
                      <span style="font-size: 22px;">🏥</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">NeoGuard NICU</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 12px;">Neonatal Monitoring System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Type Banner -->
          <tr>
            <td style="background: ${config.colors.main}; padding: 16px 24px; text-align: center;">
              <span style="font-size: 28px; display: block; margin-bottom: 4px;">${config.emoji}</span>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">${config.label} ALERT</p>
              <h2 style="color: #ffffff; margin: 6px 0 0 0; font-size: 16px; font-weight: 600;">${config.severityText}</h2>
            </td>
          </tr>

          <!-- Patient Information -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <div style="background: #f9fafb; border-radius: 10px; padding: 18px; border: 1px solid #e5e7eb;">
                <p style="color: #6b7280; margin: 0 0 14px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  👶 PATIENT INFORMATION
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding: 6px 0; vertical-align: top;">
                      <p style="color: #9ca3af; margin: 0; font-size: 11px;">Patient Name</p>
                      <p style="color: #111827; margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">${request.babyName}</p>
                    </td>
                    <td width="50%" style="padding: 6px 0; vertical-align: top;">
                      <p style="color: #9ca3af; margin: 0; font-size: 11px;">Bed Number</p>
                      <p style="color: #111827; margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">${request.bedNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 6px 0; vertical-align: top;">
                      <p style="color: #9ca3af; margin: 0; font-size: 11px;">Alert Type</p>
                      <p style="color: ${config.colors.main}; margin: 4px 0 0 0; font-size: 14px; font-weight: 700;">${config.label}</p>
                    </td>
                    <td width="50%" style="padding: 6px 0; vertical-align: top;">
                      <p style="color: #9ca3af; margin: 0; font-size: 11px;">Alert Time</p>
                      <p style="color: #111827; margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">${request.timestamp}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          ${abnormalVitalsHTML}

          <!-- Current Vital Signs -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <p style="color: #374151; margin: 0 0 12px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                ❤️ CURRENT VITAL SIGNS
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${createVitalCard("❤️", "Heart Rate", request.vitals?.heartRate, "BPM", "100-150", hrStatus)}
                ${createVitalCard("🫁", "Respiration Rate", request.vitals?.respirationRate, "/min", "35-55", rrStatus)}
                ${createVitalCard("🌡️", "Temperature", request.vitals?.temperature, "°C", "36.5-37.2", tempStatus)}
                ${createVitalCard("💧", "Oxygen Saturation (SpO₂)", request.vitals?.spo2, "%", "95-100%", spo2Status)}
                <tr>
                  <td style="padding: 8px 0;">
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="36" valign="top">
                            <span style="font-size: 20px;">🛏️</span>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Sleeping Position</p>
                            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: ${posInfo.color};">${posInfo.label} ${!posInfo.isSafe ? '⚠' : ''}</p>
                          </td>
                          <td align="right" valign="top">
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">Safe: Back (Supine)</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Clinical Analysis -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px;">
                <p style="color: #0369a1; margin: 0 0 10px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  🔬 CLINICAL ANALYSIS
                </p>
                <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px; font-weight: 700;">${content.title}</h3>
                <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.6;">${content.medicalExplanation}</p>
              </div>
            </td>
          </tr>

          <!-- Recommended Actions -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px;">
                <p style="color: #b91c1c; margin: 0 0 12px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  🚨 RECOMMENDED ACTIONS
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${recommendationsHTML}
                </table>
              </div>
            </td>
          </tr>

          <!-- Closing Message -->
          <tr>
            <td style="padding: 20px 24px;">
              <div style="background: #e0f2fe; border-radius: 8px; padding: 14px; text-align: center;">
                <p style="color: #0369a1; margin: 0; font-size: 13px; line-height: 1.5;">${content.closingMessage}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #1e3a5f; padding: 16px 24px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 13px; font-weight: 600;">NeoGuard NICU Monitoring System</p>
              <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0 0; font-size: 11px;">Automated medical alert - Do not reply</p>
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

    // Generate AI content
    const content = await generateAIContent(request, LOVABLE_API_KEY || "");

    // Generate email HTML
    const htmlContent = generateEmailHTML(request, content);

    // Send via Brevo
    const config = getAlertConfig(request.alertType);
    const subject = `${config.emoji} [${config.label}] NICU ALERT | Baby ${request.babyName} | Bed ${request.bedNumber}`;

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
