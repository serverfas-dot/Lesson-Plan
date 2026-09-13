/*
  # Add Bilingual Class and Subject Options

  1. Updates
    - Update Class field options with bilingual data (English and Dhivehi)
    - Update Subject field options with bilingual data (English and Dhivehi)
  
  2. Notes
    - Each option is stored as an object with `en` and `dv` properties
    - This allows the UI to display options in the selected language
    - Super admins can edit these through the field customization interface
*/

-- Update Class options with bilingual support
UPDATE lesson_plan_field_labels 
SET field_options = '[
  {"en": "Class 1", "dv": "ކްލާސް 1"},
  {"en": "Class 2", "dv": "ކްލާސް 2"},
  {"en": "Class 3", "dv": "ކްލާސް 3"},
  {"en": "Class 4", "dv": "ކްލާސް 4"},
  {"en": "Class 5", "dv": "ކްލާސް 5"},
  {"en": "Class 6", "dv": "ކްލާސް 6"},
  {"en": "Class 7", "dv": "ކްލާސް 7"},
  {"en": "Class 8", "dv": "ކްލާސް 8"},
  {"en": "Class 9 (Science)", "dv": "ކްލާސް 9 (ސައިންސް)"},
  {"en": "Class 9 (Business Studies)", "dv": "ކްލާސް 9 (ބިޒްނަސް ސްޓަޑީޒް)"},
  {"en": "Class 10 (Science)", "dv": "ކްލާސް 10 (ސައިންސް)"},
  {"en": "Class 10 (Business Studies)", "dv": "ކްލާސް 10 (ބިޒްނަސް ސްޓަޑީޒް)"}
]'::jsonb
WHERE field_key = 'class';

-- Update Subject options with bilingual support
UPDATE lesson_plan_field_labels 
SET field_options = '[
  {"en": "English", "dv": "އިނގިރޭސި"},
  {"en": "Mathematics", "dv": "ރިޔާޟިއްޔާތު"},
  {"en": "Science", "dv": "ސައިންސް"},
  {"en": "Social Studies", "dv": "ސޯޝަލް ސްޓަޑީޒް"},
  {"en": "ICT", "dv": "އައި.ސީ.ޓީ"},
  {"en": "RME", "dv": "ދީނީ ތަޢުލީމް"},
  {"en": "Ghanaian Language", "dv": "ގާނާއީ ބަސް"},
  {"en": "French", "dv": "ފަރަންސޭސި"},
  {"en": "Creative Arts", "dv": "ފަންނުވެރި ހުނަރު"},
  {"en": "Physical Education", "dv": "ޖިސްމާނީ ތަރުބިއްޔަތު"},
  {"en": "History", "dv": "ތާރީޚް"},
  {"en": "Quran", "dv": "ޤުރުއާން"}
]'::jsonb
WHERE field_key = 'subject';
