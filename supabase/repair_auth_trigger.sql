-- ==============================================================================
-- RÉPARATION DU TRIGGER AUTH.USERS & DÉBLOCAGE COMPLET SUPABASE AUTH
-- ==============================================================================

-- 1. Sécuriser la fonction handle_new_user pour qu'elle n'interrompe JAMAIS la création d'utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role public.user_role := 'etudiant';
    v_first_name TEXT := '';
    v_last_name TEXT := '';
BEGIN
    BEGIN
        IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
            v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'etudiant';
    END;

    IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL THEN
        v_first_name := NEW.raw_user_meta_data->>'first_name';
    END IF;

    IF NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
        v_last_name := NEW.raw_user_meta_data->>'last_name';
    END IF;

    BEGIN
        INSERT INTO public.profiles (id, role, first_name, last_name, created_at, updated_at)
        VALUES (NEW.id, v_role, v_first_name, v_last_name, now(), now())
        ON CONFLICT (id) DO UPDATE
        SET role = EXCLUDED.role, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        -- Protection absolue : ne jamais bloquer auth.users
        NULL;
    END;

    RETURN NEW;
END;
$$;

-- 2. Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Débloquer tous les droits pour le serveur Supabase Auth (supabase_auth_admin)
DO $$
BEGIN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_admin, supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_admin, supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_admin, supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_admin, supabase_auth_admin';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Nettoyer les utilisateurs défaillants
DELETE FROM auth.users WHERE email IN (
    'superadmin@monecoleenlive.fr',
    'prof@monecoleenlive.fr',
    'eleve@monecoleenlive.fr'
);

-- 5. Recharger le schéma PostgREST
NOTIFY pgrst, 'reload schema';
