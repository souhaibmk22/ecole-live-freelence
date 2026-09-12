-- ==============================================================================
-- CRÉATION / RÉINITIALISATION PROPRE DES COMPTES DE TEST (SUPABASE PRODUCTION)
-- ==============================================================================

DO $$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_prof_id  UUID := 'a0000000-0000-0000-0000-000000000002';
    v_eleve_id UUID := 'a0000000-0000-0000-0000-000000000003';
    v_class_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_subject_id UUID := 'd0000000-0000-0000-0000-000000000001';
BEGIN

    -- 0. Nettoyer les anciens comptes pour éviter les conflits d'emails
    DELETE FROM auth.users WHERE email IN (
        'superadmin@monecoleenlive.fr',
        'prof@monecoleenlive.fr',
        'eleve@monecoleenlive.fr'
    );

    -- 1. Compte SUPER ADMIN / DIRECTION
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
        'superadmin@monecoleenlive.fr', crypt('SuperAdmin2027!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Directeur","last_name":"Général","role":"super_admin"}', now(), now()
    );

    INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
    VALUES (v_admin_id, 'super_admin', 'Directeur', 'Général', now())
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin', first_name = 'Directeur', last_name = 'Général';

    -- 2. Compte PROFESSEUR (Claire Dupont)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_prof_id, 'authenticated', 'authenticated',
        'prof@monecoleenlive.fr', crypt('Prof2027!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Claire","last_name":"Dupont","role":"prof"}', now(), now()
    );

    INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
    VALUES (v_prof_id, 'prof', 'Claire', 'Dupont', now())
    ON CONFLICT (id) DO UPDATE SET role = 'prof', first_name = 'Claire', last_name = 'Dupont';

    -- 3. Compte ÉTUDIANT (Lucas Martin)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_eleve_id, 'authenticated', 'authenticated',
        'eleve@monecoleenlive.fr', crypt('Eleve2027!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Lucas","last_name":"Martin","role":"etudiant"}', now(), now()
    );

    INSERT INTO public.profiles (id, role, first_name, last_name, updated_at)
    VALUES (v_eleve_id, 'etudiant', 'Lucas', 'Martin', now())
    ON CONFLICT (id) DO UPDATE SET role = 'etudiant', first_name = 'Lucas', last_name = 'Martin';

    -- 4. Classe Démo & Inscription de Lucas
    INSERT INTO public.classes (id, name, level, cycle)
    VALUES (v_class_id, 'Terminale S1 - Élite', '17-18 ans', 'Cycle Supérieur')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.enrollments (student_id, class_id)
    VALUES (v_eleve_id, v_class_id)
    ON CONFLICT DO NOTHING;

    -- 5. Matière Mathématiques assignée à Claire
    INSERT INTO public.subjects (id, class_id, name, is_mandatory)
    VALUES (v_subject_id, v_class_id, 'Mathématiques Générales', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    VALUES (v_prof_id, v_subject_id)
    ON CONFLICT DO NOTHING;

END $$;
