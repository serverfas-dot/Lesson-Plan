/*
  # Fix Existing Leading Teacher Lesson Plans Status
  
  1. Purpose
    - Update existing lesson plans created by leading teachers to have correct status
    - Plans that are submitted by leading teachers should be auto-approved
    - Set principal_status to pending for these plans
  
  2. Changes
    - Update lesson plans where:
      * created_by_role = 'leading_teacher'
      * status = 'submitted'
    - Set their status to 'approved'
    - Set their principal_status to 'pending'
  
  3. Notes
    - This fixes the workflow for leading teacher plans
    - New plans will be automatically set correctly by the application
*/

-- Update existing leading teacher plans that are submitted
UPDATE lesson_plans
SET 
  status = 'approved',
  principal_status = 'pending'
WHERE 
  created_by_role = 'leading_teacher' 
  AND status = 'submitted'
  AND principal_status IS NULL;
