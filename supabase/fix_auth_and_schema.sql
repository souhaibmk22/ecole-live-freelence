-- ==============================================================================
-- RÉSOLUTION COMPLÈTE DU PROBLÈME DE CONNEXION & SCHÉMA (SUPABASE)
-- ==============================================================================

-- 1. Activer pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Débloquer les permissions sur les schémas public et auth
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 3. Réparer les politiques RLS de profiles (Éliminer toute récursion infinie)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_allow_all" ON public.profiles;

-- Autoriser la lecture de tous les profils par les utilisateurs connectés (nécessaire pour le chat et l'annuaire)
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
-- Autoriser la mise à jour de son propre profil
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
-- Déblocage total pour le rôle de service (Admin)
CREATE POLICY "profiles_service_all" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Nettoyer et Réinsérer proprement les 3 comptes de test
DO $$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_prof_id  UUID := 'a0000000-0000-0000-0000-000000000002';
    v_eleve_id UUID := 'a0000000-0000-0000-0000-000000000003';
    v_class_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_subject_id UUID := 'd0000000-0000-0000-0000-000000000001';
BEGIN

    -- Supprimer les anciens utilisateurs de test
    DELETE FROM auth.users WHERE email IN (
        'superadmin@monecoleenlive.fr',
        'prof@monecoleenlive.fr',
        'eleve@monecoleenlive.fr'
    );

    -- Compte SUPER ADMIN
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
        'superadmin@monecoleenlive.fr', extensions.crypt('SuperAdmin2027!', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Directeur","last_name":"Général","role":"super_admin"}',
        false, now(), now()
    );

    INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
    VALUES (v_admin_id, 'super_admin', 'Directeur', 'Général', now())
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin', first_name = 'Directeur', last_name = 'Général';

    -- Compte PROFESSEUR (Claire Dupont)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_prof_id, 'authenticated', 'authenticated',
        'prof@monecoleenlive.fr', extensions.crypt('Prof2027!', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Claire","last_name":"Dupont","role":"prof"}',
        false, now(), now()
    );

    INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
    VALUES (v_prof_id, 'prof', 'Claire', 'Dupont', now())
    ON CONFLICT (id) DO UPDATE SET role = 'prof', first_name = 'Claire', last_name = 'Dupont';

    -- Compte ÉTUDIANT (Lucas Martin)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_eleve_id, 'authenticated', 'authenticated',
        'eleve@monecoleenlive.fr', extensions.crypt('Eleve2027!', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Lucas","last_name":"Martin","role":"etudiant"}',
        false, now(), now()
    );

    INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
    VALUES (v_eleve_id, 'etudiant', 'Lucas', 'Martin', now())
    ON CONFLICT (id) DO UPDATE SET role = 'etudiant', first_name = 'Lucas', last_name = 'Martin';

    -- 5. Classe Démo & Inscription
    INSERT INTO public.classes (id, name, level, cycle)
    VALUES (v_class_id, 'Terminale S1 - Élite', '17-18 ans', 'Cycle Supérieur')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.enrollments (student_id, class_id)
    VALUES (v_eleve_id, v_class_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.subjects (id, class_id, name, is_mandatory)
    VALUES (v_subject_id, v_class_id, 'Mathématiques Générales', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    VALUES (v_prof_id, v_subject_id)
    ON CONFLICT DO NOTHING;

END $$;

-- 6. Forcer le rechargement immédiat du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
