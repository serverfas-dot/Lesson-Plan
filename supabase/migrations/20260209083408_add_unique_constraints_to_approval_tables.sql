/*
  # Add Unique Constraints to Approval Tables

  ## Problem
  Multiple approval records can be created for the same lesson plan, causing errors when loading approvals in the UI.

  ## Changes
  1. Add unique constraint to approvals table on lesson_plan_id
  2. Add unique constraint to principal_approvals table on lesson_plan_id
  3. Clean up duplicate approvals by keeping only the most recent one

  ## Security
  - Ensures data integrity
  - Prevents duplicate approvals
  - Maintains one approval record per lesson plan
*/

-- Clean up duplicate approvals in approvals table, keeping only the most recent
DO $$ 
DECLARE
  plan_id uuid;
BEGIN
  FOR plan_id IN 
    SELECT lesson_plan_id 
    FROM approvals 
    GROUP BY lesson_plan_id 
    HAVING COUNT(*) > 1
  LOOP
    DELETE FROM approvals 
    WHERE lesson_plan_id = plan_id 
    AND id NOT IN (
      SELECT id 
      FROM approvals 
      WHERE lesson_plan_id = plan_id 
      ORDER BY approved_at DESC 
      LIMIT 1
    );
  END LOOP;
END $$;

-- Clean up duplicate principal approvals, keeping only the most recent
DO $$ 
DECLARE
  plan_id uuid;
BEGIN
  FOR plan_id IN 
    SELECT lesson_plan_id 
    FROM principal_approvals 
    GROUP BY lesson_plan_id 
    HAVING COUNT(*) > 1
  LOOP
    DELETE FROM principal_approvals 
    WHERE lesson_plan_id = plan_id 
    AND id NOT IN (
      SELECT id 
      FROM principal_approvals 
      WHERE lesson_plan_id = plan_id 
      ORDER BY approved_at DESC 
      LIMIT 1
    );
  END LOOP;
END $$;

-- Add unique constraint to approvals table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'approvals_lesson_plan_id_key'
  ) THEN
    ALTER TABLE approvals 
    ADD CONSTRAINT approvals_lesson_plan_id_key 
    UNIQUE (lesson_plan_id);
  END IF;
END $$;

-- Add unique constraint to principal_approvals table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'principal_approvals_lesson_plan_id_key'
  ) THEN
    ALTER TABLE principal_approvals 
    ADD CONSTRAINT principal_approvals_lesson_plan_id_key 
    UNIQUE (lesson_plan_id);
  END IF;
END $$;