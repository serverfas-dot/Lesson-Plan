import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Account {
  email: string;
  password: string;
  role: string;
  name: string;
  subject?: string;
  leading_teacher_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accounts: Account[] = [
      { email: "principal@school.com", password: "principal123", role: "principal", name: "Dr. Sarah Johnson" },
      { email: "lt1@school.com", password: "leading123", role: "leading_teacher", name: "Mr. Michael Chen", subject: "Mathematics" },
      { email: "lt2@school.com", password: "leading123", role: "leading_teacher", name: "Ms. Emily Rodriguez", subject: "English" },
      { email: "lt3@school.com", password: "leading123", role: "leading_teacher", name: "Dr. James Williams", subject: "Science" },
      { email: "lt4@school.com", password: "leading123", role: "leading_teacher", name: "Mrs. Patricia Brown", subject: "History" },
    ];

    const results = [];
    const errors = [];
    const leadingTeacherIds: Record<string, string> = {};

    // Create principal and leading teachers first
    for (const account of accounts) {
      let userId: string | null = null;

      // Try to create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
      });

      if (authError) {
        // If user already exists, try to get their ID
        if (authError.message.includes("already been registered")) {
          const { data: userData } = await supabase.auth.admin.listUsers();
          const existingUser = userData?.users?.find(u => u.email === account.email);
          if (existingUser) {
            userId = existingUser.id;
          }
        }
        
        if (!userId) {
          errors.push({ email: account.email, error: authError.message });
          continue;
        }
      } else {
        userId = authData.user.id;
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        // Insert into profiles table
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          email: account.email,
          full_name: account.name,
          role: account.role,
          leading_teacher_id: null,
        });

        if (profileError) {
          errors.push({ email: account.email, error: profileError.message });
          continue;
        }
      }

      if (account.role === "leading_teacher") {
        leadingTeacherIds[account.email] = userId;
      }

      results.push({ email: account.email, status: "created" });
    }

    // Create teachers and assign to leading teachers
    const teachers: Account[] = [
      { email: "teacher1@school.com", password: "teacher123", role: "teacher", name: "Ms. Jennifer Davis", subject: "Mathematics", leading_teacher_id: "lt1@school.com" },
      { email: "teacher2@school.com", password: "teacher123", role: "teacher", name: "Mr. David Miller", subject: "Mathematics", leading_teacher_id: "lt1@school.com" },
      { email: "teacher3@school.com", password: "teacher123", role: "teacher", name: "Mrs. Lisa Anderson", subject: "Mathematics", leading_teacher_id: "lt1@school.com" },
      { email: "teacher4@school.com", password: "teacher123", role: "teacher", name: "Mr. Robert Taylor", subject: "Mathematics", leading_teacher_id: "lt1@school.com" },
      { email: "teacher5@school.com", password: "teacher123", role: "teacher", name: "Ms. Amanda White", subject: "English", leading_teacher_id: "lt2@school.com" },
      { email: "teacher6@school.com", password: "teacher123", role: "teacher", name: "Mr. Christopher Lee", subject: "English", leading_teacher_id: "lt2@school.com" },
      { email: "teacher7@school.com", password: "teacher123", role: "teacher", name: "Mrs. Maria Garcia", subject: "English", leading_teacher_id: "lt2@school.com" },
      { email: "teacher8@school.com", password: "teacher123", role: "teacher", name: "Mr. Thomas Martinez", subject: "English", leading_teacher_id: "lt2@school.com" },
      { email: "teacher9@school.com", password: "teacher123", role: "teacher", name: "Ms. Rebecca Wilson", subject: "Science", leading_teacher_id: "lt3@school.com" },
      { email: "teacher10@school.com", password: "teacher123", role: "teacher", name: "Mr. Daniel Moore", subject: "Science", leading_teacher_id: "lt3@school.com" },
      { email: "teacher11@school.com", password: "teacher123", role: "teacher", name: "Mrs. Jessica Thompson", subject: "Science", leading_teacher_id: "lt3@school.com" },
      { email: "teacher12@school.com", password: "teacher123", role: "teacher", name: "Mr. Kevin Harris", subject: "Science", leading_teacher_id: "lt3@school.com" },
      { email: "teacher13@school.com", password: "teacher123", role: "teacher", name: "Ms. Michelle Clark", subject: "History", leading_teacher_id: "lt4@school.com" },
      { email: "teacher14@school.com", password: "teacher123", role: "teacher", name: "Mr. Brian Lewis", subject: "History", leading_teacher_id: "lt4@school.com" },
      { email: "teacher15@school.com", password: "teacher123", role: "teacher", name: "Mrs. Nicole Young", subject: "History", leading_teacher_id: "lt4@school.com" },
      { email: "teacher16@school.com", password: "teacher123", role: "teacher", name: "Mr. Steven King", subject: "History", leading_teacher_id: "lt4@school.com" },
    ];

    for (const teacher of teachers) {
      let userId: string | null = null;

      // Try to create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: teacher.email,
        password: teacher.password,
        email_confirm: true,
      });

      if (authError) {
        // If user already exists, try to get their ID
        if (authError.message.includes("already been registered")) {
          const { data: userData } = await supabase.auth.admin.listUsers();
          const existingUser = userData?.users?.find(u => u.email === teacher.email);
          if (existingUser) {
            userId = existingUser.id;
          }
        }
        
        if (!userId) {
          errors.push({ email: teacher.email, error: authError.message });
          continue;
        }
      } else {
        userId = authData.user.id;
      }

      const leadingTeacherId = leadingTeacherIds[teacher.leading_teacher_id || ""];

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        // Insert into profiles table
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          email: teacher.email,
          full_name: teacher.name,
          role: teacher.role,
          leading_teacher_id: leadingTeacherId || null,
        });

        if (profileError) {
          errors.push({ email: teacher.email, error: profileError.message });
          continue;
        }
      }

      results.push({ email: teacher.email, status: "created" });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${results.length} accounts`,
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
