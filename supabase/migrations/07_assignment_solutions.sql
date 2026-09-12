-- Migration 07 : Solutions et Corrigés-types liés aux Devoirs
-- Permet aux professeurs d'attacher un corrigé (PDF, Photo, texte) et de le publier pour les élèves

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS solution_url TEXT,
ADD COLUMN IF NOT EXISTS solution_name TEXT,
ADD COLUMN IF NOT EXISTS solution_text TEXT,
ADD COLUMN IF NOT EXISTS solution_published BOOLEAN DEFAULT false;

-- Déblocage des permissions
GRANT ALL ON TABLE public.assignments TO postgres, anon, authenticated, service_role;
