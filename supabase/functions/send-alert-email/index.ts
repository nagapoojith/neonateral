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
    if (value >= 100 && value <= 150) return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isNormal: false };
  }

  if (vital === "respirationRate") {
    if (value >= 35 && value <= 55) return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isNormal: false };
  }

  if (vital === "temperature") {
    if (value >= 36.5 && value <= 37.2) return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isNormal: false };
  }

  if (vital === "spo2") {
    if (value >= 95) return { status: "NORMAL", color: "#059669", bgColor: "#ecfdf5", isNormal: true };
    return { status: "CRITICAL", color: "#dc2626", bgColor: "#fef2f2", isNormal: false };
  }

  return { status: "N/A", color: "#6b7280", bgColor: "#f3f4f6", isNormal: true };
};

const getPositionInfo = (position?: string) => {
  switch (position) {
    case "back": return { label: "Supine (Back)", isSafe: true };
    case "side": return { label: "Lateral (Side)", isSafe: false };
    case "prone": return { label: "Prone (Stomach)", isSafe: false };
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
- Heart Rate: ${request.vitals?.heartRate ?? 'N/A'} BPM (Normal: 100-150)
- Respiration: ${request.vitals?.respirationRate ?? 'N/A'}/min (Normal: 35-55)
- Temperature: ${request.vitals?.temperature ?? 'N/A'}°C (Normal: 36.5-37.2)
- SpO₂: ${request.vitals?.spo2 ?? 'N/A'}% (Normal: 95-100%)
- Position: ${posInfo.label} (Safe: Back/Supine)

Respond with JSON:
{
  "title": "Brief clinical title about the issue (e.g., 'Critical SIDS Risk: Infant in Prone Sleeping Position')",
  "medicalExplanation": "2-3 sentence clinical explanation",
  "recommendations": ["Action 1", "Action 2", "Action 3", "Action 4"],
  "closingMessage": "Brief professional closing about the importance of prompt intervention"
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
      title: `Critical SIDS Risk: Infant in ${posInfo.label} Position`,
      medicalExplanation: `Infant ${request.babyName} (Bed ${request.bedNumber}) is detected in a ${posInfo.label.toLowerCase()} sleeping position, which significantly increases the risk of Sudden Infant Death Syndrome (SIDS). While current vital signs are stable, prone positioning is a major modifiable risk factor for SIDS in neonates.`,
      recommendations: [
        `Immediately reposition infant ${request.babyName} to a supine (back) sleeping position.`,
        "Verify proper placement of the infant on a firm, flat, and clear sleep surface, free from loose bedding or soft objects.",
        "Assess for signs of respiratory distress or airway compromise once repositioned.",
        "Document the event, intervention, and infant's response in the patient's chart."
      ],
      closingMessage: "Prompt intervention is crucial to mitigate SIDS risk associated with prone sleeping. Please ensure continuous monitoring."
    };
  }
  
  return {
    title: `${request.alertType.toUpperCase()} Alert - Vital Sign Deviation`,
    medicalExplanation: abnormalVitals.length > 0 
      ? `Vital sign deviation detected: ${abnormalVitals.join("; ")}. Immediate clinical assessment recommended.`
      : request.triggerReason || request.message,
    recommendations: [
      "Immediately assess patient at bedside",
      "Verify vital signs manually with clinical-grade equipment",
      "Check airway, breathing, and circulation (ABC)",
      "Document the event, intervention, and infant's response in the patient's chart"
    ],
    closingMessage: "Prompt intervention is crucial. Please ensure continuous monitoring."
  };
}

