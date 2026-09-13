/*
  # Update Profile Role Constraint

  1. Changes
    - Drop existing role constraint
    - Add new constraint that includes super_admin role
  
  2. Security
    - Maintains role validation while allowing super_admin
*/

-- Drop the existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with super_admin included
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('teacher', 'leading_teacher', 'principal', 'super_admin'));