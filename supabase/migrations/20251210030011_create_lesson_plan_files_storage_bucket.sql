/*
  # Create Lesson Plan Files Storage Bucket

  1. Storage
    - Create `lesson-plan-files` bucket for storing rubrics and attachments
    - Enable public access for lesson plan files
    
  2. Security
    - Allow authenticated users to upload lesson plan files
    - Allow public read access to view files
    - Restrict file size to 10MB
    - Allow common document types (pdf, doc, docx, xls, xlsx)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-plan-files',
  'lesson-plan-files',
  true,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload lesson plan files'
  ) THEN
    CREATE POLICY "Authenticated users can upload lesson plan files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'lesson-plan-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update lesson plan files'
  ) THEN
    CREATE POLICY "Authenticated users can update lesson plan files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'lesson-plan-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete lesson plan files'
  ) THEN
    CREATE POLICY "Authenticated users can delete lesson plan files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'lesson-plan-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view lesson plan files'
  ) THEN
    CREATE POLICY "Anyone can view lesson plan files"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'lesson-plan-files');
  END IF;
END $$;
