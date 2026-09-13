/*
  # Add Delete Policy for Leading Teacher Approvals
  
  ## Problem
  When a leading teacher requests changes to a lesson plan that was already approved:
  1. The approval record remains in the database
  2. When the teacher resubmits after corrections
  3. The leading teacher tries to approve again
  4. The unique constraint on approvals.lesson_plan_id prevents a second approval
  5. This causes the approval to fail with a duplicate key error
  
  ## Solution
  Add a DELETE policy that allows leading teachers to delete their own approval records.
  This enables the workflow:
  1. Leading teacher approves → creates approval record
  2. Leading teacher requests changes → deletes approval record + sets revision fields
  3. Teacher corrects and resubmits
  4. Leading teacher approves again → creates new approval record (no conflict)
  
  ## Changes
  - Add DELETE policy for leading teachers on approvals table
  - Leading teachers can only delete their own approvals (where leading_teacher_id = auth.uid())
  
  ## Security
  - Restricts deletion to authenticated users
  - Only allows deletion of approvals created by the requesting leading teacher
  - Maintains audit trail through revision_history table
*/

-- Allow leading teachers to delete their own approval records
CREATE POLICY "Leading teachers can delete their own approvals"
  ON approvals FOR DELETE
  TO authenticated
  USING (auth.uid() = leading_teacher_id);