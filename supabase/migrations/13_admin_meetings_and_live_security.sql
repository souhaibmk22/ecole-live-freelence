-- ==============================================================================
-- 13. RÉUNIONS INSTITUTIONNELLES & SÉCURITÉ DU CLOISONNEMENT DES LIVES
-- ==============================================================================

-- 1. Table des réunions administratives (Parents, Profs, Direction)
CREATE TABLE IF NOT EXISTS public.admin_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_audience TEXT NOT NULL DEFAULT 'all_parents', -- 'all_parents', 'class_parents', 'all_teachers', 'class_teachers', 'direction_only', 'custom'
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    room_name TEXT NOT NULL UNIQUE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'ended'
    replay_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter replay_url si la table existait déjà
ALTER TABLE public.admin_meetings ADD COLUMN IF NOT EXISTS replay_url TEXT;

-- Table des participants invités spécifiquement
CREATE TABLE IF NOT EXISTS public.admin_meeting_participants (
    meeting_id UUID NOT NULL REFERENCES public.admin_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ,
    PRIMARY KEY (meeting_id, user_id)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_admin_meetings_start ON public.admin_meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_admin_meetings_target ON public.admin_meetings(target_audience);
CREATE INDEX IF NOT EXISTS idx_admin_meetings_class ON public.admin_meetings(class_id);

-- RLS
ALTER TABLE public.admin_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_meeting_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_meetings_select" ON public.admin_meetings;
CREATE POLICY "admin_meetings_select" ON public.admin_meetings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_meetings_all_admin" ON public.admin_meetings;
CREATE POLICY "admin_meetings_all_admin" ON public.admin_meetings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'prof')
        )
    );

DROP POLICY IF EXISTS "admin_meeting_participants_select" ON public.admin_meeting_participants;
CREATE POLICY "admin_meeting_participants_select" ON public.admin_meeting_participants
    FOR SELECT TO authenticated USING (true);

-- Permissions
GRANT ALL ON public.admin_meetings TO authenticated, service_role, postgres;
GRANT ALL ON public.admin_meeting_participants TO authenticated, service_role, postgres;
