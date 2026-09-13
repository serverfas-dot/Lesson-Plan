/*
  # Add Requests and Corrections Field Labels

  1. New Fields
    - requests: "requests" / "އެދުމުތައް"
    - request: "request" / "އެދުން"
    - corrections: "corrections" / "އިސްލާހުތައް"
    - correction: "correction" / "އިސްލާހު"
  
  2. Notes
    - These labels appear in the revision history count section
    - Can be customized by super admins in both English and Dhivehi
*/

INSERT INTO lesson_plan_field_labels (field_key, field_label, label_en, label_dv, field_category, field_type, display_order, is_required, is_enabled)
VALUES 
  (
    'requests',
    'requests',
    'requests',
    'އެދުމުތައް',
    'revision_history',
    'text',
    59,
    false,
    true
  ),
  (
    'request',
    'request',
    'request',
    'އެދުން',
    'revision_history',
    'text',
    60,
    false,
    true
  ),
  (
    'corrections',
    'corrections',
    'corrections',
    'އިސްލާހުތައް',
    'revision_history',
    'text',
    61,
    false,
    true
  ),
  (
    'correction',
    'correction',
    'correction',
    'އިސްލާހު',
    'revision_history',
    'text',
    62,
    false,
    true
  );
