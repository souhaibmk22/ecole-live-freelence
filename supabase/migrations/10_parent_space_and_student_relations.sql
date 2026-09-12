-- ==============================================================================
-- MIGRATION : ESPACE PARENT & RELATIONS MULTI-ENFANTS
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ==============================================================================

-- 1. Ajouter le rôle 'parent' dans l'ENUM public.user_role si l'enum existe
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- 2. Créer la table parent_students pour lier les parents à leurs enfants (élèves)
CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'parent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(parent_id, student_id)
);

-- 3. Index de performance
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON public.parent_students(student_id);

-- 4. Débloquer les permissions sur la table pour tous les rôles
GRANT ALL ON TABLE public.parent_students TO postgres, anon, authenticated, service_role;

-- 5. Activer Row Level Security (RLS)
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- 6. Politiques RLS sécurisées
DROP POLICY IF EXISTS "parent_students_select_all" ON public.parent_students;
DROP POLICY IF EXISTS "parent_students_parent_read" ON public.parent_students;
DROP POLICY IF EXISTS "parent_students_admin_all" ON public.parent_students;
DROP POLICY IF EXISTS "parent_students_service_all" ON public.parent_students;

-- Lecture pour les parents et les admins
CREATE POLICY "parent_students_select" 
    ON public.parent_students 
    FOR SELECT 
    TO authenticated 
    USING (
        parent_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
        )
    );

-- Gestion complète pour les administrateurs
CREATE POLICY "parent_students_admin_manage" 
    ON public.parent_students 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
        )
    );

-- Déblocage total pour le service_role (Admin Actions serveur)
CREATE POLICY "parent_students_service_all" 
    ON public.parent_students 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- ==============================================================================
-- VÉRIFICATION : Tout est prêt pour l'Espace Parent !
-- ==============================================================================
