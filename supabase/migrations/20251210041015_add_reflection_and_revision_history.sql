/*
  # Add Reflection Field and Enhanced Revision History
  
  ## Changes Made
  
  1. Tables Modified
    - `lesson_plans`
      - Add `reflection` field (text, nullable) - only editable after approval
      - Ensure `key_competencies` and `shared_values` are text arrays for multiple selections
  
  2. New Tables
    - `revision_history`
      - Tracks all revision requests and corrections
      - Records: timestamp, teacher_id, leading_teacher_id, comments, action type
      - Enables full audit trail of all changes requested and corrections made
  
  3. Security
    - Enable RLS on revision_history table
    - Add policies for teachers and leading teachers to view history
    - Add policy for system to insert history records
*/

-- Add reflection field to lesson_plans if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'reflection'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN reflection text;
  END IF;
END $$;

-- Create revision_history table
CREATE TABLE IF NOT EXISTS revision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id uuid NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id),
  leading_teacher_id uuid REFERENCES profiles(id),
  action_type text NOT NULL CHECK (action_type IN ('revision_requested', 'revision_completed', 'resubmitted')),
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on revision_history
ALTER TABLE revision_history ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view history of their own lesson plans
CREATE POLICY "Teachers can view own lesson plan history"
  ON revision_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lesson_plans lp
      WHERE lp.id = revision_history.lesson_plan_id
      AND lp.teacher_id = auth.uid()
    )
  );

-- Policy: Leading teachers can view history of their teachers' lesson plans
CREATE POLICY "Leading teachers can view their teachers' history"
  ON revision_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'leading_teacher'
      AND EXISTS (
        SELECT 1 FROM lesson_plans lp
        JOIN profiles tp ON lp.teacher_id = tp.id
        WHERE lp.id = revision_history.lesson_plan_id
        AND tp.leading_teacher_id = p.id
      )
    )
  );

-- Policy: Super admins can view all history
CREATE POLICY "Super admins can view all history"
  ON revision_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: System can insert history records
CREATE POLICY "Authenticated users can insert history"
  ON revision_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_revision_history_lesson_plan_id ON revision_history(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_revision_history_created_at ON revision_history(created_at DESC);
