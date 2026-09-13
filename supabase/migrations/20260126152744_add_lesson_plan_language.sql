/*
  # Add Language Support to Lesson Plans

  ## Changes
  1. Add `language` column to `lesson_plans` table
     - Stores the language/format chosen by the teacher
     - Options: 'english' or 'dhivehi'
     - Defaults to 'english' for backward compatibility
  
  2. Purpose
     - Allow teachers to choose between English and Dhivehi lesson plan formats
     - Form displays in the selected language
     - Saved lesson plans display in the language they were created in
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'language'
  ) THEN
    ALTER TABLE lesson_plans 
    ADD COLUMN language text NOT NULL DEFAULT 'english' 
    CHECK (language IN ('english', 'dhivehi'));
  END IF;
END $$;