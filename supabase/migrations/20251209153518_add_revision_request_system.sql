/*
  # Add Revision Request System

  1. Changes to Tables
    - `lesson_plans`
      - Add `revision_requested_by` column (text) - stores who requested changes ('leading_teacher' or 'principal')
      - Add `revision_feedback` column (text) - stores the feedback/notes for what needs to be corrected
      - Add `revision_requested_at` column (timestamptz) - timestamp of when revision was requested
  
  2. Purpose
    - Allows leading teachers and principals to send lesson plans back for corrections
    - Teachers can see the feedback and make necessary changes
    - Teachers can edit and resubmit the same lesson plan
  
  3. Workflow
    - Leading teacher/principal reviews lesson plan
    - Instead of approve/reject, they can request changes with detailed feedback
    - Teacher receives feedback and can edit the plan
    - Teacher resubmits for approval
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'revision_requested_by'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN revision_requested_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'revision_feedback'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN revision_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'revision_requested_at'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN revision_requested_at timestamptz;
  END IF;
END $$;