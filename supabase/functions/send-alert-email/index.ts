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
    case "critical": return { main: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#991b1b", bannerBg: "#dc2626" };
    case "high": return { main: "#ea580c", bg: "#fff7ed", border: "#fed7aa", text: "#9a3412", bannerBg: "#ea580c" };
    default: return { main: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", bannerBg: "#16a34a" };
  }
};

const getAlertEmoji = (type: string) => {
  switch (type) {
    case "critical": return "🚨";
    case "high": return "⚠️";
    default: return "ℹ️";
  }
};

const getSeverityLabel = (type: string) => {
  switch (type) {
    case "critical": return "IMMEDIATE ATTENTION REQUIRED";
    case "high": return "CLOSE MONITORING NEEDED";
    default: return "ROUTINE CHECK ADVISED";
  }
};

const getPositionLabel = (position?: string) => {
  switch (position) {
    case "back": return "Supine (Back) - Safe";
    case "side": return "Lateral (Side) - Caution Required";
    case "prone": return "Prone (Stomach) - High Risk";
    default: return "Position Unknown";
  }
};

const getPositionColor = (position?: string) => {
  switch (position) {
    case "back": return "#16a34a";
    case "side": return "#ea580c";
    case "prone": return "#dc2626";
    default: return "#6b7280";
  }
};

const getClinicalReason = (reason?: string) => {
  if (!reason) return "Clinical observation requires assessment.";
  
  let clinical = reason;
  clinical = clinical.replace(/not recommended/gi, "poses elevated risk");
  clinical = clinical.replace(/side sleeping/gi, "lateral sleeping position detected");
  clinical = clinical.replace(/prone sleeping/gi, "prone position detected - increased SIDS risk");
  
  if (clinical.toLowerCase().includes("side") && clinical.toLowerCase().includes("position")) {
    return `Unsafe lateral sleeping position detected. This may increase the risk of positional asphyxia and airway obstruction. Immediate repositioning to supine position is recommended.`;
  }
  
  if (clinical.toLowerCase().includes("prone") && clinical.toLowerCase().includes("position")) {
    return `Prone sleeping position detected. This significantly increases the risk of Sudden Infant Death Syndrome (SIDS) and airway obstruction. Immediate intervention required.`;
  }
  
  if (clinical.toLowerCase().includes("heart rate") && (clinical.toLowerCase().includes("high") || clinical.toLowerCase().includes("above"))) {
    return `Tachycardia detected. Elevated heart rate may indicate distress, fever, pain, or cardiac abnormality. Clinical assessment and continuous monitoring required.`;
  }
  
  if (clinical.toLowerCase().includes("heart rate") && (clinical.toLowerCase().includes("low") || clinical.toLowerCase().includes("below"))) {
    return `Bradycardia detected. Low heart rate may indicate hypoxia, hypothermia, or cardiac conduction abnormality. Immediate clinical assessment required.`;
  }
  
  if (clinical.toLowerCase().includes("spo2") || clinical.toLowerCase().includes("oxygen")) {
    return `Oxygen desaturation detected. Low SpO₂ levels may indicate respiratory distress, airway obstruction, or pulmonary pathology. Immediate respiratory assessment required.`;
  }
  
  if (clinical.toLowerCase().includes("temperature") && clinical.toLowerCase().includes("high")) {
    return `Hyperthermia detected. Elevated body temperature may indicate infection, sepsis, or environmental factors. Clinical assessment and temperature management required.`;
  }
  
  if (clinical.toLowerCase().includes("temperature") && clinical.toLowerCase().includes("low")) {
    return `Hypothermia detected. Low body temperature may indicate cold stress, sepsis, or metabolic abnormality. Immediate warming and clinical assessment required.`;
  }
  
  return clinical;
};

