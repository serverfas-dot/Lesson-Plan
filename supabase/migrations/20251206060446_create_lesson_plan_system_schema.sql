/*
  # Lesson Plan Management System Schema

  ## Overview
  This migration creates a comprehensive lesson plan management system with role-based access control.

  ## 1. New Tables
  
  ### `profiles`
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'teacher', 'leading_teacher', 'principal'
  - `leading_teacher_id` (uuid) - Reference to leading teacher (for teachers only)
  - `signature_url` (text) - URL to signature image (for leading teachers)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `lesson_plans`
  - `id` (uuid, primary key) - Unique identifier
  - `teacher_id` (uuid) - Reference to teacher who created it
  - `leading_teacher_id` (uuid) - Reference to assigned leading teacher
  - `week` (integer) - Week number
  - `date` (date) - Lesson date
  - `duration` (text) - Lesson duration (e.g., "70 minutes")
  - `lesson_no` (text) - Lesson number (e.g., "1-2")
  - `class` (text) - Class name/number
  - `subject` (text) - Subject name
  - `no_of_students` (integer) - Number of students
  - `topic` (text) - Lesson topic
  - `strand` (text) - Curriculum strand
  - `sub_strand` (text) - Curriculum sub-strand
  - `outcome` (text) - Expected outcome
  - `indicators` (text) - Learning indicators
  - `learning_intention` (text) - Learning intention
  - `success_criteria` (text) - Success criteria
  - `prior_knowledge` (text) - Required prior knowledge
  - `key_competencies` (text) - Key competencies
  - `shared_values` (text) - Shared values
  - `materials_needed` (text) - Materials needed
  - `introduction_time` (integer) - Time in minutes
  - `introduction_teacher_activity` (text) - Teacher activity during introduction
  - `introduction_student_activity` (text) - Student activity during introduction
  - `body_time` (integer) - Time in minutes
  - `body_teacher_activity` (text) - Teacher activity during body
  - `body_student_activity` (text) - Student activity during body
  - `evaluation_time` (integer) - Time in minutes
  - `evaluation_teacher_activity` (text) - Teacher activity during evaluation
  - `evaluation_student_activity` (text) - Student activity during evaluation
  - `conclusion_time` (integer) - Time in minutes
  - `conclusion_teacher_activity` (text) - Teacher activity during conclusion
  - `conclusion_student_activity` (text) - Student activity during conclusion
  - `reflection_objectives_achieved` (boolean) - Reflection checkbox
  - `reflection_activities_effective` (boolean) - Reflection checkbox
  - `reflection_implemented_as_planned` (boolean) - Reflection checkbox
  - `reflection_notes` (text) - Reflection notes
  - `pedagogy_positive_environment` (boolean) - Pedagogy checkbox
  - `pedagogy_connecting_learning` (boolean) - Pedagogy checkbox
  - `pedagogy_reflective_practice` (boolean) - Pedagogy checkbox
  - `pedagogy_meaningful_learning` (boolean) - Pedagogy checkbox
  - `pedagogy_individual_differences` (boolean) - Pedagogy checkbox
  - `status` (text) - Status: 'draft', 'submitted', 'approved', 'rejected'
  - `submitted_at` (timestamptz) - Submission timestamp
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `approvals`
  - `id` (uuid, primary key) - Unique identifier
  - `lesson_plan_id` (uuid) - Reference to lesson plan
  - `leading_teacher_id` (uuid) - Leading teacher who approved
  - `leading_teacher_name` (text) - Name of leading teacher
  - `signature_url` (text) - Signature used for approval
  - `approved_at` (timestamptz) - Approval timestamp
  - `comments` (text) - Optional comments

  ## 2. Security
  - Enable RLS on all tables
  - Teachers can create and view their own lesson plans
  - Leading teachers can view lesson plans of their assigned teachers
  - Leading teachers can approve lesson plans assigned to them
  - Principal can view all lesson plans
  - Users can only view and update their own profile
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher', 'leading_teacher', 'principal')),
  leading_teacher_id uuid REFERENCES profiles(id),
  signature_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lesson_plans table
CREATE TABLE IF NOT EXISTS lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leading_teacher_id uuid NOT NULL REFERENCES profiles(id),
  week integer NOT NULL,
  date date NOT NULL,
  duration text NOT NULL DEFAULT '70 minutes',
  lesson_no text NOT NULL,
  class text NOT NULL,
  subject text NOT NULL,
  no_of_students integer NOT NULL DEFAULT 0,
  topic text NOT NULL,
  strand text NOT NULL,
  sub_strand text NOT NULL,
  outcome text NOT NULL,
  indicators text NOT NULL,
  learning_intention text NOT NULL,
  success_criteria text NOT NULL,
  prior_knowledge text NOT NULL,
  key_competencies text NOT NULL,
  shared_values text NOT NULL,
  materials_needed text NOT NULL,
  introduction_time integer DEFAULT 5,
  introduction_teacher_activity text NOT NULL,
  introduction_student_activity text NOT NULL,
  body_time integer DEFAULT 35,
  body_teacher_activity text NOT NULL,
  body_student_activity text NOT NULL,
  evaluation_time integer DEFAULT 25,
  evaluation_teacher_activity text NOT NULL,
  evaluation_student_activity text NOT NULL,
  conclusion_time integer DEFAULT 5,
  conclusion_teacher_activity text NOT NULL,
  conclusion_student_activity text NOT NULL,
  reflection_objectives_achieved boolean DEFAULT false,
  reflection_activities_effective boolean DEFAULT false,
  reflection_implemented_as_planned boolean DEFAULT false,
  reflection_notes text DEFAULT '',
  pedagogy_positive_environment boolean DEFAULT false,
  pedagogy_connecting_learning boolean DEFAULT false,
  pedagogy_reflective_practice boolean DEFAULT false,
  pedagogy_meaningful_learning boolean DEFAULT false,
  pedagogy_individual_differences boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id uuid NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  leading_teacher_id uuid NOT NULL REFERENCES profiles(id),
  leading_teacher_name text NOT NULL,
  signature_url text NOT NULL,
  approved_at timestamptz DEFAULT now(),
  comments text DEFAULT ''
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Leading teachers can view their assigned teachers"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'leading_teacher'
      AND profiles.leading_teacher_id = p.id
    )
  );

CREATE POLICY "Principal can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  );

-- Lesson plans policies
CREATE POLICY "Teachers can view their own lesson plans"
  ON lesson_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create lesson plans"
  ON lesson_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own draft lesson plans"
  ON lesson_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id AND status = 'draft')
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Leading teachers can view assigned lesson plans"
  ON lesson_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND lesson_plans.leading_teacher_id = profiles.id
    )
  );

CREATE POLICY "Leading teachers can update status of assigned lesson plans"
  ON lesson_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND lesson_plans.leading_teacher_id = profiles.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND lesson_plans.leading_teacher_id = profiles.id
    )
  );

CREATE POLICY "Principal can view all lesson plans"
  ON lesson_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  );

-- Approvals policies
CREATE POLICY "Users can view approvals for their lesson plans"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lesson_plans
      WHERE lesson_plans.id = approvals.lesson_plan_id
      AND lesson_plans.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Leading teachers can create approvals"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = leading_teacher_id);

CREATE POLICY "Leading teachers can view their approvals"
  ON approvals FOR SELECT
  TO authenticated
  USING (auth.uid() = leading_teacher_id);

CREATE POLICY "Principal can view all approvals"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_leading_teacher ON profiles(leading_teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_leading_teacher ON lesson_plans(leading_teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON lesson_plans(status);
CREATE INDEX IF NOT EXISTS idx_approvals_lesson_plan ON approvals(lesson_plan_id);