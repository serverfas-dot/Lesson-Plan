/*
  # Create Signatures Storage Bucket

  1. Storage
    - Create `signatures` bucket for storing user signature images
    - Enable public access for signature images
    
  2. Security
    - Allow authenticated users to upload their own signatures
    - Allow public read access to view signatures
    - Restrict file size to 2MB
    - Only allow image file types (png, jpg, jpeg, gif)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own signature'
  ) THEN
    CREATE POLICY "Users can upload their own signature"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own signature'
  ) THEN
    CREATE POLICY "Users can update their own signature"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own signature'
  ) THEN
    CREATE POLICY "Users can delete their own signature"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view signatures'
  ) THEN
    CREATE POLICY "Anyone can view signatures"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'signatures');
  END IF;
END $$;