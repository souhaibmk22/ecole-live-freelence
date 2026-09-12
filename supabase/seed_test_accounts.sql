-- ==============================================================================
-- CRÉATION RAPIDE DE COMPTES DE TEST (À exécuter dans le SQL Editor Supabase)
-- ==============================================================================

-- 1. Compte SUPER ADMIN
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'superadmin@monecoleenlive.fr',
    crypt('SuperAdmin2027!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Directeur","last_name":"Général","role":"super_admin"}',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- 2. Compte PROFESSEUR
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'prof@monecoleenlive.fr',
    crypt('Prof2027!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Claire","last_name":"Dupont","role":"prof"}',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- 3. Compte ÉTUDIANT
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'eleve@monecoleenlive.fr',
    crypt('Eleve2027!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Lucas","last_name":"Martin","role":"etudiant"}',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;
