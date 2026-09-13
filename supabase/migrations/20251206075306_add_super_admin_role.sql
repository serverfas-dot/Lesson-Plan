/*
  # Add Super Admin Role Support

  1. Changes
    - Update role type to include 'super_admin'
    - Super admins can manage all users and reset passwords
  
  2. Security
    - Super admin has highest privileges
    - Can view and manage all teachers, leading teachers, and principals
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) THEN
    CREATE TYPE user_role AS ENUM ('teacher', 'leading_teacher', 'principal', 'super_admin');
  ELSE
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
  END IF;
END $$;