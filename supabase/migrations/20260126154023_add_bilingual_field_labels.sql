/*
  # Add Bilingual Support to Field Labels

  ## Changes
  1. Add columns to lesson_plan_field_labels table
     - `label_en` - English label text
     - `label_dv` - Dhivehi label text
  
  2. Migrate existing data
     - Copy current `field_label` values to `label_en`
     - Set default Dhivehi translations for `label_dv`
  
  3. Keep original `field_label` column for backward compatibility
  
  ## Purpose
  - Allow super admin to customize field labels in both English and Dhivehi
  - Teachers can select language and see appropriate labels
*/

DO $$
BEGIN
  -- Add label_en column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plan_field_labels' AND column_name = 'label_en'
  ) THEN
    ALTER TABLE lesson_plan_field_labels ADD COLUMN label_en text;
  END IF;

  -- Add label_dv column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plan_field_labels' AND column_name = 'label_dv'
  ) THEN
    ALTER TABLE lesson_plan_field_labels ADD COLUMN label_dv text;
  END IF;
END $$;

-- Migrate existing data to label_en
UPDATE lesson_plan_field_labels SET label_en = field_label WHERE label_en IS NULL;

-- Set default Dhivehi translations
UPDATE lesson_plan_field_labels SET label_dv = 'ހަފްތާ' WHERE field_key = 'week' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ތާރީޚް' WHERE field_key = 'date' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރުސްގެ ދިގުމިން' WHERE field_key = 'duration' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރުސް ނަންބަރު' WHERE field_key = 'lesson_no' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ކްލާސް' WHERE field_key = 'class' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ކިޔެވުމުގެ މާއްދާ' WHERE field_key = 'subject' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރިވަރުންގެ އަދަދު' WHERE field_key = 'no_of_students' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'މައުޟޫއު' WHERE field_key = 'topic' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ސްޓްރޭންޑް' WHERE field_key = 'strand' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ސަބް-ސްޓްރޭންޑް' WHERE field_key = 'sub_strand' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ނަތީޖާ' WHERE field_key = 'outcome' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'އިންޑިކޭޓަރސް' WHERE field_key = 'indicators' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަސްކުރުމުގެ ނިޔަތު' WHERE field_key = 'learning_intention' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ކާމިޔާބީގެ މިންގަނޑު' WHERE field_key = 'success_criteria' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ކުރީގެ ޢިލްމު' WHERE field_key = 'prior_knowledge' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'މުހިންމު ހުނަރުތައް' WHERE field_key = 'key_competencies' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'އެއްގަމު އަގުތައް' WHERE field_key = 'shared_values' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ބޭނުންވާ ސާމާނު' WHERE field_key = 'materials_needed' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ތަންފީޒު ކުރުމުގެ ގޮތްތައް' WHERE field_key = 'instructional_procedures' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ތައާރަފު' WHERE field_key = 'introduction' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ވަގުތު/މިނިޓް' WHERE field_key = 'introduction_time' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ޓީޗަރގެ ހަރަކާތް' WHERE field_key = 'introduction_teacher_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރިވަރުންގެ ހަރަކާތް' WHERE field_key = 'introduction_student_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'މައި ދަރުސް' WHERE field_key = 'body' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ވަގުތު/މިނިޓް' WHERE field_key = 'body_time' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ޓީޗަރގެ ހަރަކާތް' WHERE field_key = 'body_teacher_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރިވަރުންގެ ހަރަކާތް' WHERE field_key = 'body_student_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ބަލާލުން' WHERE field_key = 'evaluation' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ވަގުތު/މިނިޓް' WHERE field_key = 'evaluation_time' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ޓީޗަރގެ ހަރަކާތް' WHERE field_key = 'evaluation_teacher_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރިވަރުންގެ ހަރަކާތް' WHERE field_key = 'evaluation_student_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ނިންމުން' WHERE field_key = 'conclusion' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ވަގުތު/މިނިޓް' WHERE field_key = 'conclusion_time' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ޓީޗަރގެ ހަރަކާތް' WHERE field_key = 'conclusion_teacher_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަރިވަރުންގެ ހަރަކާތް' WHERE field_key = 'conclusion_student_activity' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ޕެޑަގޮޖީ އަދި ބަލާލުން' WHERE field_key = 'pedagogy_and_assessment' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ފޯރިގަދަ ދަސްކުރުމުގެ މާހައުލު ހެދުން' WHERE field_key = 'pedagogy_positive_environment' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ކުރީގެ ދަސްކުރުން އާ ދަސްކުރުމާ ގުޅުވައިދިނުން' WHERE field_key = 'pedagogy_connecting_learning' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ރިފްލެކްޓިވް ޕްރެކްޓިސް' WHERE field_key = 'pedagogy_reflective_practice' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ދަސްކުރުން މާނަހުރި ކުރުން' WHERE field_key = 'pedagogy_meaningful_learning' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ފަރުދީ ތަފާތުތައް ދެނެގަތުން' WHERE field_key = 'pedagogy_individual_differences' AND label_dv IS NULL;
UPDATE lesson_plan_field_labels SET label_dv = 'ރުބްރިކްސް' WHERE field_key = 'rubrics' AND label_dv IS NULL;