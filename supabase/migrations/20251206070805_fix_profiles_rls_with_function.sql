/*
  # Fix RLS with Helper Function in Public Schema

  1. Problem
    - Cannot create function in auth schema
    - Need to prevent recursion in policy checks
  
  2. Solution
    - Create function in public schema
    - Use security definer to bypass RLS when checking role
    - Recreate policies with function-based role checks
  
  3. Changes
    - Create get_current_user_role() function
    - Recreate all SELECT policies
*/

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "View own profile" ON profiles;
DROP POLICY IF EXISTS "Principals view all" ON profiles;
DROP POLICY IF EXISTS "Leading teachers view team" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Principals can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Leading teachers can view team" ON profiles;

-- Create helper function that bypasses RLS to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policy 1: Users can view their own profile
CREATE POLICY "View own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Principals can view all profiles
CREATE POLICY "Principals view all"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'principal');

-- Policy 3: Leading teachers can view their assigned teachers
CREATE POLICY "Leading teachers view team"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'leading_teacher' 
    AND leading_teacher_id = auth.uid()
  );
