-- ==============================================================================
-- ACCORDER LES PERMISSIONS SUR LES TABLES SUPABASE
-- ==============================================================================

-- 1. Accorder les droits de schéma
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Accorder tous les droits sur les tables aux rôles Supabase
GRANT ALL ON TABLE public.profiles TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO postgres, authenticated, service_role;

-- 3. Accorder les droits sur les séquences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;

-- 4. Rétablir et s'assurer des politiques RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "profiles_update_authenticated" ON public.profiles;
CREATE POLICY "profiles_update_authenticated" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
    WITH CHECK (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "profiles_delete_authenticated" ON public.profiles;
CREATE POLICY "profiles_delete_authenticated" 
    ON public.profiles FOR DELETE 
    TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
CREATE POLICY "profiles_insert_authenticated" 
    ON public.profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- 5. Forcer le rôle super_admin sur le compte
UPDATE public.profiles
SET role = 'super_admin',
    first_name = 'Super',
    last_name = 'Admin'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) LIKE '%superadmin%');
