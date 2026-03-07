import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { client_id, client_number, full_name } = await req.json();

    if (!client_id || !client_number || !full_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = `${client_number}@client.vetcrm.local`;

    // Create auth user with confirmed email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "123456",
      email_confirm: true,
      user_metadata: { full_name, is_client: true },
    });

    if (authError) {
      console.error("Auth error:", authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    console.log("Created auth user:", userId, "for client:", client_number);

    // Wait a moment for the handle_new_user trigger to create profile & role
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile with client_id link
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ client_id })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError.message);
    }

    // Update role from default 'viewer' to 'client'
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "client" })
      .eq("user_id", userId);

    if (roleError) {
      console.error("Role update error:", roleError.message);
    }

    console.log("Client account setup complete for:", client_number);

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
