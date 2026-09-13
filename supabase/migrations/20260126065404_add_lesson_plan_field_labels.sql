/*
  # Add Lesson Plan Field Labels Configuration

  1. New Tables
    - `lesson_plan_field_labels`
      - `id` (uuid, primary key)
      - `field_key` (text, unique) - Internal field identifier
      - `field_label` (text) - Display label for the field
      - `field_category` (text) - Category grouping (basic_info, curriculum, instructional, pedagogy)
      - `display_order` (integer) - Order in which fields appear
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - Reference to super admin who updated

  2. Security
    - Enable RLS on `lesson_plan_field_labels` table
    - Add policy for all authenticated users to read field labels
    - Add policy for super admins to update field labels

  3. Default Data
    - Insert default field labels for all existing lesson plan fields
*/

CREATE TABLE IF NOT EXISTS lesson_plan_field_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text UNIQUE NOT NULL,
  field_label text NOT NULL,
  field_category text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE lesson_plan_field_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read field labels"
  ON lesson_plan_field_labels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can update field labels"
  ON lesson_plan_field_labels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

INSERT INTO lesson_plan_field_labels (field_key, field_label, field_category, display_order) VALUES
  ('week', 'Week', 'basic_info', 1),
  ('date', 'Date', 'basic_info', 2),
  ('duration', 'Duration', 'basic_info', 3),
  ('lesson_no', 'Lesson No', 'basic_info', 4),
  ('class', 'Class(es)', 'basic_info', 5),
  ('subject', 'Subject', 'basic_info', 6),
  ('no_of_students', 'No. of Students', 'basic_info', 7),
  ('topic', 'Topic', 'curriculum', 8),
  ('strand', 'Strand', 'curriculum', 9),
  ('sub_strand', 'Sub-strand', 'curriculum', 10),
  ('outcome', 'Outcome', 'curriculum', 11),
  ('indicators', 'Indicator(s)', 'curriculum', 12),
  ('learning_intention', 'Learning Intention', 'curriculum', 13),
  ('success_criteria', 'Success Criteria', 'curriculum', 14),
  ('prior_knowledge', 'Prior Knowledge', 'curriculum', 15),
  ('key_competencies', 'Key Competencies', 'curriculum', 16),
  ('shared_values', 'Shared Values', 'curriculum', 17),
  ('materials_needed', 'Materials Needed', 'curriculum', 18),
  ('instructional_procedures', 'INSTRUCTIONAL PROCEDURES', 'instructional', 19),
  ('introduction', 'INTRODUCTION', 'instructional', 20),
  ('introduction_time', 'Time/min', 'instructional', 21),
  ('introduction_teacher_activity', 'Teachers Activity', 'instructional', 22),
  ('introduction_student_activity', 'Students Activity', 'instructional', 23),
  ('body', 'BODY', 'instructional', 24),
  ('body_time', 'Time/min', 'instructional', 25),
  ('body_teacher_activity', 'Teachers Activity', 'instructional', 26),
  ('body_student_activity', 'Students Activity', 'instructional', 27),
  ('evaluation', 'EVALUATION', 'instructional', 28),
  ('evaluation_time', 'Time/min', 'instructional', 29),
  ('evaluation_teacher_activity', 'Teachers Activity', 'instructional', 30),
  ('evaluation_student_activity', 'Students Activity', 'instructional', 31),
  ('conclusion', 'CONCLUSION', 'instructional', 32),
  ('conclusion_time', 'Time/min', 'instructional', 33),
  ('conclusion_teacher_activity', 'Teachers Activity', 'instructional', 34),
  ('conclusion_student_activity', 'Students Activity', 'instructional', 35),
  ('pedagogy_and_assessment', 'PEDAGOGY AND ASSESSMENT', 'pedagogy', 36),
  ('pedagogy_positive_environment', 'Creating a positive learning environment', 'pedagogy', 37),
  ('pedagogy_connecting_learning', 'Connecting prior learning to new learning', 'pedagogy', 38),
  ('pedagogy_reflective_practice', 'Fostering reflective practice', 'pedagogy', 39),
  ('pedagogy_meaningful_learning', 'Making learning meaningful', 'pedagogy', 40),
  ('pedagogy_individual_differences', 'Recognizing individual differences', 'pedagogy', 41),
  ('rubrics', 'Rubrics', 'pedagogy', 42)
ON CONFLICT (field_key) DO NOTHING;
