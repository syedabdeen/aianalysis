import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Secure CORS - restrict to allowed origins
const getAllowedOrigins = (): string[] => {
  const origins = [
    'https://procuremind.com',
    'https://www.procuremind.com',
    'https://0b762ee2-5a0e-4d35-a836-8d0aa2d5a8c9.lovableproject.com',
  ];
  
  const customOrigin = Deno.env.get('ALLOWED_ORIGIN');
  if (customOrigin) origins.push(customOrigin);
  
  const env = Deno.env.get('ENVIRONMENT');
  if (env !== 'production') {
    origins.push('http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000');
  }
  
  return origins.filter(Boolean);
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && allowedOrigins.some(o => origin.startsWith(o));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

interface EmailRequest {
  to: { email: string; name?: string }[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: { address: string; name?: string };
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  replyTo?: { address: string; name?: string };
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!apiKey) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const {
      to,
      subject,
      htmlBody,
      textBody,
      from,
      cc,
      bcc,
      replyTo,
    }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || to.length === 0) {
      throw new Error("At least one recipient is required");
    }
    if (!subject) {
      throw new Error("Subject is required");
    }
    if (!htmlBody) {
      throw new Error("HTML body is required");
    }

    // Build the ZeptoMail API payload
    const payload: Record<string, unknown> = {
      from: from || {
        address: "cmc@widelens.info",
        name: "ProcureMind",
      },
      to: to.map((recipient) => ({
        email_address: {
          address: recipient.email,
          name: recipient.name || recipient.email,
        },
      })),
      subject,
      htmlbody: htmlBody,
    };

    if (textBody) {
      payload.textbody = textBody;
    }

    if (cc && cc.length > 0) {
      payload.cc = cc.map((recipient) => ({
        email_address: {
          address: recipient.email,
          name: recipient.name || recipient.email,
        },
      }));
    }

    // Always include admin email as BCC for monitoring
    const adminBcc = { email: "cmc@widelens.info", name: "ProcureMind Admin" };
    const allBcc = bcc && bcc.length > 0 ? [...bcc, adminBcc] : [adminBcc];
    
    payload.bcc = allBcc.map((recipient) => ({
      email_address: {
        address: recipient.email,
        name: recipient.name || recipient.email,
      },
    }));

    if (replyTo) {
      payload.reply_to = [
        {
          address: replyTo.address,
          name: replyTo.name || replyTo.address,
        },
      ];
    }

    console.log("Sending email via ZeptoMail:", { to, subject });

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("ZeptoMail response status:", response.status);
    console.log("ZeptoMail response:", responseText);

    if (!response.ok) {
      throw new Error(`ZeptoMail API error: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data: result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-email function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
