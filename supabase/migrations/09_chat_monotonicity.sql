-- Migration 09: Monotonie et Robustesse de la Messagerie
-- Mon École en Live

-- 1. Fonction RPC atomique pour garantir la monotonie de last_read_at
CREATE OR REPLACE FUNCTION public.mark_conversation_read_monotonic(
  p_conversation_id UUID,
  p_user_id UUID,
  p_read_at TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.chat_participants (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, p_user_id, p_read_at)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    last_read_at = GREATEST(
      COALESCE(public.chat_participants.last_read_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
      EXCLUDED.last_read_at
    );
END;
$$;

-- 2. Garantir les index pour la vitesse de requêtage
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created ON public.chat_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_lookup ON public.chat_participants (conversation_id, user_id);

-- 3. Activer la réplication Realtime si ce n'est pas déjà fait
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
