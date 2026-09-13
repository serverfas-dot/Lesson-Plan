/*
  # Fix Leading Teacher Workflow
  
  1. Purpose
    - Implement correct workflow for leading teachers
    - Leading teachers submit plans → Principal approves → Plans visible to leading teacher
    - Mirrors the teacher workflow: Teacher submits → Leading Teacher approves → Plans visible to teacher
  
  2. Changes
    - Leading teacher submits: status = 'submitted', principal_status = 'pending'
    - Principal approves: status = 'approved', principal_status = 'approved'
    - Leading teacher sees only approved plans (not pending)
  
  3. Notes
    - This ensures leading teacher plans require principal approval
    - Leading teachers only see their approved plans
    - Workflow consistency: Everyone submits for approval, sees only approved items
*/

-- This migration updates the workflow behavior
-- No schema changes needed, only application logic was updated

-- Update any existing leading teacher plans to correct status
UPDATE lesson_plans
SET status = 'submitted'
WHERE created_by_role = 'leading_teacher' 
  AND status = 'approved'
  AND principal_status = 'pending';
