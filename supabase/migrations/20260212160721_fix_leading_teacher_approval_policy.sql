/*
  # Fix Leading Teacher Approval Policy
  
  ## Problem
  Leading teachers cannot approve lesson plans because the UPDATE policy is too restrictive.
  The policy needs to explicitly allow updating status and principal_status fields.
  
  ## Changes
  1. Drop the old "Leading teachers can update status of assigned lesson plans" policy
  2. Create a new policy that explicitly allows updating status and principal_status
     for submitted plans assigned to them
  
  ## Security
  - Policy checks that user is a leading teacher
  - Policy checks that the plan is assigned to the current leading teacher
  - Policy checks that the plan status is 'submitted' (ready for approval)
  - Only allows updating specific fields (status, principal_status)
*/

-- Drop the old policy
DROP POLICY IF EXISTS "Leading teachers can update status of assigned lesson plans" ON lesson_plans;

-- Create new policy for leading teachers to approve lesson plans
CREATE POLICY "Leading teachers can approve assigned lesson plans"
  ON lesson_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND lesson_plans.leading_teacher_id = profiles.id
    )
    AND status = 'submitted'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND lesson_plans.leading_teacher_id = profiles.id
    )
  );
