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
    
    const { action, userId, updates, daysToAdd, specificDate } = await req.json();

    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("users_extended")
          .select("*")
          .order("registered_at", { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        if (!userId || !updates) {
          throw new Error("userId and updates are required");
        }
        
        const { error } = await supabase
          .from("users_extended")
          .update(updates)
          .eq("user_id", userId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        if (!userId) {
          throw new Error("userId is required");
        }
        
        // First delete from users_extended
        const { error: extendedError } = await supabase
          .from("users_extended")
          .delete()
          .eq("user_id", userId);
        
        if (extendedError) throw extendedError;
        
        // Then delete the auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        
        if (authError) {
          console.error("Error deleting auth user:", authError);
          // Don't throw, the users_extended record is already deleted
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "extend": {
        if (!userId) {
          throw new Error("userId is required");
        }
        
        let newValidUntil: string;
        
        if (specificDate) {
          newValidUntil = new Date(specificDate).toISOString();
        } else if (daysToAdd) {
          // Get current valid_until
          const { data: user, error: fetchError } = await supabase
            .from("users_extended")
            .select("valid_until")
            .eq("user_id", userId)
            .single();
          
          if (fetchError) throw fetchError;
          
          const currentValidUntil = new Date(user.valid_until);
          const baseDate = currentValidUntil > new Date() ? currentValidUntil : new Date();
          baseDate.setDate(baseDate.getDate() + daysToAdd);
          newValidUntil = baseDate.toISOString();
        } else {
          throw new Error("daysToAdd or specificDate is required");
        }
        
        const { error } = await supabase
          .from("users_extended")
          .update({ valid_until: newValidUntil })
          .eq("user_id", userId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, newValidUntil }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
