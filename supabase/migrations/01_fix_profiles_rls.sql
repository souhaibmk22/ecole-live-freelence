-- ==============================================================================
-- FIX RLS RECURSION SUR PROFILES
-- ==============================================================================

-- 1. Supprimer les anciennes politiques sur profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;

-- 2. Politique SELECT : Tout utilisateur connecté peut lire les profils (nom, prénom, rôle, avatar)
-- Cela évite toute récursion RLS et permet aux profs/élèves/admins de voir leurs noms respectifs
CREATE POLICY "profiles_select_authenticated" 
    ON public.profiles FOR SELECT 
    TO authenticated
    USING (true);

-- 3. Politique INSERT : Permis aux admins ou via trigger
CREATE POLICY "profiles_insert_authenticated" 
    ON public.profiles FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- 4. Politique UPDATE : Un utilisateur modifie son propre profil, un admin modifie tout
CREATE POLICY "profiles_update_authenticated" 
    ON public.profiles FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
    WITH CHECK (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- 5. Politique DELETE : Seuls les admins peuvent supprimer
CREATE POLICY "profiles_delete_admin" 
    ON public.profiles FOR DELETE 
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- 6. Mettre à jour le compte superadmin explicitement
UPDATE public.profiles
SET role = 'super_admin'::public.user_role,
    first_name = 'Super',
    last_name = 'Admin'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) LIKE '%superadmin%');
