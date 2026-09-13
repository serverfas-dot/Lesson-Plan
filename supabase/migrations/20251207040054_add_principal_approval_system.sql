/*
  # Add Principal Approval System

  1. New Tables
    - `principal_approvals` - Stores principal approvals for lesson plans
      - `id` (uuid, primary key)
      - `lesson_plan_id` (uuid, foreign key to lesson_plans)
      - `principal_id` (uuid, foreign key to profiles)
      - `principal_name` (text)
      - `signature_url` (text)
      - `approved_at` (timestamptz)
      - `comments` (text, nullable)
  
  2. Changes
    - Add `principal_status` field to lesson_plans to track principal approval state
    - Update RLS policies for new table
  
  3. Security
    - Enable RLS on `principal_approvals` table
    - Add policy for principals to create approvals
    - Add policy for authenticated users to read approvals
*/

-- Add principal_status to lesson_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'principal_status'
  ) THEN
    ALTER TABLE lesson_plans 
    ADD COLUMN principal_status text DEFAULT 'pending' 
    CHECK (principal_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Create principal_approvals table
CREATE TABLE IF NOT EXISTS principal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id uuid NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  principal_name text NOT NULL,
  signature_url text NOT NULL,
  approved_at timestamptz DEFAULT now(),
  comments text DEFAULT ''
);

-- Enable RLS
ALTER TABLE principal_approvals ENABLE ROW LEVEL SECURITY;

-- Principals can create their own approvals
CREATE POLICY "Principals can create approvals"
  ON principal_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  );

-- Authenticated users can view all principal approvals
CREATE POLICY "Authenticated users can view principal approvals"
  ON principal_approvals FOR SELECT
  TO authenticated
  USING (true);

-- Super admins can do everything
CREATE POLICY "Super admins can manage principal approvals"
  ON principal_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );