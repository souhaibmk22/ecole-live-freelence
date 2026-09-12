import useSWR, { mutate } from "swr";
import {
  fetchUserConversationsAction,
  fetchUserDirectoryAction,
  fetchAvailableClassesAndSubjectsAction,
} from "@/app/(platform)/messages/actions";
import { ChatConversation, Profile } from "@/lib/types";

/**
 * Hook SWR pour la gestion et mise en cache des conversations
 * - Déduplication automatique des requêtes (60s)
 * - Cache instantané en mémoire et persistant SWR
 * - Zéro requête inutile lors du zapping entre pages
 */
export function useUserConversations(
  currentUser: Profile,
  initialConversations: ChatConversation[] = []
) {
  const cacheKey = `user_conversations_${currentUser.id}`;

  const { data, error, mutate: swrMutate, isValidating } = useSWR<ChatConversation[]>(
    cacheKey,
    async () => {
      const res = await fetchUserConversationsAction();
      if (!res.success) throw new Error(res.error || "Erreur chargement conversations");
      return res.data;
    },
    {
      fallbackData: initialConversations.length > 0 ? initialConversations : undefined,
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  );

  const setConversations = (
    updater: ChatConversation[] | ((prev: ChatConversation[]) => ChatConversation[])
  ) => {
    swrMutate(
      (current) => {
        if (typeof updater === "function") {
          return updater(current || []);
        }
        return updater;
      },
      { revalidate: false }
    );
  };

  return {
    conversations: data || initialConversations || [],
    setConversations,
    refreshConversations: () => swrMutate(),
    isLoading: !data && !error && initialConversations.length === 0,
    isValidating,
  };
}

/**
 * Hook SWR pour l'annuaire des utilisateurs
 */
export function useUserDirectory(currentUser: Profile, enabled = true) {
  const cacheKey = enabled ? `user_directory_${currentUser.id}` : null;

  const { data, error, mutate: swrMutate, isValidating } = useSWR(
    cacheKey,
    async () => {
      const res = await fetchUserDirectoryAction();
      if (!res.success) throw new Error(res.error || "Erreur chargement annuaire");
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 120000,
    }
  );

  return {
    directoryUsers: data || [],
    isLoadingDirectory: !data && !error && enabled,
    refreshDirectory: () => swrMutate(),
    isValidating,
  };
}

/**
 * Hook SWR pour les classes et matières (mise en cache 5 min)
 */
export function useAvailableClassesAndSubjects(enabled = true) {
  const cacheKey = enabled ? "classes_and_subjects_cache" : null;

  const { data, error, mutate: swrMutate, isValidating } = useSWR(
    cacheKey,
    async () => {
      const res = await fetchAvailableClassesAndSubjectsAction();
      if (!res.success) throw new Error(res.error || "Erreur chargement classes/matières");
      return { classes: res.classes, subjects: res.subjects };
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 300000,
    }
  );

  return {
    availableClasses: data?.classes || [],
    availableSubjects: data?.subjects || [],
    isLoadingClasses: !data && !error && enabled,
    refreshClassesAndSubjects: () => swrMutate(),
    isValidating,
  };
}
