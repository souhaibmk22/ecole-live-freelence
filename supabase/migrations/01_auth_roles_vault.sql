-- ==============================================================================
-- 1. ENUM DES RÔLES
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'prof', 'etudiant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLE DES PROFILS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'etudiant',
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 3. TABLE DES LOGS D'AUDIT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_resource TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 4. FONCTIONS DE SÉCURITÉ
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN (SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- ==============================================================================
-- 5. POLITIQUES RLS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (public.is_admin_or_super());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (public.is_admin_or_super());

DROP POLICY IF EXISTS "audit_logs_select_super" ON public.audit_logs;
CREATE POLICY "audit_logs_select_super" ON public.audit_logs FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs FOR INSERT WITH CHECK (public.is_admin_or_super());

-- ==============================================================================
-- 6. TRIGGER AUTOMATIQUE POUR LES NOUVEAUX UTILISATEURS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role := 'etudiant';
    v_first_name TEXT := '';
    v_last_name TEXT := '';
BEGIN
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        BEGIN
            v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
        EXCEPTION WHEN OTHERS THEN
            v_role := 'etudiant';
        END;
    END IF;

    IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL THEN
        v_first_name := NEW.raw_user_meta_data->>'first_name';
    END IF;

    IF NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
        v_last_name := NEW.raw_user_meta_data->>'last_name';
    END IF;

    INSERT INTO public.profiles (id, role, first_name, last_name, created_at, updated_at)
    VALUES (NEW.id, v_role, v_first_name, v_last_name, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. SYNCHRONISATION DES UTILISATEURS EXISTANTS
-- ==============================================================================
INSERT INTO public.profiles (id, role, first_name, last_name)
SELECT 
    id, 
    CASE WHEN email = 'superadmin@monecoleenlive.fr' THEN 'super_admin'::public.user_role ELSE 'etudiant'::public.user_role END,
    'Super',
    'Admin'
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