const getVitalStatus = (vital: string, value: number | undefined): { color: string; status: string } => {
  if (value === undefined) return { color: "#6b7280", status: "N/A" };
  
  switch (vital) {
    case "heartRate":
      if (value < 100 || value > 180) return { color: "#dc2626", status: "ABNORMAL" };
      if (value < 110 || value > 170) return { color: "#ea580c", status: "WARNING" };
      return { color: "#16a34a", status: "NORMAL" };
    case "spo2":
      if (value < 90) return { color: "#dc2626", status: "CRITICAL" };
      if (value < 94) return { color: "#ea580c", status: "LOW" };
      return { color: "#16a34a", status: "NORMAL" };
    case "temperature":
      if (value < 36 || value > 38) return { color: "#dc2626", status: "ABNORMAL" };
      if (value < 36.5 || value > 37.5) return { color: "#ea580c", status: "WARNING" };
      return { color: "#16a34a", status: "NORMAL" };
    default:
      return { color: "#6b7280", status: "N/A" };
  }
};

async function generateAIContent(
  request: AlertEmailRequest,
  apiKey: string
): Promise<GeneratedContent> {
  console.log("Generating AI content for alert...");

  const systemPrompt = `You are a clinical decision support AI for a Neonatal Intensive Care Unit (NICU) monitoring system. 
Generate clear, professional, and medically appropriate alert content. Use proper medical terminology.
Keep the tone calm but appropriately urgent based on severity. Focus on actionable clinical guidance.`;

  const vitalsInfo = request.vitals 
    ? `Current Vital Signs:
- Heart Rate: ${request.vitals.heartRate ?? 'Not available'} BPM (Normal: 120-160 BPM)
- SpO₂: ${request.vitals.spo2 ?? 'Not available'}% (Normal: 95-100%)
- Temperature: ${request.vitals.temperature ?? 'Not available'}°C (Normal: 36.5-37.5°C)
- Movement Index: ${request.vitals.movement ?? 'Not available'}%
- Position: ${getPositionLabel(request.vitals.sleepingPosition)}`
    : 'Vital signs data not available';

  const userPrompt = `Generate NICU alert content for:
Patient: ${request.babyName} | Bed: ${request.bedNumber}
Alert Severity: ${request.alertType.toUpperCase()}
Clinical Trigger: ${request.triggerReason || request.message}
Alert Time: ${request.timestamp}

${vitalsInfo}

Respond with JSON only:
{"title":"Clear clinical alert title with patient name","medicalExplanation":"2-3 sentence clinical explanation of the concern, potential implications, and why immediate attention may be needed","riskLevel":"${request.alertType === 'critical' ? 'Immediate Attention Required' : request.alertType === 'high' ? 'Close Monitoring Needed' : 'Routine Check Advised'}","recommendation":"Specific step-by-step clinical actions: 1) Immediate action 2) Assessment steps 3) Escalation criteria","closingMessage":"Professional closing reminding to verify clinically before intervention"}`;

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
    const reason = getClinicalReason(request.triggerReason || request.message);
    return {
      title: `${request.alertType.toUpperCase()} NICU Alert - ${request.babyName} (Bed ${request.bedNumber})`,
      medicalExplanation: reason,
      riskLevel: request.alertType === 'critical' ? 'Immediate Attention Required' : 
                 request.alertType === 'high' ? 'Close Monitoring Needed' : 'Routine Check Advised',
      recommendation: request.alertType === 'critical' 
        ? '1. Immediately assess patient at bedside. 2. Verify all vital signs manually. 3. Check airway, breathing, and circulation. 4. Prepare for potential intervention. 5. Notify attending physician if condition persists.'
        : '1. Review patient status and vital signs. 2. Perform clinical assessment. 3. Document findings in patient chart. 4. Continue monitoring per protocol.',
      closingMessage: 'This is an automated alert from the NeoGuard NICU Monitoring System. Please verify all findings clinically before intervention.'
    };
  }
}

