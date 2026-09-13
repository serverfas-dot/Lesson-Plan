CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_status ON lesson_plans (teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_week ON lesson_plans (teacher_id, week);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_date_status ON lesson_plans (teacher_id, date, status);
