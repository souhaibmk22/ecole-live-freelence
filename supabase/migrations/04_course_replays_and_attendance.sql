-- ==============================================================================
-- MIGRATION 04 : Replays Vidéo des Cours & Suivi des Présences Administrateur
-- ==============================================================================

-- 1. Ajout de la colonne replay_url sur les sessions live
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS replay_url TEXT;

-- 2. Création du Bucket Supabase Storage pour les Replays de Cours
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-replays', 'course-replays', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Politiques d'accès au Storage pour les vidéos de replays
DROP POLICY IF EXISTS "Replays Public Read" ON storage.objects;
CREATE POLICY "Replays Public Read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'course-replays');

DROP POLICY IF EXISTS "Teachers and Admins Can Upload Replays" ON storage.objects;
CREATE POLICY "Teachers and Admins Can Upload Replays" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'course-replays' AND
    (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('prof', 'admin', 'super_admin')
    )
);
