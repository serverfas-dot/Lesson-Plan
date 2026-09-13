/*
  # Add Super Admin View All Policy

  1. Changes
    - Add RLS policy for super_admin role to view all profiles
    - Super admins need full visibility of all users in the system
    
  2. Security
    - Policy restricted to authenticated users with super_admin role
    - Uses existing get_current_user_role() helper function
*/

-- Add policy for super admin to view all profiles
CREATE POLICY "Super admins view all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'super_admin');
