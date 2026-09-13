/*
  # Add Bilingual Checkbox Options

  1. Updates
    - Update Key Competencies field options with bilingual data (English and Dhivehi)
    - Update Shared Values field options with bilingual data (English and Dhivehi)
  
  2. Notes
    - Each option is stored as an object with `en` and `dv` properties
    - This allows the UI to display options in the selected language
    - Super admins can edit these through the field customization interface
*/

-- Update Key Competencies with bilingual options
UPDATE lesson_plan_field_labels 
SET field_options = '[
  {"en": "Practicing Islam", "dv": "އިސްލާމްދީން އަމަލުކުރުން"},
  {"en": "Understanding and managing self", "dv": "ނަފްސު ވިސްނައި އެކަމަކު ހިންގުން"},
  {"en": "Thinking critically and creativity", "dv": "ފުންކޮށް ވިސްނުމާއި ހަލާކުކުރުން"},
  {"en": "Relating to people", "dv": "މީހުންނާ ގުޅުން ހިނގުން"},
  {"en": "Making Meaning", "dv": "މާނަ ހޯދުން"},
  {"en": "Living healthy life", "dv": "ސިއްހީ ދިރިއުޅުން"},
  {"en": "Using Sustainable Practices", "dv": "ދެމެހެއްޓޭ އުސޫލުތައް ބޭނުންކުރުން"},
  {"en": "Using Technology And the media", "dv": "ޓެކްނޮލޮޖީ އާއި މީޑިއާ ބޭނުންކުރުން"}
]'::jsonb
WHERE field_key = 'key_competencies';

-- Update Shared Values with bilingual options
UPDATE lesson_plan_field_labels 
SET field_options = '[
  {"en": "Values relating to self", "dv": "ނަފްސާ ގުޅޭ އަގުތައް"},
  {"en": "Values relating to family and others", "dv": "ކުޓުމްބާއި އެހެން މީހުންނާ ގުޅޭ އަގުތައް"},
  {"en": "Values relating to local and global community", "dv": "ލޯކަލް އަދި ދުނިޔެވީ ކޮމިއުނިޓީއާ ގުޅޭ އަގުތައް"},
  {"en": "Values relating to the environment", "dv": "މާހައުލާ ގުޅޭ އަގުތައް"}
]'::jsonb
WHERE field_key = 'shared_values';