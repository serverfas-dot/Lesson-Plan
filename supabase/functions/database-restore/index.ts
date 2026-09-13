import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (!profile || profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin only.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { backupPath } = await req.json();

    if (!backupPath) {
      return new Response(
        JSON.stringify({ error: 'Backup path is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: backupFile, error: downloadError } = await supabase.storage
      .from('database-backups')
      .download(backupPath);

    if (downloadError || !backupFile) {
      throw new Error('Failed to download backup file');
    }

    const backupText = await backupFile.text();
    const backupData = JSON.parse(backupText);

    if (!backupData.tables || typeof backupData.tables !== 'object') {
      throw new Error('Invalid backup format');
    }

    const restoredTables: string[] = [];
    const errors: any[] = [];

    const TABLES_TO_RESTORE = [
      'lesson_plan_field_labels',
      'backup_schedules'
    ];

    for (const tableName of TABLES_TO_RESTORE) {
      if (backupData.tables[tableName] && Array.isArray(backupData.tables[tableName])) {
        try {
          const records = backupData.tables[tableName];

          if (records.length > 0) {
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');

            if (deleteError) {
              console.error(`Error clearing ${tableName}:`, deleteError);
            }

            const { error: insertError } = await supabase
              .from(tableName)
              .insert(records);

            if (insertError) {
              errors.push({ table: tableName, error: insertError.message });
            } else {
              restoredTables.push(tableName);
            }
          }
        } catch (err) {
          errors.push({
            table: tableName,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        restoredTables,
        errors: errors.length > 0 ? errors : undefined,
        message: `Restored ${restoredTables.length} tables successfully`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Restore error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Restore failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
