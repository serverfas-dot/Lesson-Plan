/*
  # Add Super Admin CRUD Policies

  1. Changes
    - Add INSERT policy for super admin to create new user profiles
    - Add UPDATE policy for super admin to edit any user profile
    - Add DELETE policy for super admin to remove user profiles
    
  2. Security
    - All policies restricted to authenticated users with super_admin role
    - Uses existing get_current_user_role() helper function
    - Super admins have full CRUD access to manage system users
*/

-- Super admin can insert new profiles
CREATE POLICY "Super admins insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() = 'super_admin');

-- Super admin can update any profile
CREATE POLICY "Super admins update all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() = 'super_admin')
  WITH CHECK (get_current_user_role() = 'super_admin');

-- Super admin can delete any profile
CREATE POLICY "Super admins delete all"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'super_admin');
