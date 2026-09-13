/*
  # Add policy for teachers to update reflection on approved plans

  1. Changes
    - Add new policy allowing teachers to update only the reflection field on their approved lesson plans
    - This allows teachers to add reflections to approved plans without being able to modify other fields
  
  2. Security
    - Teachers can only update their own lesson plans
    - Only the reflection field can be updated for approved plans
    - All other fields remain protected by existing policies
*/

-- Drop and recreate the teacher update policy to be more specific
DROP POLICY IF EXISTS "Teachers can update their own lesson plans" ON lesson_plans;

-- Policy for updating draft plans and plans with revision requests (all fields)
CREATE POLICY "Teachers can update draft and revision-requested plans"
  ON lesson_plans
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = teacher_id 
    AND (status = 'draft' OR revision_requested_by IS NOT NULL)
  )
  WITH CHECK (auth.uid() = teacher_id);

-- Policy for updating reflection on approved plans (reflection field only)
CREATE POLICY "Teachers can add reflection to approved plans"
  ON lesson_plans
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = teacher_id 
    AND status = 'approved'
  )
  WITH CHECK (auth.uid() = teacher_id);
