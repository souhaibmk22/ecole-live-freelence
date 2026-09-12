-- ==============================================================================
-- MIGRATION 11 : AJOUT DE LA COLONNE PHONE DANS PROFILES & GESTION DES CONTACTS
-- ==============================================================================

-- 1. Ajout de la colonne phone dans public.profiles si elle n'existe pas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Index de recherche pour les numéros de téléphone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Mise à jour de la politique RLS pour permettre la lecture/écriture du champ phone
-- Les administrateurs et super_admins peuvent modifier tous les profils
-- Les utilisateurs peuvent voir et modifier leur propre profil
