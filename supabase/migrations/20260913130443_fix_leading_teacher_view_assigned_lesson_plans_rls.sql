/*
# Fix Leading Teacher RLS to show all plans for currently-assigned teachers

## Problem
When a teacher is reassigned from one leading teacher to another, the lesson_plans.leading_teacher_id
column on existing plans still points to the OLD leading teacher. The RLS SELECT policy
"Leading teachers can view assigned lesson plans" checks `lesson_plans.leading_teacher_id = profiles.id`,
so the NEW leading teacher cannot see those plans — they are silently filtered by RLS.

## Fix
Replace the SELECT policy so it checks the TEACHER's current leading_teacher_id (from the profiles
table), not the stale leading_teacher_id on the lesson plan row. This way, when a teacher is moved
to a new leading teacher, all their plans become visible to the new leading teacher automatically.

## Changes
1. Drop old policy "Leading teachers can view assigned lesson plans"
2. Create new SELECT policy that checks: EXISTS a profile where the teacher_id matches,
   that profile's leading_teacher_id = auth.uid(), and the auth user is a leading_teacher.
3. Also update the UPDATE policy "Leading teachers can approve assigned lesson plans" to use
   the same check, so leading teachers can approve plans for their currently-assigned teachers
   even if the plan's leading_teacher_id hasn't been updated yet.

## Security
- No new tables or columns.
- RLS remains enabled.
- The policy still requires auth.uid() to be a leading_teacher and to be the current
  leading_teacher of the plan's teacher — no data is exposed to unauthorized users.
*/

-- Fix SELECT policy
DROP POLICY IF EXISTS "Leading teachers can view assigned lesson plans" ON lesson_plans;

CREATE POLICY "Leading teachers can view assigned lesson plans"
ON lesson_plans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND profiles.id = (
        SELECT teacher_profile.leading_teacher_id
        FROM profiles teacher_profile
        WHERE teacher_profile.id = lesson_plans.teacher_id
      )
  )
);

-- Fix UPDATE (approve) policy to use the same check
DROP POLICY IF EXISTS "Leading teachers can approve assigned lesson plans" ON lesson_plans;

CREATE POLICY "Leading teachers can approve assigned lesson plans"
ON lesson_plans FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND profiles.id = (
        SELECT teacher_profile.leading_teacher_id
        FROM profiles teacher_profile
        WHERE teacher_profile.id = lesson_plans.teacher_id
      )
  )
  AND status = 'submitted'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND profiles.id = (
        SELECT teacher_profile.leading_teacher_id
        FROM profiles teacher_profile
        WHERE teacher_profile.id = lesson_plans.teacher_id
      )
  )
);

-- Also add an UPDATE policy so leading teachers can update leading_teacher_id on plans
-- for their assigned teachers (needed when reassigning teachers)
DROP POLICY IF EXISTS "Leading teachers can update assigned lesson plans" ON lesson_plans;

CREATE POLICY "Leading teachers can update assigned lesson plans"
ON lesson_plans FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
      AND profiles.id = (
        SELECT teacher_profile.leading_teacher_id
        FROM profiles teacher_profile
        WHERE teacher_profile.id = lesson_plans.teacher_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'leading_teacher'
  )
);