function generateEmailHTML(request: AlertEmailRequest, content: GeneratedContent): string {
  const abnormalVitals = getAbnormalVitals(request.vitals);
  
  const hrStatus = getVitalStatus("heartRate", request.vitals?.heartRate);
  const rrStatus = getVitalStatus("respirationRate", request.vitals?.respirationRate);
  const tempStatus = getVitalStatus("temperature", request.vitals?.temperature);
  const spo2Status = getVitalStatus("spo2", request.vitals?.spo2);
  const posInfo = getPositionInfo(request.vitals?.sleepingPosition);

  const createBadge = (status: string, color: string, bgColor: string) => `
    <span style="display: inline-block; padding: 4px 12px; background: ${bgColor}; color: ${color}; font-size: 11px; font-weight: 600; border-radius: 12px;">${status}</span>
  `;

  const createVitalRow = (
    icon: string,
    bgColor: string,
    label: string,
    value: string | number | undefined,
    unit: string,
    normalRange: string,
    status: { status: string; color: string; bgColor: string }
  ) => `
    <tr>
      <td style="padding: 6px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" valign="middle">
                    <span style="font-size: 24px;">${icon}</span>
                  </td>
                  <td style="padding-left: 12px;" valign="middle">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">${label}</p>
                    <p style="margin: 4px 0 0 0;">
                      <span style="font-size: 24px; font-weight: 700; color: ${status.color};">${value ?? '—'}</span>
                      <span style="font-size: 14px; color: #6b7280; margin-left: 4px;">${unit}</span>
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px;">Normal: ${normalRange}</p>
                    ${createBadge(status.status, status.color, status.bgColor)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const abnormalVitalsHTML = abnormalVitals.length > 0 ? `
    <tr>
      <td style="padding: 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; margin-top: 16px;">
          <tr>
            <td style="padding: 14px 16px;">
              <p style="margin: 0 0 8px 0; color: #b45309; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                ⚡ VITALS OUTSIDE NORMAL RANGE
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                ${abnormalVitals.map(v => `<li style="margin: 4px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${v} ⚠</li>`).join("")}
              </ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : "";

  const recommendationsHTML = content.recommendations.map((rec, i) => `
    <tr>
      <td style="padding: 8px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="28" valign="top">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #7c3aed; color: white; font-size: 12px; font-weight: 600; text-align: center; line-height: 24px;">${i + 1}</div>
            </td>
            <td style="padding-left: 12px; font-size: 14px; color: #374151; line-height: 1.5;">${rec}</td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

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
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 24px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 12px; line-height: 48px; margin-bottom: 12px;">
                      <span style="font-size: 24px;">🏥</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">NeoGuard NICU</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px;">Neonatal Monitoring System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Critical Alert Banner -->
          <tr>
            <td style="background: #dc2626; padding: 20px 24px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 44px; margin-bottom: 8px;">
                <span style="font-size: 22px;">🚨</span>
              </div>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">CRITICAL ALERT</p>
              <h2 style="color: #ffffff; margin: 8px 0 0 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">IMMEDIATE ATTENTION REQUIRED</h2>
            </td>
          </tr>

          <!-- Patient Information -->
          <tr>
            <td style="padding: 24px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      👶 PATIENT INFORMATION
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding: 4px 0;">
                          <p style="color: #9ca3af; margin: 0; font-size: 11px;">Patient Name</p>
                          <p style="color: #111827; margin: 4px 0 0 0; font-size: 20px; font-weight: 700;">${request.babyName}</p>
                        </td>
                        <td width="50%" style="padding: 4px 0;">
                          <p style="color: #9ca3af; margin: 0; font-size: 11px;">Bed Number</p>
                          <p style="color: #111827; margin: 4px 0 0 0; font-size: 20px; font-weight: 700;">${request.bedNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0 0 0;">
                          <p style="color: #9ca3af; margin: 0; font-size: 11px;">Alert Type</p>
                          <p style="color: #dc2626; margin: 4px 0 0 0; font-size: 16px; font-weight: 700;">CRITICAL</p>
                        </td>
                        <td width="50%" style="padding: 8px 0 0 0;">
                          <p style="color: #9ca3af; margin: 0; font-size: 11px;">Alert Time</p>
                          <p style="color: #111827; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">${request.timestamp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
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
                ${createVitalRow("❤️", "#fef2f2", "Heart Rate", request.vitals?.heartRate, "BPM", "100-150", hrStatus)}
                ${createVitalRow("🫁", "#f0fdf4", "Respiration Rate", request.vitals?.respirationRate, "/min", "35-55", rrStatus)}
                ${createVitalRow("🌡️", "#eff6ff", "Temperature", request.vitals?.temperature, "°C", "36.5-37.2", tempStatus)}
                ${createVitalRow("💧", "#faf5ff", "Oxygen Saturation (SpO₂)", request.vitals?.spo2, "%", "95-100%", spo2Status)}
                
                <!-- Sleeping Position -->
                <tr>
                  <td style="padding: 6px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fefce8; border-radius: 8px;">
                      <tr>
                        <td style="padding: 12px 16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="middle">
                                <span style="font-size: 24px;">🛏️</span>
                              </td>
                              <td style="padding-left: 12px;" valign="middle">
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">Sleeping Position</p>
                                <p style="margin: 4px 0 0 0;">
                                  <span style="font-size: 18px; font-weight: 700; color: ${posInfo.isSafe ? '#059669' : '#dc2626'};">${posInfo.label}</span>
                                  ${!posInfo.isSafe ? '<span style="margin-left: 6px;">⚠</span>' : ''}
                                </p>
                              </td>
                              <td align="right" valign="middle">
                                <p style="margin: 0; color: #9ca3af; font-size: 11px;">Safe: Back (Supine)</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Clinical Analysis -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="color: #0369a1; margin: 0 0 10px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      🔬 CLINICAL ANALYSIS
                    </p>
                    <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px; font-weight: 700;">${content.title}</h3>
                    <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.6;">${content.medicalExplanation}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Recommended Actions -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="color: #9d174d; margin: 0 0 12px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      🚨 RECOMMENDED ACTIONS
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${recommendationsHTML}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closing Message -->
          <tr>
            <td style="padding: 20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #e0f2fe; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px; text-align: center;">
                    <p style="color: #0369a1; margin: 0; font-size: 13px; line-height: 1.5; font-weight: 500;">${content.closingMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #1e3a5f; padding: 18px 24px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 600;">NeoGuard NICU Monitoring System</p>
              <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0 0; font-size: 12px;">Automated medical alert - Do not reply</p>
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

    const subject = `🚨 [CRITICAL] NICU ALERT | Baby ${request.babyName} | Bed ${request.bedNumber}`;

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