function generatePremiumEmailHTML(
  request: AlertEmailRequest,
  content: GeneratedContent
): string {
  const colors = getAlertColor(request.alertType);
  const emoji = getAlertEmoji(request.alertType);
  const severityLabel = getSeverityLabel(request.alertType);
  const alertLabel = request.alertType.toUpperCase();
  
  const heartRate = request.vitals?.heartRate;
  const spo2 = request.vitals?.spo2;
  const temperature = request.vitals?.temperature;
  const movement = request.vitals?.movement;
  const sleepingPosition = request.vitals?.sleepingPosition || 'unknown';
  const positionLabel = getPositionLabel(sleepingPosition);
  const positionColor = getPositionColor(sleepingPosition);
  
  const hrStatus = getVitalStatus("heartRate", heartRate);
  const spo2Status = getVitalStatus("spo2", spo2);
  const tempStatus = getVitalStatus("temperature", temperature);
  
  const clinicalReason = getClinicalReason(request.triggerReason || request.message);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoGuard NICU Alert - ${request.babyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0c4a6e 0%, #0e7490 100%); padding: 24px 28px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; margin-bottom: 8px;">
                      <span style="font-size: 32px;">🏥</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">NeoGuard NICU</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">Neonatal Intensive Care Monitoring System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: ${colors.bannerBg}; padding: 20px 28px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 36px; display: block; margin-bottom: 8px;">${emoji}</span>
                    <p style="color: #ffffff; margin: 0 0 4px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">${alertLabel} PRIORITY</p>
                    <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${severityLabel}</h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-left: 6px solid ${colors.main}; border-radius: 12px; padding: 20px;">
                <p style="color: ${colors.main}; margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  ⚡ ALERT TRIGGER
                </p>
                <p style="color: #0f172a; margin: 0; font-size: 16px; font-weight: 500; line-height: 1.6;">${clinicalReason}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <p style="color: #475569; margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  👶 PATIENT INFORMATION
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding: 8px 0; vertical-align: top;">
                      <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">Patient Name</p>
                      <p style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 700;">${request.babyName}</p>
                    </td>
                    <td width="50%" style="padding: 8px 0; vertical-align: top;">
                      <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">Bed Number</p>
                      <p style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 700;">${request.bedNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 8px 0; vertical-align: top;">
                      <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">Patient ID</p>
                      <p style="color: #475569; margin: 0; font-size: 14px; font-family: monospace;">${request.babyId ? request.babyId.substring(0, 8).toUpperCase() : 'N/A'}</p>
                    </td>
                    <td width="50%" style="padding: 8px 0; vertical-align: top;">
                      <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">Alert Time</p>
                      <p style="color: #0f172a; margin: 0; font-size: 14px; font-weight: 600;">${request.timestamp}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <p style="color: #475569; margin: 0 0 20px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  ❤️ VITAL SIGNS SNAPSHOT
                </p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 8px;">
                  <tr>
                    <td style="background-color: #fef2f2; border-radius: 8px; padding: 12px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <span style="font-size: 24px;">❤️</span>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 500;">Heart Rate</p>
                            <p style="color: ${hrStatus.color}; margin: 4px 0 0 0; font-size: 22px; font-weight: 700;">${heartRate ?? '—'} <span style="font-size: 14px; font-weight: 400; color: #94a3b8;">BPM</span></p>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <p style="color: #94a3b8; margin: 0; font-size: 11px;">Normal: 120-160</p>
                            <span style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${hrStatus.color}; color: #ffffff;">${hrStatus.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #eff6ff; border-radius: 8px; padding: 12px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <span style="font-size: 24px;">💨</span>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 500;">Oxygen Saturation</p>
                            <p style="color: ${spo2Status.color}; margin: 4px 0 0 0; font-size: 22px; font-weight: 700;">${spo2 ?? '—'}<span style="font-size: 14px; font-weight: 400; color: #94a3b8;">%</span></p>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <p style="color: #94a3b8; margin: 0; font-size: 11px;">Normal: 95-100%</p>
                            <span style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${spo2Status.color}; color: #ffffff;">${spo2Status.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #fefce8; border-radius: 8px; padding: 12px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <span style="font-size: 24px;">🌡️</span>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 500;">Body Temperature</p>
                            <p style="color: ${tempStatus.color}; margin: 4px 0 0 0; font-size: 22px; font-weight: 700;">${temperature ?? '—'}<span style="font-size: 14px; font-weight: 400; color: #94a3b8;">°C</span></p>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <p style="color: #94a3b8; margin: 0; font-size: 11px;">Normal: 36.5-37.5°C</p>
                            <span style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${tempStatus.color}; color: #ffffff;">${tempStatus.status}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #f5f3ff; border-radius: 8px; padding: 12px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <span style="font-size: 24px;">🛏️</span>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 500;">Sleeping Position</p>
                            <p style="color: ${positionColor}; margin: 4px 0 0 0; font-size: 16px; font-weight: 700;">${positionLabel}</p>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <p style="color: #94a3b8; margin: 0; font-size: 11px;">Safe: Back</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #ecfdf5; border-radius: 8px; padding: 12px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" valign="middle">
                            <span style="font-size: 24px;">📊</span>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 500;">Movement Index</p>
                            <p style="color: #0f172a; margin: 4px 0 0 0; font-size: 22px; font-weight: 700;">${movement ?? '—'}<span style="font-size: 14px; font-weight: 400; color: #94a3b8;">%</span></p>
                          </td>
                          <td style="text-align: right;" valign="middle">
                            <p style="color: #94a3b8; margin: 0; font-size: 11px;">Activity Level</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <p style="color: #475569; margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  🔬 CLINICAL ANALYSIS
                </p>
                <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">${content.title}</h3>
                <p style="color: #334155; margin: 0; font-size: 15px; line-height: 1.7;">${content.medicalExplanation}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px 0;">
              <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 20px;">
                <p style="color: ${colors.main}; margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  ⚕️ RECOMMENDED ACTIONS
                </p>
                <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.8; white-space: pre-line;">${content.recommendation}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 28px;">
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center;">
                <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.6;">${content.closingMessage}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0c4a6e; padding: 20px 28px; text-align: center;">
              <p style="color: rgba(255,255,255,0.9); margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">NeoGuard NICU Monitoring System</p>
              <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 11px;">This is an automated medical alert. Please do not reply to this email.</p>
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
  console.log("Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    let aiContent: GeneratedContent;
    if (LOVABLE_API_KEY) {
      console.log("Generating AI-powered email content via Lovable AI Gateway...");
      aiContent = await generateAIContent(requestBody, LOVABLE_API_KEY);
      console.log("AI content generated successfully");
    } else {
      console.log("Lovable AI not configured, using default content");
      const reason = getClinicalReason(triggerReason || message);
      aiContent = {
        title: `${alertType.toUpperCase()} NICU Alert - ${babyName} (Bed ${bedNumber})`,
        medicalExplanation: reason,
        riskLevel: alertType === 'critical' ? 'Immediate Attention Required' : 
                   alertType === 'high' ? 'Close Monitoring Needed' : 'Routine Check Advised',
        recommendation: alertType === 'critical' 
          ? '1. Immediately assess patient at bedside.\n2. Verify all vital signs manually.\n3. Check airway, breathing, and circulation.\n4. Prepare for potential intervention.\n5. Notify attending physician if condition persists.'
          : '1. Review patient status and vital signs.\n2. Perform clinical assessment.\n3. Document findings in patient chart.\n4. Continue monitoring per protocol.',
        closingMessage: 'This is an automated alert from the NeoGuard NICU Monitoring System. Please verify all findings clinically before intervention.'
      };
    }

    const htmlContent = generatePremiumEmailHTML(requestBody, aiContent);

    const senderEmail = "nagapoojithtn@gmail.com";
    const senderName = "NeoGuard NICU Alert";
    
    console.log("=== SENDER CONFIGURATION ===");
    console.log(`  Sender Name: ${senderName}`);
    console.log(`  Sender Email: ${senderEmail}`);

    const subjectLine = `${getAlertEmoji(alertType)} ${alertType.toUpperCase()} NICU ALERT | Baby ${babyName.toUpperCase()} | Bed ${bedNumber}`;

    const emailPayload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [{ email: to }],
      subject: subjectLine,
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

    const emailResult = JSON.parse(responseBody);
    console.log("=== EMAIL SENT SUCCESSFULLY ===");
    console.log(`  Message ID: ${emailResult.messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult.messageId,
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
