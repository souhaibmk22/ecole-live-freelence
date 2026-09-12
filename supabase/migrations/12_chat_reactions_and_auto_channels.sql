-- ==============================================================================
-- 12. RÉACTIONS EMOJIS & GROUPES AUTOMATIQUES SYNCHRONISÉS (PARENTS & ÉQUIPES PROFS)
-- ==============================================================================

-- 1. Table des réactions Emojis sur les messages
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_msg ON public.chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user ON public.chat_message_reactions(user_id);

-- RLS pour les réactions
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_message_reactions_select" ON public.chat_message_reactions;
CREATE POLICY "chat_message_reactions_select" ON public.chat_message_reactions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_message_reactions_insert" ON public.chat_message_reactions;
CREATE POLICY "chat_message_reactions_insert" ON public.chat_message_reactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_message_reactions_delete" ON public.chat_message_reactions;
CREATE POLICY "chat_message_reactions_delete" ON public.chat_message_reactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Colonnes étendues pour les salons d'annonces et d'équipes
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS is_readonly_for_members BOOLEAN DEFAULT false;

ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS channel_scope TEXT DEFAULT 'general';

-- Permissions d'exécution
GRANT ALL ON public.chat_message_reactions TO authenticated, service_role, postgres;
