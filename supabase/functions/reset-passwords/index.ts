import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const accounts = [
      { email: 'principal@school.com', password: 'principal123' },
      { email: 'ahmed.faris@school.com', password: 'leading123' },
      { email: 'ahmed.shareef.asyri@school.com', password: 'leading123' },
      { email: 'ahmed.shareef.bageecha@school.com', password: 'leading123' },
      { email: 'asif.ibrahim@school.com', password: 'leading123' },
      { email: 'ahmed.farish@school.com', password: 'teacher123' },
      { email: 'ahmed.fareed@school.com', password: 'teacher123' },
      { email: 'abdulla.shareef@school.com', password: 'teacher123' },
      { email: 'aminath.shauna@school.com', password: 'teacher123' },
      { email: 'anbukumaran.murugesan@school.com', password: 'teacher123' },
      { email: 'fareetha.yasmeen@school.com', password: 'teacher123' },
      { email: 'nouman.tholoor@school.com', password: 'teacher123' },
      { email: 'soba@school.com', password: 'teacher123' },
      { email: 'soni.mathew@school.com', password: 'teacher123' },
      { email: 'ali.nasir@school.com', password: 'teacher123' },
      { email: 'aminath.shiuraa@school.com', password: 'teacher123' },
      { email: 'azzam.mohamed@school.com', password: 'teacher123' },
      { email: 'fathuhulla.shathir@school.com', password: 'teacher123' },
      { email: 'leeza@school.com', password: 'teacher123' },
      { email: 'raishaa@school.com', password: 'teacher123' },
      { email: 'samiya@school.com', password: 'teacher123' },
      { email: 'zaahir@school.com', password: 'teacher123' },
      { email: 'aisath.rifasha@school.com', password: 'teacher123' },
      { email: 'safoora@school.com', password: 'teacher123' },
      { email: 'shani.biju@school.com', password: 'teacher123' },
      { email: 'sreesh@school.com', password: 'teacher123' },
      { email: 'mariyam.sanoona@school.com', password: 'teacher123' },
      { email: 'najudha@school.com', password: 'teacher123' },
      { email: 'ruyya@school.com', password: 'teacher123' },
      { email: 'shadiya@school.com', password: 'teacher123' },
      { email: 'sharoona@school.com', password: 'teacher123' },
      { email: 'sifzaa@school.com', password: 'teacher123' }
    ];

    const results = [];
    const errors = [];

    for (const account of accounts) {
      try {
        // Get user by email
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users?.find(u => u.email === account.email);

        if (user) {
          // Update password
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: account.password }
          );

          if (updateError) {
            errors.push({ email: account.email, error: updateError.message });
          } else {
            results.push({ email: account.email, status: 'password_updated' });
          }
        } else {
          errors.push({ email: account.email, error: 'User not found' });
        }
      } catch (err) {
        errors.push({ email: account.email, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${results.length} passwords`,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});