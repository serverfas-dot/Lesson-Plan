import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { method } = req;
    const body = method !== 'GET' && method !== 'DELETE' ? await req.json() : null;

    if (method === 'POST') {
      const { email, password, full_name, role, leading_teacher_id } = body;

      if (!email || !password || !full_name || !role) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name,
          role,
          leading_teacher_id: leading_teacher_id || null,
        });

      if (profileError) {
        return new Response(
          JSON.stringify({ error: profileError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, user: authData.user }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (method === 'PUT') {
      const { userId, full_name, role, leading_teacher_id, email } = body;

      if (!userId || !full_name || !role) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('email, role, leading_teacher_id')
        .eq('id', userId)
        .single();

      if (fetchError || !currentProfile) {
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const roleChanged = role !== currentProfile.role;
      const emailChanged = email && email.trim().toLowerCase() !== currentProfile.email.trim().toLowerCase();

      if (roleChanged) {
        if (role === 'teacher') {
          if (currentProfile.role === 'leading_teacher') {
            await supabase
              .from('profiles')
              .update({ leading_teacher_id: null })
              .eq('leading_teacher_id', userId);
          }

          if (currentProfile.role === 'principal') {
            await supabase
              .from('lesson_plans')
              .update({ leading_teacher_id: userId })
              .eq('teacher_id', userId)
              .is('leading_teacher_id', null);
          }
        } else if (role === 'leading_teacher') {
          await supabase
            .from('profiles')
            .update({ leading_teacher_id: null })
            .eq('id', userId);
        } else if (role === 'principal') {
          if (currentProfile.role === 'leading_teacher') {
            await supabase
              .from('profiles')
              .update({ leading_teacher_id: null })
              .eq('leading_teacher_id', userId);
          }
          await supabase
            .from('profiles')
            .update({ leading_teacher_id: null })
            .eq('id', userId);
        }
      }

      if (emailChanged) {
        const trimmedEmail = email.trim();

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', trimmedEmail)
          .neq('id', userId)
          .maybeSingle();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: 'Email already exists for another user' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const { data: authUpdateData, error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          { email: trimmedEmail }
        );

        if (authError) {
          console.error('Auth update error:', JSON.stringify({
            error: authError,
            message: authError.message,
            status: authError.status,
            userId,
            oldEmail: currentProfile.email,
            newEmail: trimmedEmail,
          }));

          return new Response(
            JSON.stringify({
              error: `Failed to update email: ${authError.message || 'Unknown error'}`,
              details: authError.status ? `Status: ${authError.status}` : undefined,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      const updateData: any = {
        full_name,
        role,
        leading_teacher_id: leading_teacher_id || null,
      };

      if (emailChanged) {
        updateData.email = email.trim();
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (method === 'PATCH') {
      const { userId, password } = body;

      if (!userId || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing userId or password' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (method === 'DELETE') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Missing userId parameter' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Delete revision_history rows referencing this user's lesson plans
      const { data: userPlans } = await supabase
        .from('lesson_plans')
        .select('id')
        .eq('teacher_id', userId);

      if (userPlans && userPlans.length > 0) {
        const planIds = userPlans.map((p: any) => p.id);
        await supabase.from('revision_history').delete().in('lesson_plan_id', planIds);
        await supabase.from('principal_approvals').delete().in('lesson_plan_id', planIds);
        await supabase.from('approvals').delete().in('lesson_plan_id', planIds);
      }

      // Delete lesson plans for this user
      await supabase.from('lesson_plans').delete().eq('teacher_id', userId);

      // Nullify leading_teacher references so other teachers are not orphaned
      await supabase
        .from('profiles')
        .update({ leading_teacher_id: null })
        .eq('leading_teacher_id', userId);

      // Delete the profile row explicitly
      await supabase.from('profiles').delete().eq('id', userId);

      // Finally delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
