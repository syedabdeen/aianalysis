import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company settings
    const { data: companySettings, error: settingsError } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !companySettings) {
      console.log("No company settings found");
      return new Response(
        JSON.stringify({ success: true, message: "No company settings found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const expiryDate = new Date(companySettings.trade_license_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Trade license expires in ${daysUntilExpiry} days`);

    // Only send notification if expiring within 15 days
    if (daysUntilExpiry > 15) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `License valid for ${daysUntilExpiry} days, no notification needed` 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError || !adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin users found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin profiles with emails
    const adminIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminIds)
      .not("email", "is", null);

    if (profilesError || !adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles with emails found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin profiles with emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare email content
    const isExpired = daysUntilExpiry <= 0;
    const subject = isExpired 
      ? `⚠️ Trade License Expired - ${companySettings.company_name_en}`
      : `⚠️ Trade License Expiring in ${daysUntilExpiry} Days - ${companySettings.company_name_en}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${isExpired ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">
            ${isExpired ? '⚠️ Trade License Expired' : '⚠️ Trade License Expiring Soon'}
          </h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;">Dear Administrator,</p>
          
          <p>
            ${isExpired 
              ? `The trade license for <strong>${companySettings.company_name_en}</strong> has <strong style="color: #dc2626;">expired</strong>.`
              : `The trade license for <strong>${companySettings.company_name_en}</strong> will expire in <strong style="color: #f59e0b;">${daysUntilExpiry} days</strong>.`
            }
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0; color: #374151;">License Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Company Name:</td>
                <td style="padding: 8px 0; font-weight: bold;">${companySettings.company_name_en}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">License Number:</td>
                <td style="padding: 8px 0; font-weight: bold;">${companySettings.trade_license_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Expiry Date:</td>
                <td style="padding: 8px 0; font-weight: bold; color: ${isExpired ? '#dc2626' : '#f59e0b'};">
                  ${expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </td>
              </tr>
            </table>
          </div>
          
          <p>Please take immediate action to renew the trade license to ensure business continuity.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from ProcureMind.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails to all admins
    const emailPromises = adminProfiles.map(async (admin: AdminProfile) => {
      if (!admin.email) return null;

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: [{ email: admin.email, name: admin.full_name || admin.email }],
            subject,
            htmlBody,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to send email to ${admin.email}:`, await response.text());
          return { email: admin.email, success: false };
        }

        console.log(`Email sent to ${admin.email}`);
        return { email: admin.email, success: true };
      } catch (err) {
        console.error(`Error sending email to ${admin.email}:`, err);
        return { email: admin.email, success: false };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r?.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} notification emails for license expiring in ${daysUntilExpiry} days`,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-license-expiry function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get('origin')) } }
    );
  }
};

serve(handler);
