-- ==============================================================================
-- MIGRATION 06 : Supports de Cours & Ressources Pédagogiques (PDF, Vidéos, Liens)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    material_type TEXT NOT NULL DEFAULT 'document', -- 'document' | 'video' | 'link'
    file_url TEXT,
    file_name TEXT,
    file_size NUMERIC,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_course_materials_subject ON public.course_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_author ON public.course_materials(author_id);

-- Activation de RLS
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course materials viewable by authenticated users" ON public.course_materials;
CREATE POLICY "Course materials viewable by authenticated users" ON public.course_materials
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers and admins can manage course materials" ON public.course_materials;
CREATE POLICY "Teachers and admins can manage course materials" ON public.course_materials
FOR ALL TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('prof', 'admin', 'super_admin')
);

-- ==============================================================================
-- PRIVILÈGES & GRANTS
-- ==============================================================================
GRANT ALL ON TABLE public.course_materials TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

