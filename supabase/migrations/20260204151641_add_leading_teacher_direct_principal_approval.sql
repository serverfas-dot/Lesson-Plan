/*
  # Leading Teacher Direct Principal Approval

  ## Purpose
  Ensures that when leading teachers create lesson plans, they go directly to principal
  for approval without needing another leading teacher's approval.

  ## Changes
  - When leading teacher creates a lesson plan (created_by_role = 'leading_teacher'):
    - The plan is automatically approved by leading teacher (status = 'approved')
    - Goes directly to principal for approval (principal_status = 'pending')
  
  ## Notes
  - Regular teacher plans still follow: draft -> submitted -> approved (by leading teacher) -> approved (by principal)
  - Leading teacher plans follow: draft -> submitted -> approved (auto) -> approved (by principal)
*/

-- This migration doesn't require schema changes
-- The logic will be handled in the application layer
-- Leading teachers creating plans should:
-- 1. Set created_by_role = 'leading_teacher'
-- 2. When submitting, automatically set status = 'approved' 
-- 3. Set principal_status = 'pending'
