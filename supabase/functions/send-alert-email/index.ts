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

// Consistent thresholds matching DataContext.tsx PhysioNet neonatal thresholds
// Heart Rate: Normal 100-160 BPM, Critical <80 or >160 BPM
// Respiration: Normal 30-60/min, Critical <30 or >60/min  
// Temperature: Normal 36.5-37.5°C, Critical <36.0 or >37.5°C
// SpO2: Normal >=95%, Critical <90%
const getVitalStatus = (vital: string, value: number | undefined): { status: string; color: string; bgColor: string; isNormal: boolean } => {
  if (value === undefined) return { status: "N/A", color: "#6b7280", bgColor: "#f3f4f6", isNormal: true };

  if (vital === "heartRate") {
    // Critical: <80 or >160 BPM
    if (value < 80 || value > 160) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
    // Normal: 100-160 BPM
    if (value >= 100 && value <= 160) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    // High Priority: 80-99 BPM (approaching limits)
    return { status: "WARNING", color: "#d97706", bgColor: "#fef3c7", isNormal: false };
  }

  if (vital === "respirationRate") {
    // Critical: <30 or >60/min
    if (value < 30 || value > 60) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
    // Normal: 35-55/min
    if (value >= 35 && value <= 55) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    // High Priority: 30-34 or 56-60/min
    return { status: "WARNING", color: "#d97706", bgColor: "#fef3c7", isNormal: false };
  }

  if (vital === "temperature") {
    // Critical: <36.0 or >37.5°C
    if (value < 36.0 || value > 37.5) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
    // Normal: 36.5-37.5°C
    if (value >= 36.5 && value <= 37.5) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    // High Priority: 36.0-36.4°C
    return { status: "WARNING", color: "#d97706", bgColor: "#fef3c7", isNormal: false };
  }

  if (vital === "spo2") {
    // Critical: <90%
    if (value < 90) return { status: "CRITICAL", color: "#dc2626", bgColor: "#fee2e2", isNormal: false };
    // Normal: >=95%
    if (value >= 95) return { status: "NORMAL", color: "#059669", bgColor: "#d1fae5", isNormal: true };
    // High Priority: 90-94%
    return { status: "WARNING", color: "#d97706", bgColor: "#fef3c7", isNormal: false };
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
- Heart Rate: ${request.vitals?.heartRate ?? 'N/A'} BPM (Normal: 100-160, Critical: <80 or >160)
- Respiration: ${request.vitals?.respirationRate ?? 'N/A'}/min (Normal: 30-60, Critical: <30 or >60)
- Temperature: ${request.vitals?.temperature ?? 'N/A'}°C (Normal: 36.5-37.5, Critical: <36.0 or >37.5)
- SpO₂: ${request.vitals?.spo2 ?? 'N/A'}% (Normal: 95-100%, Critical: <90%)
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

  const createVitalCard = (
    icon: string,
    bgColor: string,
    label: string,
    value: string | number | undefined,
    unit: string,
    normalRange: string,
    status: { status: string; color: string; bgColor: string }
  ) => `
    <tr>
      <td style="padding: 8px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border-radius: 12px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50" valign="middle">
                    <div style="width: 44px; height: 44px; background: rgba(255,255,255,0.8); border-radius: 10px; text-align: center; line-height: 44px;">
                      <span style="font-size: 22px;">${icon}</span>
                    </div>
                  </td>
                  <td style="padding-left: 16px;" valign="middle">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 500;">${label}</p>
                    <p style="margin: 6px 0 0 0;">
                      <span style="font-size: 28px; font-weight: 700; color: #1f2937;">${value ?? '—'}</span>
                      <span style="font-size: 16px; color: #6b7280; margin-left: 4px;">${unit}</span>
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">Normal: ${normalRange}</p>
                    <span style="display: inline-block; padding: 6px 14px; background: ${status.bgColor}; color: ${status.color}; font-size: 12px; font-weight: 700; border-radius: 20px; text-transform: uppercase;">${status.status}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const createPositionCard = () => `
    <tr>
      <td style="padding: 8px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${posInfo.isSafe ? '#ecfdf5' : '#fef3c7'}; border-radius: 12px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50" valign="middle">
                    <div style="width: 44px; height: 44px; background: rgba(255,255,255,0.8); border-radius: 10px; text-align: center; line-height: 44px;">
                      <span style="font-size: 22px;">🛏️</span>
                    </div>
                  </td>
                  <td style="padding-left: 16px;" valign="middle">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 500;">Sleeping Position</p>
                    <p style="margin: 6px 0 0 0;">
                      <span style="font-size: 20px; font-weight: 700; color: ${posInfo.isSafe ? '#059669' : '#dc2626'};">${posInfo.label}</span>
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">Safe: Back</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const createMovementCard = () => `
    <tr>
      <td style="padding: 8px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eff6ff; border-radius: 12px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50" valign="middle">
                    <div style="width: 44px; height: 44px; background: rgba(255,255,255,0.8); border-radius: 10px; text-align: center; line-height: 44px;">
                      <span style="font-size: 22px;">📊</span>
                    </div>
                  </td>
                  <td style="padding-left: 16px;" valign="middle">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 500;">Movement Index</p>
                    <p style="margin: 6px 0 0 0;">
                      <span style="font-size: 28px; font-weight: 700; color: #1f2937;">${request.vitals?.movement ?? 60}</span>
                      <span style="font-size: 16px; color: #6b7280; margin-left: 4px;">%</span>
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">Activity Level</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #e8eef4; -webkit-font-smoothing: antialiased;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8eef4;">
    <tr>
      <td align="center" style="padding: 20px 12px;">
        
        <!-- Main Container - WIDE LAYOUT -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          
          <!-- Header - Teal/Navy Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d4f5f 0%, #1a5f6e 50%, #0d4f5f 100%); padding: 28px 24px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; margin-bottom: 12px;">
                      <span style="font-size: 40px;">🏥</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">NeoGuard NICU</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px; font-weight: 400;">Neonatal Intensive Care Monitoring System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ALERT TYPE BADGE BANNER -->
          <tr>
            <td style="background: ${alertBadge.bgColor}; padding: 24px 24px; text-align: center;">
              <div style="margin-bottom: 8px;">
                <span style="font-size: 32px;">🚨</span>
              </div>
              <span style="display: inline-block; padding: 10px 28px; background: rgba(255,255,255,0.2); color: ${alertBadge.textColor}; font-size: 18px; font-weight: 800; border-radius: 30px; text-transform: uppercase; letter-spacing: 3px; border: 2px solid rgba(255,255,255,0.4);">${alertBadge.label}</span>
              <h2 style="color: #ffffff; margin: 14px 0 0 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">IMMEDIATE ATTENTION REQUIRED</h2>
            </td>
          </tr>

          <!-- Alert Trigger Box - Cream/Orange Border -->
          <tr>
            <td style="padding: 24px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fffbeb; border-left: 5px solid #f59e0b; border-radius: 8px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="color: #b45309; margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      ⚡ ALERT TRIGGER
                    </p>
                    <p style="color: #1f2937; margin: 0; font-size: 15px; line-height: 1.6; font-weight: 500;">
                      ${request.triggerReason || request.message}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Patient Information Card - Light Gray Background -->
          <tr>
            <td style="padding: 20px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #64748b; margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      👶 PATIENT INFORMATION
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding: 6px 0; vertical-align: top;">
                          <p style="color: #94a3b8; margin: 0; font-size: 12px; font-weight: 500;">Patient Name</p>
                          <p style="color: #0f172a; margin: 6px 0 0 0; font-size: 22px; font-weight: 700;">${request.babyName}</p>
                        </td>
                        <td width="50%" style="padding: 6px 0; vertical-align: top;">
                          <p style="color: #94a3b8; margin: 0; font-size: 12px; font-weight: 500;">Bed Number</p>
                          <p style="color: #0f172a; margin: 6px 0 0 0; font-size: 22px; font-weight: 700;">${request.bedNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 12px 0 0 0; vertical-align: top;">
                          <p style="color: #94a3b8; margin: 0; font-size: 12px; font-weight: 500;">Alert Type</p>
                          <p style="margin: 6px 0 0 0;">
                            <span style="display: inline-block; padding: 6px 16px; background: ${alertBadge.bgColor}; color: ${alertBadge.textColor}; font-size: 13px; font-weight: 700; border-radius: 20px; text-transform: uppercase;">${alertBadge.label}</span>
                          </p>
                        </td>
                        <td width="50%" style="padding: 12px 0 0 0; vertical-align: top;">
                          <p style="color: #94a3b8; margin: 0; font-size: 12px; font-weight: 500;">Alert Time</p>
                          <p style="color: #475569; margin: 6px 0 0 0; font-size: 14px; font-weight: 600;">${request.timestamp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Vital Signs Snapshot -->
          <tr>
            <td style="padding: 24px 24px 0;">
              <p style="color: #dc2626; margin: 0 0 16px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                ❤️ VITAL SIGNS SNAPSHOT
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${createVitalCard("❤️", "#fef2f2", "Heart Rate", request.vitals?.heartRate, "BPM", "100-160", hrStatus)}
                ${createVitalCard("🫁", "#eff6ff", "Respiration Rate", request.vitals?.respirationRate, "/min", "30-60", rrStatus)}
                ${createVitalCard("💧", "#ecfdf5", "Oxygen Saturation (SpO₂)", request.vitals?.spo2, "%", "95-100%", spo2Status)}
                ${createVitalCard("🌡️", "#fff7ed", "Body Temperature", request.vitals?.temperature, "°C", "36.5-37.5°C", tempStatus)}
                ${createPositionCard()}
                ${createMovementCard()}
              </table>
            </td>
          </tr>

          <!-- Clinical Analysis Section -->
          <tr>
            <td style="padding: 24px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #475569; margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      🔬 CLINICAL ANALYSIS
                    </p>
                    <h3 style="color: #0f172a; margin: 0 0 14px 0; font-size: 17px; font-weight: 700; line-height: 1.4;">${content.title}</h3>
                    <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.7;">${content.medicalExplanation}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Recommended Actions - RED Background -->
          <tr>
            <td style="padding: 24px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #dc2626; margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      🚨 RECOMMENDED ACTIONS
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${content.recommendations.map((rec, i) => `
                        <tr>
                          <td style="padding: 10px 0;">
                            <p style="color: #b91c1c; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500;">${rec}</p>
                          </td>
                        </tr>
                      `).join("")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding: 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5; font-style: italic;">${content.closingMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer - Dark Teal -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d4f5f 0%, #0f766e 100%); padding: 22px 24px; text-align: center;">
              <p style="color: rgba(255,255,255,0.75); margin: 0; font-size: 12px;">This is an automated medical alert. Please do not reply to this email.</p>
              <p style="color: rgba(255,255,255,0.6); margin: 10px 0 0 0; font-size: 11px;">© 2026 Hospital Systems</p>
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
