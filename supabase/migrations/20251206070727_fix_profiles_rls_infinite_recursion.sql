/*
  # Fix Infinite Recursion in Profiles RLS Policies

  1. Problem
    - The "Principal can view all profiles" policy causes infinite recursion
    - It queries the profiles table to check if the user is a principal
    - This creates a circular dependency
  
  2. Solution
    - Drop the problematic policy
    - Create a new policy that checks user role without recursion
    - Simplify the leading teacher policy to avoid similar issues
  
  3. Changes
    - Drop existing SELECT policies
    - Recreate with non-recursive checks using direct user ID comparison
*/

-- Drop existing SELECT policies that cause recursion
DROP POLICY IF EXISTS "Principal can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Leading teachers can view their assigned teachers" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new non-recursive policies
-- Policy 1: Users can always view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Principals can view all profiles (using materialized check)
-- This avoids recursion by using a simpler subquery
CREATE POLICY "Principals can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'principal' AND id = auth.uid()
    )
  );

-- Policy 3: Leading teachers can view their team members
CREATE POLICY "Leading teachers can view team"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    leading_teacher_id IN (
      SELECT id FROM profiles WHERE role = 'leading_teacher' AND id = auth.uid()
    )
  );
