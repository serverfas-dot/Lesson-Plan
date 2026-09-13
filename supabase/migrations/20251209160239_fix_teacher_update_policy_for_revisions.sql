/*
  # Fix Teacher Update Policy for Revision Requests

  ## Changes
  - Update the "Teachers can update their own draft lesson plans" policy to also allow updates when a revision has been requested
  - Teachers can now edit lesson plans when:
    - Status is 'draft', OR
    - A revision has been requested (revision_requested_by is not null)
  
  ## Security
  - Teachers can still only update their own lesson plans
  - This allows teachers to resubmit lesson plans after revisions are requested
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Teachers can update their own draft lesson plans" ON lesson_plans;

-- Create updated policy that allows updates for drafts OR when revision is requested
CREATE POLICY "Teachers can update their own lesson plans"
  ON lesson_plans FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = teacher_id 
    AND (status = 'draft' OR revision_requested_by IS NOT NULL)
  )
  WITH CHECK (auth.uid() = teacher_id);
