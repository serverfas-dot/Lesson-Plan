/*
  # Add Super Admin Lesson Plan Policies

  1. Changes
    - Add SELECT policy for super_admin to view all lesson plans
    - Add DELETE policy for super_admin to delete any lesson plan
    - Super admins need full control over lesson plan management
    
  2. Security
    - Policies restricted to authenticated users with super_admin role
    - Uses existing get_current_user_role() helper function
    - Allows complete lesson plan oversight and management

  3. Important Notes
    - Super admins can now view ALL lesson plans regardless of status
    - Super admins can delete ANY lesson plan (draft, submitted, approved, rejected)
    - This provides administrative control for system maintenance and data management
*/

-- Add policy for super admin to view all lesson plans
CREATE POLICY "Super admins view all lesson plans"
  ON lesson_plans
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'super_admin');

-- Add policy for super admin to delete any lesson plan
CREATE POLICY "Super admins delete any lesson plan"
  ON lesson_plans
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'super_admin');
