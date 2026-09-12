-- ==============================================================================
-- MIGRATION 02 : Classes, 19 Matières, Inscriptions & Affectations Enseignants
-- ==============================================================================

-- 1. Table des classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    level TEXT DEFAULT '10-11 ans',
    cycle TEXT DEFAULT 'Cycle Découverte',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table des matières rattachées aux classes
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subjects_class ON public.subjects(class_id);

-- 3. Table des inscriptions d'élèves dans les classes
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_class UNIQUE (student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.enrollments(class_id);

-- 4. Table d'assignation des professeurs aux matières
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_teacher_subject UNIQUE (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects(subject_id);

-- 5. Permissions PostgreSQL (GRANTs)
GRANT ALL ON TABLE public.classes TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.subjects TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.enrollments TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.teacher_subjects TO postgres, authenticated, service_role;

-- 6. Activation RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

-- 7. Politiques RLS simples et efficaces (sans récursion)
-- Classes
DROP POLICY IF EXISTS "classes_read_all" ON public.classes;
CREATE POLICY "classes_read_all" ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "classes_admin_manage" ON public.classes;
CREATE POLICY "classes_admin_manage" ON public.classes FOR ALL TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Subjects
DROP POLICY IF EXISTS "subjects_read_all" ON public.subjects;
CREATE POLICY "subjects_read_all" ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "subjects_admin_manage" ON public.subjects;
CREATE POLICY "subjects_admin_manage" ON public.subjects FOR ALL TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Enrollments
DROP POLICY IF EXISTS "enrollments_read_all" ON public.enrollments;
CREATE POLICY "enrollments_read_all" ON public.enrollments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "enrollments_admin_manage" ON public.enrollments;
CREATE POLICY "enrollments_admin_manage" ON public.enrollments FOR ALL TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Teacher Subjects
DROP POLICY IF EXISTS "teacher_subjects_read_all" ON public.teacher_subjects;
CREATE POLICY "teacher_subjects_read_all" ON public.teacher_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teacher_subjects_admin_manage" ON public.teacher_subjects;
CREATE POLICY "teacher_subjects_admin_manage" ON public.teacher_subjects FOR ALL TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));
