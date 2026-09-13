/*
  # Add lesson plan title field
  
  1. Changes
    - Add `title` column to `lesson_plans` table to allow customizable heading
    - Set default value to 'Lesson Plan (First Semester – 2025)'
    
  2. Notes
    - This allows teachers to customize the lesson plan heading
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'title'
  ) THEN
    ALTER TABLE lesson_plans 
    ADD COLUMN title text DEFAULT 'Lesson Plan (First Semester – 2025)';
  END IF;
END $$;