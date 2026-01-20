import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, userId, deviceId, deviceInfo } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    switch (action) {
      case "validate": {
        if (!deviceId) {
          throw new Error("deviceId is required for validation");
        }

        // Fetch current user's device binding and whitelist status
        const { data: user, error: fetchError } = await supabase
          .from("users_extended")
          .select("device_id, device_bound_at, is_whitelisted")
          .eq("user_id", userId)
          .single();

        if (fetchError) {
          console.error("Error fetching user:", fetchError);
          throw new Error("User not found");
        }

        // Case 0: User is whitelisted - skip all device checks
        if (user.is_whitelisted === true) {
          console.log(`User ${userId} is whitelisted - skipping device validation`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              whitelisted: true, 
              message: "User is whitelisted - device validation skipped" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Case 1: First login - no device bound yet
        if (!user.device_id) {
          const { error: updateError } = await supabase
            .from("users_extended")
            .update({
              device_id: deviceId,
              device_bound_at: new Date().toISOString(),
              device_info: deviceInfo || null,
            })
            .eq("user_id", userId);

          if (updateError) {
            console.error("Error binding device:", updateError);
            throw new Error("Failed to bind device");
          }

          console.log(`Device bound for user ${userId}`);
          return new Response(
            JSON.stringify({ success: true, bound: true, message: "Device bound successfully" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Case 2: Device matches - allow login
        if (user.device_id === deviceId) {
          console.log(`Device matched for user ${userId}`);
          return new Response(
            JSON.stringify({ success: true, matched: true, message: "Device matched" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Case 3: Device mismatch - block login
        console.log(`Device mismatch for user ${userId}. Expected: ${user.device_id}, Got: ${deviceId}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "DEVICE_MISMATCH",
            message: "This account is bound to a different device" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset": {
        // Admin action to clear device binding
        const { error: resetError } = await supabase
          .from("users_extended")
          .update({
            device_id: null,
            device_bound_at: null,
            device_info: null,
          })
          .eq("user_id", userId);

        if (resetError) {
          console.error("Error resetting device:", resetError);
          throw new Error("Failed to reset device binding");
        }

        console.log(`Device reset for user ${userId}`);
        return new Response(
          JSON.stringify({ success: true, message: "Device binding reset successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
