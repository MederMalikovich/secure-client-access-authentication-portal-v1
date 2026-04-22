ALTER TABLE public.medical_records
ADD COLUMN IF NOT EXISTS anamnesis TEXT,
ADD COLUMN IF NOT EXISTS clinical_findings TEXT,
ADD COLUMN IF NOT EXISTS vaccination_status TEXT,
ADD COLUMN IF NOT EXISTS allergy_notes TEXT,
ADD COLUMN IF NOT EXISTS follow_up_plan TEXT,
ADD COLUMN IF NOT EXISTS owner_recommendations TEXT,
ADD COLUMN IF NOT EXISTS next_visit_date TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.medical_record_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  title TEXT NOT NULL,
  study_type TEXT NOT NULL DEFAULT 'analysis',
  study_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  laboratory_name TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_record_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medical staff can view medical record files"
ON public.medical_record_files
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role, 'registrar'::public.app_role, 'manager'::public.app_role]));

CREATE POLICY "Clients can view own pet medical record files"
ON public.medical_record_files
FOR SELECT
TO authenticated
USING (
  pet_id IN (
    SELECT pets.id
    FROM public.pets
    WHERE pets.client_id IN (
      SELECT profiles.client_id
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.client_id IS NOT NULL
    )
  )
);

CREATE POLICY "Vets can create medical record files"
ON public.medical_record_files
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role]));

CREATE POLICY "Vets can update medical record files"
ON public.medical_record_files
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role]));

CREATE POLICY "Vets can delete medical record files"
ON public.medical_record_files
FOR DELETE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role]));

CREATE INDEX IF NOT EXISTS idx_medical_record_files_record_id ON public.medical_record_files(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_files_pet_id ON public.medical_record_files(pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_files_study_date ON public.medical_record_files(study_date DESC);

CREATE TRIGGER update_medical_record_files_updated_at
BEFORE UPDATE ON public.medical_record_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-record-files', 'medical-record-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Medical staff can upload medical record files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-record-files'
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role])
);

CREATE POLICY "Medical staff can view stored medical record files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-record-files'
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role, 'registrar'::public.app_role, 'manager'::public.app_role])
);

CREATE POLICY "Medical staff can update stored medical record files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'medical-record-files'
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role])
)
WITH CHECK (
  bucket_id = 'medical-record-files'
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role])
);

CREATE POLICY "Medical staff can delete stored medical record files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-record-files'
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'veterinarian'::public.app_role])
);

CREATE POLICY "Clients can view own stored medical record files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-record-files'
  AND EXISTS (
    SELECT 1
    FROM public.medical_record_files mrf
    JOIN public.pets pt ON pt.id = mrf.pet_id
    JOIN public.profiles pr ON pr.client_id = pt.client_id
    WHERE pr.user_id = auth.uid()
      AND mrf.file_path = storage.objects.name
  )
);