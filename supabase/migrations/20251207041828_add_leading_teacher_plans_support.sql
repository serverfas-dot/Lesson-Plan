/*
  # Add Support for Leading Teacher Created Lesson Plans

  1. Changes
    - Add `created_by_role` field to track who created the lesson plan
    - This helps distinguish between:
      * Regular teacher plans (need leading teacher approval)
      * Leading teacher plans (need principal approval)
  
  2. Notes
    - When a regular teacher creates a plan: created_by_role = 'teacher'
    - When a leading teacher creates a plan: created_by_role = 'leading_teacher'
    - This makes the approval workflow clearer
*/

-- Add created_by_role to lesson_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'created_by_role'
  ) THEN
    ALTER TABLE lesson_plans 
    ADD COLUMN created_by_role text DEFAULT 'teacher'
    CHECK (created_by_role IN ('teacher', 'leading_teacher'));
  END IF;
END $$;

-- Update existing records to have the correct role based on teacher_id
UPDATE lesson_plans lp
SET created_by_role = CASE 
  WHEN EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = lp.teacher_id 
    AND p.role = 'leading_teacher'
  ) THEN 'leading_teacher'
  ELSE 'teacher'
END
WHERE created_by_role IS NULL;