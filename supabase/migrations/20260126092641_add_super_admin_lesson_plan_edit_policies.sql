/*
  # Add Super Admin Lesson Plan Edit Policies

  1. Changes
    - Add INSERT policy for super_admin to create lesson plans
    - Add UPDATE policy for super_admin to edit any lesson plan field
    - Super admins have complete control over all lesson plan data
    
  2. Security
    - Policies restricted to authenticated users with super_admin role
    - Uses existing get_current_user_role() helper function
    - Allows full CRUD operations on lesson plans

  3. Important Notes
    - Super admins can create lesson plans on behalf of teachers
    - Super admins can edit ALL fields of ANY lesson plan (title, content, status, etc.)
    - Super admins can modify lesson plans regardless of their status
    - This enables complete administrative oversight and data management
*/

-- Add policy for super admin to insert (create) lesson plans
CREATE POLICY "Super admins create lesson plans"
  ON lesson_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() = 'super_admin');

-- Add policy for super admin to update any lesson plan
CREATE POLICY "Super admins update all lesson plans"
  ON lesson_plans
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() = 'super_admin')
  WITH CHECK (get_current_user_role() = 'super_admin');
