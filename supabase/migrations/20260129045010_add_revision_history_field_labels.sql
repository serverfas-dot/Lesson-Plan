/*
  # Add Revision History Field Labels

  1. New Fields
    - revision_history_title: "REVISION HISTORY" / "އިސްލާހުކުރުމުގެ ތާރީޚް"
    - revision_requested: "Revision Requested" / "އިސްލާހު ހެދުމަށް އެދިފައި"
    - revision_completed: "Revision Completed" / "އިސްލާހު ފުރިހަމަވެއްޖެ"
    - resubmitted: "Resubmitted" / "އަލުން ހުށަހެޅުއްވި"
    - requested_by: "Requested by:" / "އެދިވަޑައިގަތީ:"
    - completed_by: "By:" / "ފަރާތުން:"
    - no_revision_history: "No revision history yet" / "އިސްލާހުކުރުމުގެ ތާރީޚެއް ނެތް"
  
  2. Notes
    - These labels can be customized by super admins
    - Allows bilingual display of revision history section
*/

INSERT INTO lesson_plan_field_labels (field_key, field_label, label_en, label_dv, field_category, field_type, display_order, is_required, is_enabled)
VALUES 
  (
    'revision_history_title',
    'REVISION HISTORY',
    'REVISION HISTORY',
    'އިސްލާހުކުރުމުގެ ތާރީޚް',
    'revision_history',
    'text',
    50,
    false,
    true
  ),
  (
    'revision_requested',
    'Revision Requested',
    'Revision Requested',
    'އިސްލާހު ހެދުމަށް އެދިފައި',
    'revision_history',
    'text',
    51,
    false,
    true
  ),
  (
    'revision_completed',
    'Revision Completed',
    'Revision Completed',
    'އިސްލާހު ފުރިހަމަވެއްޖެ',
    'revision_history',
    'text',
    52,
    false,
    true
  ),
  (
    'resubmitted_label',
    'Resubmitted',
    'Resubmitted',
    'އަލުން ހުށަހެޅުއްވި',
    'revision_history',
    'text',
    53,
    false,
    true
  ),
  (
    'requested_by',
    'Requested by:',
    'Requested by:',
    'އެދިވަޑައިގަތީ:',
    'revision_history',
    'text',
    54,
    false,
    true
  ),
  (
    'completed_by',
    'By:',
    'By:',
    'ފަރާތުން:',
    'revision_history',
    'text',
    55,
    false,
    true
  ),
  (
    'no_revision_history',
    'No revision history yet',
    'No revision history yet',
    'އިސްލާހުކުރުމުގެ ތާރީޚެއް ނެތް',
    'revision_history',
    'text',
    56,
    false,
    true
  ),
  (
    'show_history',
    'Show',
    'Show',
    'ދައްކާ',
    'revision_history',
    'text',
    57,
    false,
    true
  ),
  (
    'hide_history',
    'Hide',
    'Hide',
    'ފޮރުއްވާ',
    'revision_history',
    'text',
    58,
    false,
    true
  );
