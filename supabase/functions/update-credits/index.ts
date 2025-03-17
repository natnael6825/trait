import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { user_id, subscription_id } = await req.json();

    if (!user_id || !subscription_id) {
      throw new Error("Missing required parameters");
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } =
      await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("id", subscription_id)
        .single();

    if (subscriptionError) {
      throw new Error(
        `Error fetching subscription: ${subscriptionError.message}`,
      );
    }

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Determine credits to add based on plan
    let creditsToAdd = 0;

    if (subscription.product === "BASIC") {
      creditsToAdd = 5;
    } else if (subscription.product === "PRO") {
      creditsToAdd = 25;
    } else if (subscription.product === "ENTERPRISE") {
      creditsToAdd = 100;
    } else {
      creditsToAdd = 5; // Default fallback
    }

    // Get current user credits
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("credits")
      .eq("id", user_id)
      .single();

    if (userError) {
      throw new Error(`Error fetching user: ${userError.message}`);
    }

    // Calculate new credits total
    const currentCredits = parseInt(userData.credits || "0");
    const newCredits = currentCredits + creditsToAdd;

    // Update user credits
    const { error: updateError } = await supabaseClient
      .from("users")
      .update({ credits: newCredits.toString() })
      .eq("id", user_id);

    if (updateError) {
      throw new Error(`Error updating credits: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${creditsToAdd} credits to user account`,
        new_total: newCredits,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
