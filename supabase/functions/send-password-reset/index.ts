import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const zeptoMailApiKey = Deno.env.get("ZEPTOMAIL_API_KEY");

    if (!zeptoMailApiKey) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { email }: PasswordResetRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user exists in auth.users
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      // Don't reveal if user exists
      return new Response(
        JSON.stringify({ success: true, message: "If this email is registered, you will receive a reset link." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user doesn't exist
      console.log("User not found for email:", email);
      return new Response(
        JSON.stringify({ success: true, message: "If this email is registered, you will receive a reset link." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate a secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing tokens for this user
    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Store the new token
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing reset token:", insertError);
      throw new Error("Failed to create reset token");
    }

    // Get the origin from the request headers or use a default
    const origin = req.headers.get("origin") || "https://aianalysis.lovable.app";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Send email via ZeptoMail
    const emailPayload = {
      from: {
        address: "cmc@widelens.info",
        name: "ProcureMind",
      },
      to: [
        {
          email_address: {
            address: email,
            name: email,
          },
        },
      ],
      subject: "Reset Your Password - ProcureMind",
      htmlbody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi,</p>
            
            <p style="font-size: 16px;">You requested to reset your password for your ProcureMind account.</p>
            
            <p style="font-size: 16px;">Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              This link will expire in <strong>1 hour</strong>.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px;">
            <p style="font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} ProcureMind. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    console.log("Sending password reset email to:", email);

    const emailResponse = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: zeptoMailApiKey,
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.text();
    console.log("ZeptoMail response status:", emailResponse.status);
    console.log("ZeptoMail response:", emailResult);

    if (!emailResponse.ok) {
      console.error("ZeptoMail error:", emailResult);
      throw new Error(`Failed to send email: ${emailResult}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-password-reset function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
