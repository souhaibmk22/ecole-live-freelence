-- ==============================================================================
-- MIGRATION 03 : Cours en Direct (Jitsi Meet) & Feuilles d'Émargement
-- ==============================================================================

-- 1. Table des sessions de cours en direct
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    room_name TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'live', 'ended')) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_subject ON public.live_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON public.live_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);

-- 2. Table des présences / feuille d'émargement
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL DEFAULT false,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);

-- 3. Permissions PostgreSQL (GRANTs)
GRANT ALL ON TABLE public.live_sessions TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.attendance TO postgres, authenticated, service_role;

-- 4. Activation RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS
DROP POLICY IF EXISTS "live_sessions_read_all" ON public.live_sessions;
CREATE POLICY "live_sessions_read_all" ON public.live_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "live_sessions_manage" ON public.live_sessions;
CREATE POLICY "live_sessions_manage" ON public.live_sessions FOR ALL TO authenticated 
USING (
    teacher_id = auth.uid() 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    teacher_id = auth.uid() 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS "attendance_read_all" ON public.attendance;
CREATE POLICY "attendance_read_all" ON public.attendance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_manage" ON public.attendance;
CREATE POLICY "attendance_manage" ON public.attendance FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.live_sessions ls WHERE ls.id = attendance.session_id AND ls.teacher_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.live_sessions ls WHERE ls.id = attendance.session_id AND ls.teacher_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
