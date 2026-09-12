-- ==============================================================================
-- MIGRATION 14 : INDEX DE PERFORMANCE & DÉNORMALISATION EMAIL DANS PROFILES
-- ==============================================================================

-- 1. INDEX DE PERFORMANCE CRITIQUES (Scans indexés O(log N) au lieu de séquentiels)

-- Profils : filtrage par rôle et tri par date
CREATE INDEX IF NOT EXISTS idx_profiles_role_created 
    ON public.profiles(role, created_at DESC);

-- Séances live : planning enseignant et planning global
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_status_start 
    ON public.live_sessions(teacher_id, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status_start 
    ON public.live_sessions(status, start_time DESC);

-- Devoirs & Copies rendues (table: public.submissions)
CREATE INDEX IF NOT EXISTS idx_assignments_subject_due 
    ON public.assignments(subject_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment 
    ON public.submissions(student_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_submitted 
    ON public.submissions(assignment_id, submitted_at DESC);

-- Feuilles d'émargement & Présences
CREATE INDEX IF NOT EXISTS idx_attendance_student_present 
    ON public.attendance(student_id, present, marked_at);

-- Notifications : index partiel sur les non-lues uniquement (badge ultra-rapide < 0.1ms)
CREATE INDEX IF NOT EXISTS idx_notifications_unread_partial 
    ON public.notifications(user_id, created_at DESC) 
    WHERE is_read = false;

-- Réunions & Audit de sécurité
CREATE INDEX IF NOT EXISTS idx_admin_meetings_status_start 
    ON public.admin_meetings(status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created 
    ON public.audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent_student 
    ON public.parent_students(parent_id, student_id);


-- 2. DÉNORMALISATION DU CHAMP EMAIL DANS PUBLIC.PROFILES (ZÉRO APPEL N+1 AUTH)

-- A. Ajouter la colonne email si absente
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS email TEXT;

-- B. Rétro-remplissage des emails existants depuis auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- C. Mise à jour du trigger d'inscription automatique pour insérer et synchroniser l'email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'etudiant'::public.user_role),
    NEW.raw_user_meta_data->>'phone',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    first_name = CASE WHEN EXCLUDED.first_name != '' THEN EXCLUDED.first_name ELSE public.profiles.first_name END,
    last_name = CASE WHEN EXCLUDED.last_name != '' THEN EXCLUDED.last_name ELSE public.profiles.last_name END,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
