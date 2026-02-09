
INSERT INTO storage.buckets (id, name, public) VALUES ('health-records', 'health-records', false);

CREATE POLICY "Authenticated users can upload health records"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'health-records');

CREATE POLICY "Authenticated users can view health records"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'health-records');

CREATE POLICY "Authenticated users can download health records"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'health-records');

CREATE POLICY "Doctors can delete health records"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'health-records');
