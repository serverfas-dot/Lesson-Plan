/*
  # Database Backup System

  1. New Tables
    - `backup_schedules`
      - `id` (uuid, primary key)
      - `backup_type` (text) - 'manual', 'weekly', or 'monthly'
      - `is_enabled` (boolean) - Whether automatic backups are enabled
      - `last_backup_at` (timestamptz) - Last backup timestamp
      - `next_backup_at` (timestamptz) - Next scheduled backup
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `backup_history`
      - `id` (uuid, primary key)
      - `backup_type` (text) - 'manual', 'weekly', or 'monthly'
      - `backup_name` (text) - Name of the backup file
      - `backup_size` (bigint) - Size in bytes
      - `storage_path` (text) - Path in storage bucket
      - `tables_included` (jsonb) - List of tables backed up
      - `created_by` (uuid) - Reference to super admin who created it
      - `created_at` (timestamptz)
      - `status` (text) - 'completed', 'failed', 'in_progress'
      - `error_message` (text) - Error details if failed

  2. Storage
    - Create storage bucket for backups

  3. Security
    - Enable RLS on both tables
    - Only super admins can access backup system
*/

-- Create backup_schedules table
CREATE TABLE IF NOT EXISTS backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL CHECK (backup_type IN ('weekly', 'monthly')),
  is_enabled boolean DEFAULT false,
  last_backup_at timestamptz,
  next_backup_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(backup_type)
);

-- Create backup_history table
CREATE TABLE IF NOT EXISTS backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL CHECK (backup_type IN ('manual', 'weekly', 'monthly')),
  backup_name text NOT NULL,
  backup_size bigint DEFAULT 0,
  storage_path text NOT NULL,
  tables_included jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'in_progress' CHECK (status IN ('completed', 'failed', 'in_progress')),
  error_message text
);

-- Enable RLS
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

-- Policies for backup_schedules
CREATE POLICY "Super admins can view backup schedules"
  ON backup_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update backup schedules"
  ON backup_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert backup schedules"
  ON backup_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policies for backup_history
CREATE POLICY "Super admins can view backup history"
  ON backup_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert backup history"
  ON backup_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete backup history"
  ON backup_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Insert default schedule records
INSERT INTO backup_schedules (backup_type, is_enabled) VALUES
  ('weekly', false),
  ('monthly', false)
ON CONFLICT (backup_type) DO NOTHING;

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Super admins can upload backups"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'database-backups' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view backups"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'database-backups' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete backups"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'database-backups' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
