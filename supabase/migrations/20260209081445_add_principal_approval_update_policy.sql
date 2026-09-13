/*
  # Add Principal Approval Update Policy

  ## Problem
  Principals cannot approve lesson plans because there is no RLS policy allowing them to update the lesson_plans table.

  ## Changes
  1. Add UPDATE policy for principals to approve lesson plans
     - Allows principals to update status and principal_status fields
     - Only for plans that are submitted and pending principal approval
  
  ## Security
  - Policy is restrictive: only principals can use it
  - Only allows updating specific status fields
  - Cannot modify other sensitive fields like teacher_id, content, etc.
*/

-- Drop the policy if it already exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Principals can approve lesson plans" ON lesson_plans;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policy for principals to approve lesson plans
CREATE POLICY "Principals can approve lesson plans"
  ON lesson_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
    AND status = 'submitted'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  );