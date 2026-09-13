/*
  # Add Field Customization Support
  
  1. Schema Changes
    - Add `field_type` column (text, textarea, dropdown, checkbox-group, number, date, time)
    - Add `field_options` column (JSONB array for dropdown/checkbox options)
    - Add `is_required` column (boolean)
    - Add `is_enabled` column (boolean to show/hide fields)
    - Add `placeholder` column (text for input hints)
    - Add `help_text` column (text for additional instructions)
    
  2. Security
    - Add INSERT policy for super admins to create new fields
    - Add DELETE policy for super admins to remove fields
    
  3. Updates
    - Set default field types for existing fields
    - Set default options for Key Competencies and Shared Values
*/

-- Add new columns to lesson_plan_field_labels
ALTER TABLE lesson_plan_field_labels
  ADD COLUMN IF NOT EXISTS field_type text DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS field_options jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS placeholder text DEFAULT '',
  ADD COLUMN IF NOT EXISTS help_text text DEFAULT '';

-- Add INSERT policy for super admins
CREATE POLICY "Super admins can insert field labels"
  ON lesson_plan_field_labels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Add DELETE policy for super admins
CREATE POLICY "Super admins can delete field labels"
  ON lesson_plan_field_labels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Update existing fields with appropriate field types
UPDATE lesson_plan_field_labels SET field_type = 'number' WHERE field_key IN ('week', 'lesson_no', 'no_of_students');
UPDATE lesson_plan_field_labels SET field_type = 'date' WHERE field_key = 'date';
UPDATE lesson_plan_field_labels SET field_type = 'time' WHERE field_key = 'duration';
UPDATE lesson_plan_field_labels SET field_type = 'textarea' WHERE field_key IN (
  'topic', 'outcome', 'indicators', 'learning_intention', 'success_criteria', 
  'prior_knowledge', 'materials_needed', 'introduction_teacher_activity', 
  'introduction_student_activity', 'body_teacher_activity', 'body_student_activity',
  'evaluation_teacher_activity', 'evaluation_student_activity', 
  'conclusion_teacher_activity', 'conclusion_student_activity', 'rubrics'
);

-- Set checkbox-group type for Key Competencies and Shared Values
UPDATE lesson_plan_field_labels SET 
  field_type = 'checkbox-group',
  field_options = '[
    "Communication and Collaboration (CC)",
    "Critical Thinking and Problem Solving (CP)",
    "Cultural Identity and Global Citizenship (CG)",
    "Personal Development and Leadership (PL)",
    "Creativity and Innovation (CI)",
    "Digital Literacy (DL)"
  ]'::jsonb
WHERE field_key = 'key_competencies';

UPDATE lesson_plan_field_labels SET 
  field_type = 'checkbox-group',
  field_options = '[
    "Respect",
    "Responsibility",
    "Integrity",
    "Excellence",
    "Unity",
    "Commitment to achieving personal best"
  ]'::jsonb
WHERE field_key = 'shared_values';

-- Set heading type for section headers
UPDATE lesson_plan_field_labels SET 
  field_type = 'heading',
  is_required = false
WHERE field_key IN (
  'instructional_procedures', 'introduction', 'body', 'evaluation', 
  'conclusion', 'pedagogy_and_assessment'
);

-- Set dropdown type for common fields with options
UPDATE lesson_plan_field_labels SET 
  field_type = 'dropdown',
  field_options = '["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"]'::jsonb
WHERE field_key = 'class';

UPDATE lesson_plan_field_labels SET 
  field_type = 'dropdown',
  field_options = '["English", "Mathematics", "Science", "Social Studies", "ICT", "RME", "Ghanaian Language", "French", "Creative Arts", "Physical Education", "History"]'::jsonb
WHERE field_key = 'subject';

UPDATE lesson_plan_field_labels SET 
  field_type = 'text',
  field_options = '["Communication and Language", "Numbers and Operations", "Measurement", "Geometry", "Data", "Living Things", "Matter and Materials", "Forces and Energy", "Earth and Space", "History", "Geography", "Economics", "Citizenship"]'::jsonb
WHERE field_key = 'strand';

-- Add placeholders for time fields
UPDATE lesson_plan_field_labels SET placeholder = 'e.g., 10' WHERE field_key IN ('introduction_time', 'body_time', 'evaluation_time', 'conclusion_time');
UPDATE lesson_plan_field_labels SET placeholder = 'e.g., 08:00 AM' WHERE field_key = 'duration';
