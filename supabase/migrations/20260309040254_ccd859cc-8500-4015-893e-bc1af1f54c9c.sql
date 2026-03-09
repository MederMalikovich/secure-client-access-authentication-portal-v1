-- Create storage bucket for pet photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload pet photos
CREATE POLICY "Staff can upload pet photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-photos' AND 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'veterinarian'::app_role, 'registrar'::app_role, 'manager'::app_role])
);

-- Allow public read access
CREATE POLICY "Anyone can view pet photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-photos');

-- Allow staff to update/delete photos
CREATE POLICY "Staff can update pet photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pet-photos' AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'veterinarian'::app_role, 'registrar'::app_role, 'manager'::app_role]));

CREATE POLICY "Staff can delete pet photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pet-photos' AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'veterinarian'::app_role, 'manager'::app_role]));

-- Add photo_url column to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS photo_url TEXT;