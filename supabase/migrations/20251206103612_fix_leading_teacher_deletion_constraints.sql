/*
  # Fix Foreign Key Constraints for Leading Teacher Deletion

  ## Problem
  When deleting a leading teacher, the deletion fails due to foreign key constraints from:
  - Teachers assigned to that leading teacher (profiles.leading_teacher_id)
  - Lesson plans assigned to that leading teacher (lesson_plans.leading_teacher_id)
  - Approvals created by that leading teacher (approvals.leading_teacher_id)

  ## Solution
  1. Drop and recreate the foreign key constraint on profiles.leading_teacher_id with ON DELETE SET NULL
     - When a leading teacher is deleted, assigned teachers will have their leading_teacher_id set to NULL
  2. Add ON DELETE SET NULL to lesson_plans.leading_teacher_id constraint
     - When a leading teacher is deleted, lesson plans will have their leading_teacher_id set to NULL
  3. Keep approvals.leading_teacher_id as is (no change needed as approvals should remain for historical record)

  ## Changes
  - Modify profiles table foreign key constraint
  - Modify lesson_plans table foreign key constraint
*/

-- Drop existing foreign key constraint on profiles.leading_teacher_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_leading_teacher_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_leading_teacher_id_fkey;
  END IF;
END $$;

-- Recreate the constraint with ON DELETE SET NULL
ALTER TABLE profiles
  ADD CONSTRAINT profiles_leading_teacher_id_fkey
  FOREIGN KEY (leading_teacher_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Drop existing foreign key constraint on lesson_plans.leading_teacher_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lesson_plans_leading_teacher_id_fkey' 
    AND table_name = 'lesson_plans'
  ) THEN
    ALTER TABLE lesson_plans DROP CONSTRAINT lesson_plans_leading_teacher_id_fkey;
  END IF;
END $$;

-- Recreate the constraint with ON DELETE SET NULL and remove NOT NULL constraint
ALTER TABLE lesson_plans ALTER COLUMN leading_teacher_id DROP NOT NULL;

ALTER TABLE lesson_plans
  ADD CONSTRAINT lesson_plans_leading_teacher_id_fkey
  FOREIGN KEY (leading_teacher_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;
