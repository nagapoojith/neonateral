import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

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
}

const getAlertColor = (type: string) => {
  switch (type) {
    case "critical": return "#dc2626";
    case "high": return "#f59e0b";
    default: return "#22c55e";
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send alert email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const { to, babyName, bedNumber, alertType, message, timestamp }: AlertEmailRequest = await req.json();
    
    console.log(`Sending ${alertType} alert email to ${to} for baby ${babyName}`);

    const alertColor = getAlertColor(alertType);
    const alertLabel = alertType.toUpperCase();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Neonatal Monitoring System</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Alert Notification</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background-color: ${alertColor}; color: white; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: bold;">⚠️ ${alertLabel} PRIORITY ALERT</span>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Baby Name:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${babyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Bed Number:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${bedNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${timestamp}</td>
          </tr>
        </table>
      </div>
      
      <div style="border-left: 4px solid ${alertColor}; padding-left: 16px; margin-bottom: 24px;">
        <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Alert Message</h3>
        <p style="color: #475569; margin: 0; line-height: 1.6;">${message}</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          This is an automated alert from the Neonatal Monitoring System.<br>
          Please respond promptly to ensure patient safety.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Neonatal Monitoring System",
          email: "noreply@neonatalmonitor.com"
        },
        to: [{ email: to }],
        subject: `🚨 [${alertLabel}] Alert for ${babyName} - Bed ${bedNumber}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", response.status, errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
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
