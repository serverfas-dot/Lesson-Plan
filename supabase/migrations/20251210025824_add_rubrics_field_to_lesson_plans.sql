/*
  # Add Rubrics Field to Lesson Plans

  ## Changes
  - Add `rubrics_file_url` field to store uploaded rubrics file URL
  - Add `rubrics_file_name` field to store original file name
  
  ## Security
  - No changes to RLS policies needed as lesson plans policies already handle access
*/

-- Add rubrics fields to lesson_plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'rubrics_file_url'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN rubrics_file_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'rubrics_file_name'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN rubrics_file_name text;
  END IF;
END $$;
