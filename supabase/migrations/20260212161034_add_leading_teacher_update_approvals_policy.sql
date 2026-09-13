/*
  # Add Leading Teacher Update Approvals Policy
  
  ## Problem
  Leading teachers cannot update existing approval records.
  When using upsert, we need both INSERT and UPDATE policies.
  
  ## Changes
  1. Add UPDATE policy for leading teachers to update their own approvals
  
  ## Security
  - Policy ensures leading teachers can only update their own approvals
  - Checks that auth.uid() matches leading_teacher_id
*/

-- Create UPDATE policy for leading teachers to update their approvals
CREATE POLICY "Leading teachers can update their own approvals"
  ON approvals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = leading_teacher_id)
  WITH CHECK (auth.uid() = leading_teacher_id);
