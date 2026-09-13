import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const TABLES_TO_BACKUP = [
  'profiles',
  'lesson_plans',
  'lesson_plan_field_labels',
  'revision_history',
  'backup_schedules',
  'backup_history'
];

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

    const { backupType = 'manual' } = await req.json();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${backupType}_${timestamp}.json`;
    const storagePath = `backups/${backupName}`;

    const backupData: any = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      backupType,
      tables: {}
    };

    for (const tableName of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (!error && data) {
          backupData.tables[tableName] = data;
        }
      } catch (err) {
        console.error(`Error backing up table ${tableName}:`, err);
      }
    }

    const backupJson = JSON.stringify(backupData, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });
    const backupSize = backupBlob.size;

    const { error: uploadError } = await supabase.storage
      .from('database-backups')
      .upload(storagePath, backupBlob, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: historyError } = await supabase
      .from('backup_history')
      .insert({
        backup_type: backupType,
        backup_name: backupName,
        backup_size: backupSize,
        storage_path: storagePath,
        tables_included: Object.keys(backupData.tables),
        created_by: user.id,
        status: 'completed'
      });

    if (historyError) {
      console.error('Error saving backup history:', historyError);
    }

    if (backupType !== 'manual') {
      await supabase
        .from('backup_schedules')
        .update({
          last_backup_at: new Date().toISOString(),
          next_backup_at: calculateNextBackup(backupType),
          updated_at: new Date().toISOString()
        })
        .eq('backup_type', backupType);
    }

    return new Response(
      JSON.stringify({
        success: true,
        backupName,
        backupSize,
        tablesBackedUp: Object.keys(backupData.tables).length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Backup failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateNextBackup(backupType: string): string {
  const now = new Date();
  if (backupType === 'weekly') {
    now.setDate(now.getDate() + 7);
  } else if (backupType === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}
