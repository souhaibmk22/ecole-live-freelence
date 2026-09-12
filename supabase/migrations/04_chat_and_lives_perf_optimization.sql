-- ==============================================================================
-- MIGRATION 04 : INDEX DE PERFORMANCE & FONCTIONS RPC AGRÉGÉES (ZÉRO N+1)
-- ==============================================================================

-- 1. INDEX DE PERFORMANCE CRITIQUES
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created 
    ON public.chat_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created 
    ON public.chat_messages(sender_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_conv 
    ON public.chat_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_conv_user 
    ON public.chat_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_class 
    ON public.enrollments(student_id, class_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_subject_status 
    ON public.live_sessions(subject_id, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_session_attendance_session_student 
    ON public.session_attendance(session_id, student_id);

-- 2. FONCTION RPC AGRÉGÉE POUR TOUTES LES CONVERSATIONS + DERNIER MESSAGE + COMPTEUR NON-LU (1 SEULE REQUÊTE)
CREATE OR REPLACE FUNCTION public.get_user_conversations_with_meta(
    p_user_id UUID,
    p_user_role TEXT,
    p_user_class_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(conv_row ORDER BY conv_row->>'last_message_time' DESC NULLS LAST, conv_row->>'updated_at' DESC), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT 
            jsonb_build_object(
                'id', c.id,
                'type', c.type,
                'title', CASE 
                    WHEN c.type = 'direct' AND other_user.id IS NOT NULL THEN
                        '✉️ ' || COALESCE(other_user.first_name, '') || ' ' || COALESCE(other_user.last_name, '') || 
                        ' (' || CASE WHEN other_user.role = 'prof' THEN 'Professeur' WHEN other_user.role = 'admin' OR other_user.role = 'super_admin' THEN 'Direction' WHEN other_user.role = 'parent' THEN 'Parent' ELSE 'Élève' END || ')'
                    ELSE c.title
                END,
                'class_id', c.class_id,
                'subject_id', c.subject_id,
                'created_by', c.created_by,
                'created_at', c.created_at,
                'updated_at', c.updated_at,
                'class', CASE WHEN cl.id IS NOT NULL THEN jsonb_build_object('id', cl.id, 'name', cl.name) ELSE NULL END,
                'subject', CASE WHEN sub.id IS NOT NULL THEN jsonb_build_object('id', sub.id, 'name', sub.name) ELSE NULL END,
                'participants', COALESCE(parts.list, '[]'::jsonb),
                'last_message', CASE WHEN lm.id IS NOT NULL THEN jsonb_build_object(
                    'id', lm.id,
                    'conversation_id', lm.conversation_id,
                    'sender_id', lm.sender_id,
                    'content', lm.content,
                    'attachment_url', lm.attachment_url,
                    'attachment_type', lm.attachment_type,
                    'attachment_name', lm.attachment_name,
                    'status', lm.status,
                    'is_seen', lm.is_seen,
                    'created_at', lm.created_at,
                    'sender', jsonb_build_object('id', sp.id, 'first_name', sp.first_name, 'last_name', sp.last_name, 'role', sp.role, 'avatar_url', sp.avatar_url)
                ) ELSE NULL END,
                'unread_count', COALESCE(unr.count, 0),
                'last_message_time', lm.created_at
            ) AS conv_row
        FROM public.chat_conversations c
        LEFT JOIN public.classes cl ON cl.id = c.class_id
        LEFT JOIN public.subjects sub ON sub.id = c.subject_id
        -- Participants du salon
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(jsonb_build_object('id', pr.id, 'first_name', pr.first_name, 'last_name', pr.last_name, 'role', pr.role, 'avatar_url', pr.avatar_url)) AS list
            FROM public.chat_participants cp
            JOIN public.profiles pr ON pr.id = cp.user_id
            WHERE cp.conversation_id = c.id
        ) parts ON true
        -- Interlocuteur direct
        LEFT JOIN LATERAL (
            SELECT pr.id, pr.first_name, pr.last_name, pr.role
            FROM public.chat_participants cp
            JOIN public.profiles pr ON pr.id = cp.user_id
            WHERE cp.conversation_id = c.id AND cp.user_id != p_user_id
            LIMIT 1
        ) other_user ON c.type = 'direct'
        -- Participation de l'utilisateur connecté
        LEFT JOIN public.chat_participants my_part ON my_part.conversation_id = c.id AND my_part.user_id = p_user_id
        -- Dernier message (Index scan < 0.1ms via LATERAL JOIN)
        LEFT JOIN LATERAL (
            SELECT m.*
            FROM public.chat_messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) lm ON true
        LEFT JOIN public.profiles sp ON sp.id = lm.sender_id
        -- Compteur de messages non lus (Exact & Rapide)
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS count
            FROM public.chat_messages um
            WHERE um.conversation_id = c.id 
              AND um.sender_id != p_user_id 
              AND um.created_at > COALESCE(my_part.last_read_at, '1970-01-01T00:00:00Z'::timestamptz)
        ) unr ON true
        WHERE (
            -- Message direct : l'utilisateur doit être participant
            (c.type = 'direct' AND my_part.user_id IS NOT NULL)
            OR
            -- Annonces globales
            (c.type = 'announcement' AND c.class_id IS NULL)
            OR
            -- Salons de classe
            (c.class_id IS NOT NULL AND (
                p_user_role IN ('admin', 'super_admin', 'prof')
                OR (p_user_role = 'etudiant' AND p_user_class_id IS NOT NULL AND c.class_id = p_user_class_id)
            ))
        )
    ) subq;

    RETURN v_result;
END;
$$;

-- 3. FONCTION RPC AGRÉGÉE POUR L'ANNUAIRE DES UTILISATEURS (1 SEULE REQUÊTE)
CREATE OR REPLACE FUNCTION public.get_user_directory_with_class(p_current_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'first_name', COALESCE(p.first_name, ''),
            'last_name', COALESCE(p.last_name, ''),
            'role', p.role,
            'avatar_url', p.avatar_url,
            'class_name', cl.name
        ) ORDER BY p.first_name ASC, p.last_name ASC
    ), '[]'::jsonb)
    INTO v_result
    FROM public.profiles p
    LEFT JOIN public.enrollments e ON e.student_id = p.id
    LEFT JOIN public.classes cl ON cl.id = e.class_id
    WHERE p.id != p_current_user_id;

    RETURN v_result;
END;
$$;

-- 4. DROITS D'EXÉCUTION
GRANT EXECUTE ON FUNCTION public.get_user_conversations_with_meta(UUID, TEXT, UUID) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_user_directory_with_class(UUID) TO authenticated, service_role, postgres;

-- 5. RECHARGER LE CACHE DU SCHÉMA POSTGREST
NOTIFY pgrst, 'reload schema';
