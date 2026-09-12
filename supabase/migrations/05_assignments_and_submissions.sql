-- ==============================================================================
-- MIGRATION 05 : Devoirs, Dépôts de Copies & Notations Pédagogiques
-- ==============================================================================

-- 1. Table des devoirs créés par les professeurs
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    max_points NUMERIC DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des soumissions / copies rendues par les élèves
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size NUMERIC,
    student_comment TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    grade NUMERIC,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    status TEXT DEFAULT 'submitted', -- 'submitted' | 'graded' | 'late'
    CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);

-- 3. Activation de RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour assignments
DROP POLICY IF EXISTS "Assignments viewable by authenticated users" ON public.assignments;
CREATE POLICY "Assignments viewable by authenticated users" ON public.assignments
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers and admins can manage assignments" ON public.assignments;
CREATE POLICY "Teachers and admins can manage assignments" ON public.assignments
FOR ALL TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('prof', 'admin', 'super_admin')
);

-- Politiques RLS pour submissions
DROP POLICY IF EXISTS "Submissions viewable by student, teacher and admin" ON public.submissions;
CREATE POLICY "Submissions viewable by student, teacher and admin" ON public.submissions
FOR SELECT TO authenticated
USING (
    student_id = auth.uid() OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('prof', 'admin', 'super_admin')
);

DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.submissions;
CREATE POLICY "Students can insert their own submissions" ON public.submissions
FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid()
);

DROP POLICY IF EXISTS "Students can update their submission before grading" ON public.submissions;
CREATE POLICY "Students can update their submission before grading" ON public.submissions
FOR UPDATE TO authenticated
USING (
    student_id = auth.uid() OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('prof', 'admin', 'super_admin')
);

-- ==============================================================================
-- PRIVILÈGES & GRANTS (ESSENTIEL POUR SUPABASE SERVICE_ROLE & AUTHENTICATED)
-- ==============================================================================
GRANT ALL ON TABLE public.assignments TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.submissions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- 4. Bucket Supabase Storage pour les pièces jointes et devoirs
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments-files', 'assignments-files', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques Storage
DROP POLICY IF EXISTS "Assignments Storage Public Read" ON storage.objects;
CREATE POLICY "Assignments Storage Public Read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'assignments-files');

DROP POLICY IF EXISTS "Assignments Storage Insert" ON storage.objects;
CREATE POLICY "Assignments Storage Insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignments-files');

DROP POLICY IF EXISTS "Assignments Storage Update" ON storage.objects;
CREATE POLICY "Assignments Storage Update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'assignments-files');
