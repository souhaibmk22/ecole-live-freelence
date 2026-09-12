"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Paperclip,
  Camera,
  Search,
  Users,
  Megaphone,
  BookOpen,
  User,
  Plus,
  Loader2,
  FileText,
  Download,
  Sparkles,
  X,
  GraduationCap,
  Mail,
  UserPlus,
  Check,
  CheckCheck,
  ArrowLeft,
  History,
  Trash2,
  MoreVertical,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Play,
  Smile,
} from "lucide-react";
import { ChatConversation, ChatMessage, MessageDeliveryStatus, Profile } from "@/lib/types";
import {
  fetchUserConversationsAction,
  fetchConversationMessagesAction,
  sendMessageAction,
  createClassConversationAction,
  getOrCreateDirectConversationAction,
  markConversationAsReadAction,
  deleteMessageAction,
  deleteConversationAction,
  toggleMessageReactionAction,
} from "@/app/(platform)/messages/actions";
import {
  useUserConversations,
  useUserDirectory,
  useAvailableClassesAndSubjects,
} from "@/lib/hooks/useChatSWR";
import CameraCaptureModal from "@/components/platform/CameraCaptureModal";
import ChatMediaViewerModal, { MediaViewerItem } from "@/components/platform/ChatMediaViewerModal";
import { createClient } from "@/lib/supabase/client";
import {
  sanitizeInputText,
  checkMessageCompliance,
  parseMessageLinks,
} from "@/lib/chatSecurity";
import { compressImageFile } from "@/lib/imageCompressor";

interface ChatClientViewProps {
  currentUser: Profile;
  initialConversations?: ChatConversation[];
}

// ---------------------------------------------------------------------------
// Helper : Règle de monotonie des statuts (sending < sent < delivered < read)
// ---------------------------------------------------------------------------
function getStatusRank(status?: string): number {
  switch (status) {
    case "read":
    case "seen":
      return 3;
    case "delivered":
      return 2;
    case "sent":
      return 1;
    case "sending":
    default:
      return 0;
  }
}

function mergeStatus(
  currentStatus?: MessageDeliveryStatus,
  newStatus?: MessageDeliveryStatus
): MessageDeliveryStatus {
  const rCurrent = getStatusRank(currentStatus);
  const rNew = getStatusRank(newStatus);
  if (rCurrent >= rNew) {
    return (currentStatus === "seen" ? "read" : currentStatus) || "sent";
  }
  return (newStatus === "seen" ? "read" : newStatus) || "sent";
}

export default function ChatClientView({
  currentUser,
  initialConversations = [],
}: ChatClientViewProps) {
  // Hook SWR : Déduplication automatique (60s), cache mémoire et instantanéité 0ms
  const {
    conversations,
    setConversations,
    isLoading: loadingConversations,
    refreshConversations,
  } = useUserConversations(currentUser, initialConversations);

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (initialConversations.length > 0) return initialConversations[0].id;
    if (typeof window !== "undefined") {
      try {
        const lastActive = localStorage.getItem(`monecole_active_conv_${currentUser.id}`);
        if (lastActive) return lastActive;
        const cached = localStorage.getItem(`monecole_convs_${currentUser.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
        }
      } catch (e) {}
    }
    return "";
  });

  // Vue Mobile : 'list' par défaut pour afficher d'abord la liste des conversations (comme WhatsApp / Instagram)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Sauvegarde continue dans le cache local pour éliminer tout temps de chargement lors de la navigation
  useEffect(() => {
    if (typeof window !== "undefined" && conversations.length > 0) {
      try {
        localStorage.setItem(`monecole_convs_${currentUser.id}`, JSON.stringify(conversations));
      } catch (e) {}
    }
  }, [conversations, currentUser.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && activeConvId) {
      try {
        localStorage.setItem(`monecole_active_conv_${currentUser.id}`, activeConvId);
      } catch (e) {}
    }
  }, [activeConvId, currentUser.id]);

  // Synchronisation des Refs pour éliminer tout risque de closure périmée dans les callbacks WebSockets
  const mobileViewRef = useRef(mobileView);
  useEffect(() => {
    mobileViewRef.current = mobileView;
  }, [mobileView]);

  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const conversationsRef = useRef<ChatConversation[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Messages & Pagination façon Instagram
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Canal Supabase Realtime souscrit pour la discussion active : chat:{convId}
  const activeChatChannelRef = useRef<any>(null);
  // Canal Supabase Realtime souscrit pour le stream global : global_chat_stream (Unique & Persistant)
  const globalStreamChannelRef = useRef<any>(null);

  // Timer de Debounce pour l'accusé de lecture (800ms de visibilité continue)
  const readDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cache mémoire pour zapper instantanément entre conversations sans délai
  const messagesCache = useRef<{ [convId: string]: { data: ChatMessage[]; hasMore: boolean } }>({});

  // Filtre et recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "direct" | "subject_channel" | "teachers_team" | "announcement">("all");

  // Pièces jointes & Caméra
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeMediaViewer, setActiveMediaViewer] = useState<MediaViewerItem | null>(null);

  // Indicateur "En train d'écrire..."
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);

  // Modale Nouveau Salon ou Message Direct
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"class_room" | "direct_message">("class_room");

  // Modales de suppression façon Instagram
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<ChatConversation | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Alerte de modération / sécurité
  const [moderationAlert, setModerationAlert] = useState<{ message: string; label?: string } | null>(null);

  // Données pour la création de Salon de Classe
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [roomType, setRoomType] = useState<"subject_channel" | "announcement">("subject_channel");
  const [customRoomTitle, setCustomRoomTitle] = useState("");
  const [initialRoomMessage, setInitialRoomMessage] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Données pour Message Direct
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<"all" | "child_teachers" | "prof" | "admin" | "etudiant">(
    currentUser.role === "parent" ? "child_teachers" : "all"
  );
  const [startingDirectChat, setStartingDirectChat] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeEmojiPickerMessageId, setActiveEmojiPickerMessageId] = useState<string | null>(null);

  const QUICK_EMOJIS = ["👍", "❤️", "👏", "💡", "🙏", "😂"];

  // Fermer le sélecteur d'émojis au clic extérieur
  useEffect(() => {
    const handleClickOutside = () => setActiveEmojiPickerMessageId(null);
    if (activeEmojiPickerMessageId) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [activeEmojiPickerMessageId]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight + 500,
        behavior: smooth ? "smooth" : ("instant" as any),
      });
    }
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        });
      } catch (e) {}
    }
  };

  // Auto-défilement instantané vers le bas dès que la liste des messages s'allonge
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // ---------------------------------------------------------------------------
  // Pilier 4 : Debounce de 800ms sur l'émission de l'accusé de lecture
  // ---------------------------------------------------------------------------
  const scheduleReadReceipt = (conversationId: string) => {
    if (readDebounceTimer.current) clearTimeout(readDebounceTimer.current);

    readDebounceTimer.current = setTimeout(() => {
      const isStillViewing =
        activeConvIdRef.current === conversationId &&
        (mobileViewRef.current === "chat" || (typeof window !== "undefined" && window.innerWidth >= 768)) &&
        (typeof document === "undefined" || document.visibilityState === "visible");

      if (isStillViewing) {
        // A. Mise à jour atomique en base avec GREATEST(last_read_at, now())
        markConversationAsReadAction(conversationId).catch(() => {});

        // B. Diffusion éphémère sur le canal chat:{id} et sur le stream global persistant
        if (activeChatChannelRef.current) {
          try {
            activeChatChannelRef.current.send({
              type: "broadcast",
              event: "read_receipt",
              payload: { readerId: currentUser.id, conversationId },
            });
          } catch (e) {}
        }

        if (globalStreamChannelRef.current) {
          try {
            globalStreamChannelRef.current.send({
              type: "broadcast",
              event: "read_receipt",
              payload: { readerId: currentUser.id, conversationId },
            });
          } catch (e) {}
        }

        // C. Mettre à jour localement le compteur non-lu de cette conversation à 0
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
        );

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chat:read_state_changed"));
        }
      }
    }, 800);
  };

  // Annuler le debounce si l'utilisateur quitte le salon
  const cancelReadReceipt = () => {
    if (readDebounceTimer.current) {
      clearTimeout(readDebounceTimer.current);
      readDebounceTimer.current = null;
    }
  };

  // Synchronisation de la sélection initiale active avec lecture immédiate
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      const firstConv = conversations[0];
      setActiveConvId(firstConv.id);

      // Si sur Desktop ou si la vue mobile est sur 'chat', marquer immédiatement la conversation comme lue (0ms)
      if (typeof window !== "undefined" && (window.innerWidth >= 768 || mobileView === "chat")) {
        setConversations((prev) => {
          const updated = prev.map((c) => (c.id === firstConv.id ? { ...c, unread_count: 0 } : c));
          const totalUnread = updated.reduce((acc, c) => acc + (c.unread_count || 0), 0);
          window.dispatchEvent(
            new CustomEvent("chat:read_state_changed", { detail: { unreadCount: totalUnread } })
          );
          return updated;
        });
        markConversationAsReadAction(firstConv.id).catch(() => {});
      }
    }
  }, [conversations, activeConvId, mobileView]);

  // ---------------------------------------------------------------------------
  // Sélection d'une conversation : Synchronisation instantanée (Cache 0ms + Sync Réseau)
  // ---------------------------------------------------------------------------
  const handleSelectConversation = (convId: string) => {
    cancelReadReceipt();
    setActiveConvId(convId);
    setMobileView("chat");
    setHeaderMenuOpen(false);

    // 0. Réinitialiser IMMÉDIATEMENT le compteur non-lu de cette conversation à 0 (0ms)
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c));
      const totalUnread = updated.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat:read_state_changed", { detail: { unreadCount: totalUnread } })
        );
      }
      return updated;
    });

    // Envoi immédiat de l'accusé de lecture au serveur en tâche de fond
    markConversationAsReadAction(convId).catch(() => {});

    // 1. Afficher immédiatement les messages en cache s'ils existent (0ms)
    if (messagesCache.current[convId]) {
      setMessages(messagesCache.current[convId].data);
      setHasMoreMessages(messagesCache.current[convId].hasMore);
      setTimeout(() => scrollToBottom(false), 20);
    } else {
      setMessages([]);
      setHasMoreMessages(false);
    }

    // 2. Toujours déclencher immédiatement un rafraîchissement réseau frais en arrière-plan
    fetchConversationMessagesAction(convId, { limit: 20 }).then((res) => {
      if (res.success && res.data) {
        setMessages((prev) => {
          const currentConv = conversationsRef.current.find((c) => c.id === convId);
          const merged = res.data.map((d) => {
            const prevMsg = prev.find((p) => p.id === d.id);
            const resolvedSender =
              d.sender ||
              prevMsg?.sender ||
              (d.sender_id === currentUser.id
                ? currentUser
                : currentConv?.participants?.find((p) => p.id === d.sender_id) || null);

            return {
              ...d,
              sender: resolvedSender,
              status: mergeStatus(prevMsg?.status, d.status),
              is_seen: prevMsg?.is_seen || d.is_seen,
            };
          });

          // Préserver les messages locaux en cours d'envoi
          const pendingLocal = prev.filter(
            (p) => p.status === "sending" && !res.data.some((d) => d.id === p.id)
          );

          const finalMessages = [...merged, ...pendingLocal];
          messagesCache.current[convId] = {
            data: finalMessages.filter((m) => m.status !== "sending"),
            hasMore: res.hasMore,
          };
          return finalMessages;
        });
        setTimeout(() => scrollToBottom(false), 30);
      }
    });

    // Planifier l'accusé de lecture continu
    scheduleReadReceipt(convId);
  };

  // Synchronisation continue du cache mémoire avec l'état réel des messages
  useEffect(() => {
    if (!activeConvId || messages.length === 0) return;
    messagesCache.current[activeConvId] = {
      data: messages.filter((m) => m.status !== "sending"),
      hasMore: hasMoreMessages,
    };
  }, [messages, hasMoreMessages, activeConvId]);

  // Déclencher le debounce quand la vue mobile bascule sur 'chat' ou quand la fenêtre reprend le focus
  useEffect(() => {
    if (mobileView === "chat" && activeConvId) {
      scheduleReadReceipt(activeConvId);
    } else {
      cancelReadReceipt();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeConvIdRef.current) {
        scheduleReadReceipt(activeConvIdRef.current);
      } else {
        cancelReadReceipt();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelReadReceipt();
    };
  }, [mobileView, activeConvId]);

  // Données SWR pour la modale Nouveau Salon / Message Direct (Cachées et Dédupliquées)
  const { availableClasses, availableSubjects, isLoadingClasses } = useAvailableClassesAndSubjects(actionModalOpen);
  const { directoryUsers, isLoadingDirectory: loadingDirectory } = useUserDirectory(currentUser, actionModalOpen);

  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses, selectedClassId]);

  // Adapter les matières quand la classe change
  const subjectsForSelectedClass = availableSubjects.filter(
    (s) => s.class_id === selectedClassId
  );

  useEffect(() => {
    if (subjectsForSelectedClass.length > 0) {
      setSelectedSubjectId(subjectsForSelectedClass[0].id);
    } else {
      setSelectedSubjectId("");
    }
  }, [selectedClassId]);

  // ---------------------------------------------------------------------------
  // Pilier 2 : Canal Broadcast Global Unique & Persistant (global_chat_stream)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    const globalStreamChannel = supabase.channel("global_chat_stream");

    globalStreamChannel
      .on("broadcast", { event: "stream_msg" }, (payload) => {
        const incoming = payload.payload?.message as ChatMessage;
        if (!incoming || incoming.sender_id === currentUser.id) return;

        const isViewingThisChat =
          activeConvIdRef.current === incoming.conversation_id &&
          (mobileViewRef.current === "chat" || (typeof window !== "undefined" && window.innerWidth >= 768)) &&
          (typeof document === "undefined" || document.visibilityState === "visible");

        // Problème E : Émettre un accusé de distribution réel 'delivered_receipt' vers l'expéditeur
        if (globalStreamChannelRef.current) {
          try {
            globalStreamChannelRef.current.send({
              type: "broadcast",
              event: "delivered_receipt",
              payload: { messageId: incoming.id, conversationId: incoming.conversation_id, recipientId: currentUser.id },
            });
          } catch (e) {}
        }

        // A. Mettre à jour systématiquement le cache mémoire de la conversation
        if (!messagesCache.current[incoming.conversation_id]) {
          messagesCache.current[incoming.conversation_id] = {
            data: [incoming],
            hasMore: false,
          };
        } else {
          const currentData = messagesCache.current[incoming.conversation_id].data;
          if (!currentData.some((m) => m.id === incoming.id)) {
            messagesCache.current[incoming.conversation_id] = {
              ...messagesCache.current[incoming.conversation_id],
              data: [...currentData, incoming],
            };
          }
        }

        // B. Si cette conversation est la discussion active, mettre à jour l'écran immédiatement
        if (activeConvIdRef.current === incoming.conversation_id) {
          setMessages((prev) => {
            const existsIndex = prev.findIndex((m) => m.id === incoming.id);
            const prevMsg = existsIndex >= 0 ? prev[existsIndex] : null;

            const resolvedSender =
              incoming.sender ||
              prevMsg?.sender ||
              (incoming.sender_id === currentUser.id
                ? currentUser
                : conversationsRef.current
                    .find((c) => c.id === incoming.conversation_id)
                    ?.participants?.find((p) => p.id === incoming.sender_id) || null);

            const mergedMsg: ChatMessage = {
              ...(prevMsg || {}),
              ...incoming,
              sender: resolvedSender,
              status: mergeStatus(prevMsg?.status, incoming.status || "delivered"),
              is_seen: prevMsg?.is_seen || incoming.is_seen,
            };

            if (existsIndex >= 0) {
              const updated = [...prev];
              updated[existsIndex] = mergedMsg;
              return updated;
            }
            return [...prev, mergedMsg];
          });
          setTimeout(() => scrollToBottom(true), 30);

          if (isViewingThisChat) {
            scheduleReadReceipt(incoming.conversation_id);
          }
        }

        // B. Mettre à jour la barre latérale en direct (0ms) avec préservation de l'ordre
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === incoming.conversation_id);
          if (!exists) {
            fetchUserConversationsAction().then((r) => {
              if (r.success && r.data) setConversations(r.data);
            });
            return prev;
          }

          const updated = prev.map((c) => {
            if (c.id === incoming.conversation_id) {
              return {
                ...c,
                last_message: incoming,
                updated_at: new Date().toISOString(),
                unread_count: isViewingThisChat ? 0 : (c.unread_count || 0) + 1,
              };
            }
            return c;
          });

          return updated.sort((a, b) => {
            const timeA = new Date(a.last_message?.created_at || a.updated_at).getTime();
            const timeB = new Date(b.last_message?.created_at || b.updated_at).getTime();
            return timeB - timeA;
          });
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chat:read_state_changed"));
        }
      })
      .on("broadcast", { event: "read_receipt" }, (payload) => {
        if (payload.payload?.readerId !== currentUser.id) {
          const targetConv = payload.payload?.conversationId;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.sender_id === currentUser.id && (!targetConv || m.conversation_id === targetConv)) {
                return { ...m, is_seen: true, status: "read" };
              }
              return m;
            })
          );
        }
      })
      .on("broadcast", { event: "delivered_receipt" }, (payload) => {
        const msgId = payload.payload?.messageId;
        if (msgId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, status: mergeStatus(m.status, "delivered") } : m))
          );
        }
      })
      .on("broadcast", { event: "message_retracted" }, (payload) => {
        const retractedId = payload.payload?.messageId;
        if (retractedId) {
          setMessages((prev) => prev.filter((m) => m.id !== retractedId));
        }
      })
      .on("broadcast", { event: "message_deleted" }, (payload) => {
        const delId = payload.payload?.messageId;
        if (delId) {
          setMessages((prev) => prev.filter((m) => m.id !== delId));
        }
      })
      .on("broadcast", { event: "conversation_deleted" }, (payload) => {
        const convId = payload.payload?.conversationId;
        if (convId) {
          setConversations((prev) => {
            const filtered = prev.filter((c) => c.id !== convId);
            if (activeConvIdRef.current === convId) {
              setActiveConvId(filtered.length > 0 ? filtered[0].id : "");
            }
            return filtered;
          });
        }
      })
      .on("broadcast", { event: "reaction_toggled" }, (payload) => {
        const { messageId, conversationId, reactions } = payload.payload || {};
        if (conversationId === activeConvIdRef.current && messageId && Array.isArray(reactions)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reactions: reactions.map((r: any) => ({
                      ...r,
                      has_reacted: r.user_ids?.includes(currentUser.id),
                    })),
                  }
                : m
            )
          );
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          globalStreamChannelRef.current = globalStreamChannel;
        }
      });

    return () => {
      globalStreamChannelRef.current = null;
      supabase.removeChannel(globalStreamChannel);
    };
  }, [currentUser.id]);

  // ---------------------------------------------------------------------------
  // Pilier 2 : Canal Dédié par Conversation (chat:{id}) & Postgres Changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeConvId) return;

    let isMounted = true;
    const hasCache = !!messagesCache.current[activeConvId];

    // Chargement initial lors du changement de salon
    const loadInitialMessages = async () => {
      if (!hasCache) setLoadingMessages(true);
      try {
        const res = await fetchConversationMessagesAction(activeConvId, { limit: 20 });
        if (isMounted && res.success) {
          setMessages((prev) => {
            const currentConv = conversationsRef.current.find((c) => c.id === activeConvId);
            const merged = res.data.map((d) => {
              const prevMsg = prev.find((p) => p.id === d.id);
              const resolvedSender =
                d.sender ||
                prevMsg?.sender ||
                (d.sender_id === currentUser.id
                  ? currentUser
                  : currentConv?.participants?.find((p) => p.id === d.sender_id) || null);

              return {
                ...d,
                sender: resolvedSender,
                status: mergeStatus(prevMsg?.status, d.status),
                is_seen: prevMsg?.is_seen || d.is_seen,
              };
            });

            // Conserver les messages locaux en cours d'envoi
            const pendingLocal = prev.filter(
              (p) => p.status === "sending" && !res.data.some((d) => d.id === p.id)
            );

            return [...merged, ...pendingLocal];
          });

          setHasMoreMessages(res.hasMore);

          messagesCache.current[activeConvId] = {
            data: res.data,
            hasMore: res.hasMore,
          };

          setTimeout(() => scrollToBottom(false), 60);
        }
      } catch (err) {
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadInitialMessages();

    const supabase = createClient();

    // 1. Canal Dédié Éphémère : chat:{conversation_id}
    const dedicatedChatChannel = supabase.channel(`chat:${activeConvId}`);

    dedicatedChatChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload;
        if (p && p.userId !== currentUser.id) {
          setTypingUser(p.userName || "Quelqu'un");
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser(null);
          }, 3000);
        }
      })
      .on("broadcast", { event: "read_receipt" }, (payload) => {
        if (payload.payload?.readerId !== currentUser.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id === currentUser.id ? { ...m, is_seen: true, status: "read" } : m
            )
          );
        }
      })
      .on("broadcast", { event: "delivered_receipt" }, (payload) => {
        const msgId = payload.payload?.messageId;
        if (msgId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, status: mergeStatus(m.status, "delivered") } : m))
          );
        }
      })
      .on("broadcast", { event: "message_retracted" }, (payload) => {
        const retractedId = payload.payload?.messageId;
        if (retractedId) {
          setMessages((prev) => prev.filter((m) => m.id !== retractedId));
        }
      })
      .on("broadcast", { event: "message_deleted" }, (payload) => {
        const delId = payload.payload?.messageId;
        if (delId) {
          setMessages((prev) => prev.filter((m) => m.id !== delId));
        }
      })
      .subscribe();

    activeChatChannelRef.current = dedicatedChatChannel;

    // 2. Canal de Persistance : Postgres Changes sur chat_messages
    const postgresChangesChannel = supabase
      .channel(`db_chat_${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const newRow = payload.new as ChatMessage;
          if (!newRow) return;

          const isFromMe = newRow.sender_id === currentUser.id;

          // Problème E : Si le message vient de quelqu'un d'autre, émettre delivered_receipt
          if (!isFromMe && activeChatChannelRef.current) {
            try {
              activeChatChannelRef.current.send({
                type: "broadcast",
                event: "delivered_receipt",
                payload: { messageId: newRow.id, conversationId: activeConvId, recipientId: currentUser.id },
              });
            } catch (e) {}
          }

          setMessages((prev) => {
            const existsIndex = prev.findIndex((m) => m.id === newRow.id);
            const prevMsg = existsIndex >= 0 ? prev[existsIndex] : null;

            const currentConv = conversationsRef.current.find((c) => c.id === activeConvId);
            const resolvedSender =
              prevMsg?.sender ||
              (isFromMe
                ? currentUser
                : currentConv?.participants?.find((p) => p.id === newRow.sender_id) || null);

            // Problème E : L'insert serveur équivaut à 'sent' pour l'expéditeur, 'delivered' pour le destinataire
            const initialStatus: MessageDeliveryStatus = isFromMe ? "sent" : "delivered";

            const mergedMsg: ChatMessage = {
              ...(prevMsg || {}),
              ...newRow,
              sender: resolvedSender,
              status: mergeStatus(prevMsg?.status, initialStatus),
            };

            if (existsIndex >= 0) {
              const updated = [...prev];
              updated[existsIndex] = mergedMsg;
              return updated;
            }
            return [...prev, mergedMsg];
          });
          setTimeout(() => scrollToBottom(true), 30);

          if (!isFromMe) {
            scheduleReadReceipt(activeConvId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      cancelReadReceipt();
      activeChatChannelRef.current = null;
      supabase.removeChannel(dedicatedChatChannel);
      supabase.removeChannel(postgresChangesChannel);
    };
  }, [activeConvId]);

  // Émettre l'événement "typing" lors de la saisie sur le canal dédié chat:{id}
  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (!activeConvId || !activeChatChannelRef.current) return;

    const now = Date.now();
    if (now - lastTypingBroadcast.current > 2000) {
      lastTypingBroadcast.current = now;
      try {
        activeChatChannelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: {
            userId: currentUser.id,
            userName: `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || "Un membre",
          },
        });
      } catch (err) {}
    }
  };

  // Charger les messages plus anciens (Pagination vers le haut façon Instagram)
  const handleLoadOlderMessages = async () => {
    if (loadingOlderMessages || !hasMoreMessages || messages.length === 0 || !activeConvId) return;

    setLoadingOlderMessages(true);
    try {
      const oldestDate = messages[0].created_at;
      const res = await fetchConversationMessagesAction(activeConvId, {
        limit: 20,
        before: oldestDate,
      });

      if (res.success && res.data.length > 0) {
        setMessages((prev) => {
          const currentConv = conversationsRef.current.find((c) => c.id === activeConvId);
          const merged = res.data.map((d) => {
            const prevMsg = prev.find((p) => p.id === d.id);
            const resolvedSender =
              d.sender ||
              prevMsg?.sender ||
              (d.sender_id === currentUser.id
                ? currentUser
                : currentConv?.participants?.find((p) => p.id === d.sender_id) || null);

            return {
              ...d,
              sender: resolvedSender,
              status: mergeStatus(prevMsg?.status, d.status),
              is_seen: prevMsg?.is_seen || d.is_seen,
            };
          });
          const existingNotReturned = prev.filter((p) => !res.data.some((d) => d.id === p.id));
          return [...merged, ...existingNotReturned];
        });

        setHasMoreMessages(res.hasMore);

        if (messagesCache.current[activeConvId]) {
          messagesCache.current[activeConvId] = {
            data: [...res.data, ...messagesCache.current[activeConvId].data],
            hasMore: res.hasMore,
          };
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Problème F : Zéro polling permanent — Uniquement écoute de reconnexion réseau
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleOnlineRecovery = () => {
      fetchUserConversationsAction().then((res) => {
        if (res.success && res.data) setConversations(res.data);
      });
      if (activeConvIdRef.current) {
        fetchConversationMessagesAction(activeConvIdRef.current).then((res) => {
          if (res.success && res.data) setMessages(res.data);
        });
      }
    };

    window.addEventListener("online", handleOnlineRecovery);
    return () => window.removeEventListener("online", handleOnlineRecovery);
  }, []);

  // Gestion du fichier joint avec compression automatique
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        // Compression automatique des photos de smartphones (> 5Mo -> ~300Ko)
        file = await compressImageFile(file);
        setAttachmentPreview(URL.createObjectURL(file));
      } else {
        setAttachmentPreview(null);
      }
      setAttachmentFile(file);
    }
  };

  const handleCameraCapture = async (file: File) => {
    const compressed = await compressImageFile(file);
    setAttachmentFile(compressed);
    setAttachmentPreview(URL.createObjectURL(compressed));
  };

  // ---------------------------------------------------------------------------
  // Pilier 1 : Envoi de message avec ID STABLE + Problème B & C réglés
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = sanitizeInputText(messageText);
    const fileToSend = attachmentFile;
    const previewToSend = attachmentPreview;

    if ((!textToSend && !fileToSend) || !activeConvId) return;

    // SÉCURITÉ & MODÉRATION : Bloquer les insultes, menaces et vulgarités
    if (textToSend) {
      const compliance = checkMessageCompliance(textToSend);
      if (!compliance.isAllowed) {
        setModerationAlert({
          message: compliance.reason || "Votre message contient des propos non autorisés.",
          label: compliance.matchedLabel,
        });
        return;
      }
    }

    setSendingMessage(true);

    // 1. Génération de l'ID DÉFINITIF côté client
    const stableMessageId = crypto.randomUUID();

    // Optimistic local msg (avec preview local pour l'expéditeur uniquement)
    const optimisticMsg: ChatMessage = {
      id: stableMessageId,
      conversation_id: activeConvId,
      sender_id: currentUser.id,
      content: textToSend || (fileToSend ? "📎 Pièce jointe partagée" : ""),
      attachment_url: previewToSend || (fileToSend ? URL.createObjectURL(fileToSend) : undefined),
      attachment_name: fileToSend?.name ? sanitizeInputText(fileToSend.name, 100) : undefined,
      created_at: new Date().toISOString(),
      sender: currentUser,
      is_seen: false,
      status: "sending",
    };

    // 2. Affichage optimiste synchrone et instantané (0ms)
    setMessages((prev) => {
      if (prev.some((m) => m.id === stableMessageId)) return prev;
      return [...prev, optimisticMsg];
    });
    setMessageText("");
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setTimeout(() => scrollToBottom(true), 10);

    // 3. Mise à jour immédiate de la liste des conversations locale
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              last_message: optimisticMsg,
              updated_at: new Date().toISOString(),
            }
          : c
      );
      return updated.sort((a, b) => {
        const timeA = new Date(a.last_message?.created_at || a.updated_at).getTime();
        const timeB = new Date(b.last_message?.created_at || b.updated_at).getTime();
        return timeB - timeA;
      });
    });

    // 4. Si message texte pur : diffusion P2P instantanée via le canal persistant (sans URL blob)
    if (!fileToSend && globalStreamChannelRef.current) {
      try {
        globalStreamChannelRef.current.send({
          type: "broadcast",
          event: "stream_msg",
          payload: {
            message: {
              ...optimisticMsg,
              attachment_url: undefined,
            },
          },
        });
      } catch (e) {}
    }

    // 5. Persistance en base de données via Server Action avec l'ID définitif
    try {
      let attachmentUrl = "";
      let attachmentName = "";

      if (fileToSend) {
        setUploadingAttachment(true);
        const formData = new FormData();
        formData.append("file", fileToSend);
        formData.append("folder", "chat");
        formData.append("assignmentId", activeConvId);

        const uploadRes = await fetch("/api/assignments/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          alert(uploadData.error || "Erreur lors de l'envoi du fichier.");
          // Problème B : Rétracter le message
          setMessages((prev) => prev.filter((m) => m.id !== stableMessageId));
          setUploadingAttachment(false);
          return;
        }

        attachmentUrl = uploadData.fileUrl;
        attachmentName = uploadData.fileName;
        setUploadingAttachment(false);

        // Problème C : Diffuser au destinataire avec la VRAIE URL de cloud storage via le canal persistant
        if (globalStreamChannelRef.current) {
          try {
            globalStreamChannelRef.current.send({
              type: "broadcast",
              event: "stream_msg",
              payload: {
                message: {
                  ...optimisticMsg,
                  attachment_url: attachmentUrl,
                  attachment_name: attachmentName,
                },
              },
            });
          } catch (e) {}
        }
      }

      const res = await sendMessageAction({
        id: stableMessageId,
        conversationId: activeConvId,
        content: textToSend,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
      });

      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === stableMessageId) {
              return {
                ...m,
                sender: currentUser,
                attachment_url: attachmentUrl || m.attachment_url,
                attachment_name: attachmentName || m.attachment_name,
                status: mergeStatus(m.status, "sent"),
              };
            }
            return m;
          })
        );
      } else {
        console.error("Erreur sendMessageAction:", res.error);
        alert(res.error || "Erreur lors de l'envoi du message.");
        // Problème B : Informer les autres clients que le message a échoué
        setMessages((prev) => prev.filter((m) => m.id !== stableMessageId));
        if (globalStreamChannelRef.current) {
          try {
            globalStreamChannelRef.current.send({
              type: "broadcast",
              event: "message_retracted",
              payload: { messageId: stableMessageId, conversationId: activeConvId },
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Envoi échoué:", err);
      setMessages((prev) => prev.filter((m) => m.id !== stableMessageId));
      // Problème B : Rétraction
      if (globalStreamChannelRef.current) {
        try {
          globalStreamChannelRef.current.send({
            type: "broadcast",
            event: "message_retracted",
            payload: { messageId: stableMessageId, conversationId: activeConvId },
          });
        } catch (e) {}
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Supprimer un message façon Instagram (Unsend pour tout le monde)
  // ---------------------------------------------------------------------------
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    const targetMsg = messageToDelete;
    setDeletingMessage(true);

    // 1. Optimistic removal local (0ms)
    setMessages((prev) => prev.filter((m) => m.id !== targetMsg.id));
    setMessageToDelete(null);

    // 2. Diffusion Realtime vers tous les clients
    if (globalStreamChannelRef.current) {
      try {
        globalStreamChannelRef.current.send({
          type: "broadcast",
          event: "message_deleted",
          payload: { messageId: targetMsg.id, conversationId: targetMsg.conversation_id },
        });
      } catch (e) {}
    }
    if (activeChatChannelRef.current) {
      try {
        activeChatChannelRef.current.send({
          type: "broadcast",
          event: "message_deleted",
          payload: { messageId: targetMsg.id, conversationId: targetMsg.conversation_id },
        });
      } catch (e) {}
    }

    // 3. Persistance SQL
    try {
      const res = await deleteMessageAction(targetMsg.id);
      if (!res.success) {
        alert(res.error || "Impossible de supprimer ce message.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingMessage(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Supprimer une conversation / salon façon Instagram
  // ---------------------------------------------------------------------------
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    const targetConv = conversationToDelete;
    setDeletingConversation(true);

    // 1. Optimistic removal
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== targetConv.id);
      if (activeConvId === targetConv.id) {
        setActiveConvId(remaining.length > 0 ? remaining[0].id : "");
      }
      return remaining;
    });
    setConversationToDelete(null);
    setHeaderMenuOpen(false);

    // 2. Realtime broadcast
    if (globalStreamChannelRef.current) {
      try {
        globalStreamChannelRef.current.send({
          type: "broadcast",
          event: "conversation_deleted",
          payload: { conversationId: targetConv.id },
        });
      } catch (e) {}
    }

    // 3. Persistance SQL
    try {
      const res = await deleteConversationAction(targetConv.id);
      if (!res.success) {
        alert(res.error || "Impossible de supprimer cette discussion.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingConversation(false);
    }
  };

  // 1. Créer un salon de classe
  const handleCreateClassRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || creatingRoom) return;

    setCreatingRoom(true);
    try {
      const selectedClassObj = availableClasses.find((c) => c.id === selectedClassId);
      const selectedSubjectObj = availableSubjects.find((s) => s.id === selectedSubjectId);

      let title = customRoomTitle.trim();
      if (!title) {
        if (roomType === "announcement") {
          title = `📢 Annonces — ${selectedClassObj?.name || "Classe"}`;
        } else {
          title = `📚 Salon ${selectedSubjectObj?.name || "Matière"} — ${selectedClassObj?.name || "Classe"}`;
        }
      }

      const res = await createClassConversationAction({
        type: roomType,
        title,
        classId: selectedClassId,
        subjectId: roomType === "subject_channel" ? selectedSubjectId : undefined,
        initialMessage: initialRoomMessage.trim(),
      });

      if (res.success && res.data) {
        setConversations((prev) => [res.data as any, ...prev.filter((c) => c.id !== res.data?.id)]);
        setActiveConvId(res.data.id);
        setMobileView("chat");
        setActionModalOpen(false);
        setCustomRoomTitle("");
        setInitialRoomMessage("");
        refreshConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingRoom(false);
    }
  };

  // 2. Démarrer une discussion privée directe 1-à-1 avec redirection immédiate si elle existe déjà
  const handleStartDirectChat = async (targetUserId: string) => {
    // 1. Chercher si la conversation existe déjà localement dans les conversations actives
    const existingConv = conversations.find(
      (c) =>
        c.type === "direct" &&
        c.participants &&
        c.participants.some((p) => p.id === targetUserId)
    );

    if (existingConv) {
      // Redirection instantanée 0ms !
      setActiveConvId(existingConv.id);
      setMobileView("chat");
      setActionModalOpen(false);
      return;
    }

    // 2. Affichage de l'état de chargement et création serveur
    setStartingDirectChat(targetUserId);
    try {
      const res = await getOrCreateDirectConversationAction(targetUserId);
      if (res.success && res.data) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === res.data?.id)) return prev;
          return [res.data as any, ...prev];
        });
        setActiveConvId(res.data.id);
        setMobileView("chat");
        setActionModalOpen(false);
        refreshConversations();
      }
    } catch (err) {
      console.error("handleStartDirectChat error:", err);
    } finally {
      setStartingDirectChat(null);
    }
  };

  // 3. Ajouter ou retirer une réaction Emoji (Like / Toggle 0ms)
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveEmojiPickerMessageId(null);

    // Mise à jour optimiste locale instantanée (0ms)
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions = m.reactions || [];
        const existingReaction = currentReactions.find((r) => r.emoji === emoji);

        let newReactions = [...currentReactions];
        if (existingReaction) {
          if (existingReaction.has_reacted) {
            // Retirer
            if (existingReaction.count <= 1) {
              newReactions = newReactions.filter((r) => r.emoji !== emoji);
            } else {
              newReactions = newReactions.map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count - 1,
                      has_reacted: false,
                      user_ids: r.user_ids.filter((id) => id !== currentUser.id),
                    }
                  : r
              );
            }
          } else {
            // Ajouter
            newReactions = newReactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    has_reacted: true,
                    user_ids: [...r.user_ids, currentUser.id],
                  }
                : r
            );
          }
        } else {
          // Nouveau
          newReactions.push({
            emoji,
            count: 1,
            has_reacted: true,
            user_ids: [currentUser.id],
          });
        }

        return { ...m, reactions: newReactions };
      })
    );

    try {
      const res = await toggleMessageReactionAction(messageId, emoji);
      if (res.success && res.data) {
        if (globalStreamChannelRef.current) {
          try {
            globalStreamChannelRef.current.send({
              type: "broadcast",
              event: "reaction_toggled",
              payload: {
                messageId,
                conversationId: activeConvId,
                reactions: res.data,
              },
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("handleToggleReaction error:", err);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "prof":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-turquoise/15 text-teal-dark border border-turquoise/20">Enseignant 🎓</span>;
      case "admin":
      case "super_admin":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange/15 text-orange-dark border border-orange/20">Direction 🛡️</span>;
      case "parent":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Parent 👨‍👩‍👧</span>;
      case "etudiant":
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy/5 text-navy/60">Élève 🎒</span>;
    }
  };

  const formatConversationTitle = (c: ChatConversation) => {
    if (c.type === "direct" && c.participants && c.participants.length > 0) {
      const other = c.participants.find((p) => p.id !== currentUser.id);
      if (other) {
        const roleLabel =
          other.role === "prof"
            ? "Professeur"
            : other.role === "admin" || other.role === "super_admin"
            ? "Direction"
            : other.role === "parent"
            ? "Parent"
            : "Élève";
        return `✉️ ${other.first_name || ""} ${other.last_name || ""} (${roleLabel})`;
      }
    }
    return c.title;
  };

  const getConvIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="w-4 h-4 text-orange" />;
      case "teachers_team":
        return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case "subject_channel":
        return <BookOpen className="w-4 h-4 text-turquoise" />;
      case "direct":
      default:
        return <User className="w-4 h-4 text-purple-600" />;
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (categoryFilter !== "all") {
      if (categoryFilter === "teachers_team") {
        if (c.channel_scope !== "teachers_team" && c.type !== "teachers_team") return false;
      } else if (c.type !== categoryFilter) {
        return false;
      }
    }
    if (searchQuery && !c.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredDirectory = directoryUsers.filter((u: any) => {
    if (directoryRoleFilter === "child_teachers") {
      if (!u.is_child_teacher) return false;
    } else if (directoryRoleFilter === "admin") {
      if (u.role !== "admin" && u.role !== "super_admin") return false;
    } else if (directoryRoleFilter !== "all" && u.role !== directoryRoleFilter) {
      return false;
    }

    if (
      directorySearch &&
      !u.first_name?.toLowerCase().includes(directorySearch.toLowerCase()) &&
      !u.last_name?.toLowerCase().includes(directorySearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const canDeleteActiveConv =
    activeConversation &&
    (activeConversation.type === "direct" ||
      activeConversation.created_by === currentUser.id ||
      currentUser.role === "prof" ||
      currentUser.role === "admin" ||
      currentUser.role === "super_admin");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête Page : masqué sur mobile quand on est dans un salon actif pour libérer 100% de la hauteur */}
      <div
        className={`items-start sm:items-center justify-between gap-4 pb-2 border-b border-navy/5 ${
          mobileView === "chat" ? "hidden md:flex" : "flex flex-col sm:flex-row"
        }`}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark font-black text-[11px] uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            Échanges Pédagogiques &amp; Directs
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Messagerie &amp; Salons
          </h1>
          <p className="text-xs sm:text-sm text-navy/60">
            Échangez en direct avec vos professeurs, vos collègues ou vos camarades de classe.
          </p>
        </div>

        {/* Bouton Nouveau Salon / Discussion (Direction & Profs uniquement pour les salons, tous pour Message Direct) */}
        <button
          onClick={() => setActionModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-teal-dark to-turquoise text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {currentUser.role === "parent" || currentUser.role === "etudiant"
              ? "Nouveau Message Direct"
              : "Nouvelle Discussion / Salon"}
          </span>
        </button>
      </div>

      {/* Interface Principale Chat */}
      <div
        className={`bg-white rounded-2xl sm:rounded-3xl border border-navy/10 shadow-sm overflow-hidden flex flex-col md:grid md:grid-cols-12 ${
          mobileView === "chat"
            ? "h-[calc(100dvh-140px)] md:h-[calc(100vh-210px)]"
            : "h-[calc(100dvh-190px)] md:h-[calc(100vh-210px)]"
        } min-h-[420px] max-h-[920px]`}
      >
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE : Liste des conversations                                 */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:col-span-5 lg:col-span-4 border-r border-navy/5 flex-col h-full overflow-hidden bg-blue-vlight/20 ${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Recherche */}
          <div className="p-3 sm:p-4 border-b border-navy/5 space-y-2.5 bg-white/60 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un salon ou contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-navy/10 rounded-2xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-turquoise outline-none shadow-2xs"
              />
            </div>

            {/* Filtres de catégorie */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-navy text-white shadow-2xs"
                    : "bg-white text-navy/60 hover:bg-white/80 border border-navy/5"
                }`}
              >
                Tous ({conversations.length})
              </button>
              <button
                onClick={() => setCategoryFilter("direct")}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  categoryFilter === "direct"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-white text-navy/60 hover:bg-white/80 border border-navy/5"
                }`}
              >
                <User className="w-3 h-3" />
                Privé
              </button>
              {currentUser.role !== "parent" && (
                <button
                  onClick={() => setCategoryFilter("subject_channel")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    categoryFilter === "subject_channel"
                      ? "bg-turquoise text-white shadow-2xs"
                      : "bg-white text-navy/60 hover:bg-white/80 border border-navy/5"
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  Matières
                </button>
              )}
              {(currentUser.role === "prof" || currentUser.role === "admin" || currentUser.role === "super_admin") && (
                <button
                  onClick={() => setCategoryFilter("teachers_team")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    categoryFilter === "teachers_team"
                      ? "bg-purple-700 text-white shadow-2xs"
                      : "bg-white text-navy/60 hover:bg-white/80 border border-navy/5"
                  }`}
                >
                  <GraduationCap className="w-3 h-3" />
                  Équipes Profs
                </button>
              )}
              <button
                onClick={() => setCategoryFilter("announcement")}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  categoryFilter === "announcement"
                    ? "bg-orange text-white shadow-2xs"
                    : "bg-white text-navy/60 hover:bg-white/80 border border-navy/5"
                }`}
              >
                <Megaphone className="w-3 h-3" />
                Annonces
              </button>
            </div>
          </div>

          {/* Liste Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-navy/5 overscroll-contain">
            {loadingConversations ? (
              <div className="p-8 text-center text-navy/50 space-y-3 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-turquoise" />
                <p className="text-xs font-bold text-navy/70">Chargement de vos discussions...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-navy/40 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-turquoise/10 text-turquoise flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="font-bold text-navy text-sm">Aucune discussion pour le moment</div>
                <p className="text-xs text-navy/60 max-w-xs mx-auto">
                  Démarrez un échange direct avec un professeur, un élève ou l&apos;administration.
                </p>
                <button
                  onClick={() => setActionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-dark to-turquoise text-white text-xs font-black shadow-sm hover:shadow-md transition-all cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Démarrer une discussion</span>
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConvId;
                const hasUnread = Boolean(c.unread_count && c.unread_count > 0);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`p-3.5 sm:p-4 transition-all cursor-pointer flex items-start gap-3 hover:bg-white/80 active:scale-[0.99] select-none group relative ${
                      isActive ? "bg-white border-l-4 border-l-turquoise shadow-2xs" : ""
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isActive
                          ? "bg-turquoise/20 text-teal-dark font-black"
                          : "bg-white text-navy/60 border border-navy/5"
                      }`}
                    >
                      {getConvIcon(c.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs truncate ${
                            isActive
                              ? "font-black text-navy"
                              : hasUnread
                              ? "font-black text-navy"
                              : "font-bold text-navy/80"
                          }`}
                        >
                          {formatConversationTitle(c) || "Discussion"}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.last_message && (
                            <span className="text-[10px] text-navy/40 font-medium">
                              {formatMessageTime(c.last_message.created_at)}
                            </span>
                          )}
                          {hasUnread && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      <p
                        className={`text-[11px] truncate ${
                          hasUnread ? "font-bold text-navy" : "text-navy/50"
                        }`}
                      >
                        {c.last_message
                          ? `${
                              c.last_message.sender?.first_name ||
                              (c.last_message.sender_id === currentUser.id ? "Moi" : "Membre")
                            } : ${c.last_message.content}`
                          : "Aucun message pour le moment"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLONNE 2/2 : ZONE DE TCHAT ACTIVE (MESSAGES + ENVOI) */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:col-span-7 lg:col-span-8 flex flex-col h-full bg-[#f8fafc] overflow-hidden ${
            mobileView === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* En-tête de la discussion avec bouton Retour Mobile & Options */}
              <div className="p-3 sm:p-4 border-b border-navy/5 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-xs shrink-0 z-20 relative">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => {
                      cancelReadReceipt();
                      setMobileView("list");
                    }}
                    className="md:hidden p-2 -ml-1 rounded-xl text-navy/70 hover:text-navy hover:bg-navy/5 cursor-pointer shrink-0"
                    title="Retour aux salons"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-dark flex items-center justify-center font-black shadow-2xs border border-turquoise/20 shrink-0">
                    {getConvIcon(activeConversation.type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-navy flex items-center gap-1.5 truncate">
                      <span className="truncate">{formatConversationTitle(activeConversation)}</span>
                      {activeConversation.type === "announcement" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-orange/15 text-orange-dark shrink-0">
                          Officiel
                        </span>
                      )}
                      {activeConversation.type === "direct" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 shrink-0">
                          Privé
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-navy/50 truncate">
                      {activeConversation.class?.name
                        ? `Classe : ${activeConversation.class.name}`
                        : activeConversation.type === "direct"
                        ? "Discussion privée 1-à-1 sécurisée"
                        : "Espace d'échange Mon École en Live"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-[10px] sm:text-[11px] text-navy/40 font-bold hidden sm:flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>En direct</span>
                  </div>

                  {/* Menu Options façon Instagram */}
                  <div className="relative">
                    <button
                      onClick={() => setHeaderMenuOpen((prev) => !prev)}
                      className="p-2 rounded-xl text-navy/40 hover:text-navy hover:bg-navy/5 cursor-pointer transition-colors"
                      title="Options de la discussion"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {headerMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-navy/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                        {canDeleteActiveConv ? (
                          <button
                            onClick={() => {
                              setHeaderMenuOpen(false);
                              setConversationToDelete(activeConversation);
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>
                              {activeConversation.type === "direct"
                                ? "Supprimer cette discussion"
                                : "Supprimer ce salon"}
                            </span>
                          </button>
                        ) : (
                          <div className="px-4 py-2 text-[11px] text-navy/40 font-medium">
                            Discussion sécurisée &amp; surveillée
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Conteneur de messages avec scroll ultra-optimisé */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 overscroll-contain"
              >
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-turquoise" />
                    <p className="text-xs font-bold text-navy/50">Chargement des messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-navy text-sm">Démarrez la conversation !</div>
                    <p className="text-xs text-navy/60 max-w-xs">
                      Envoyez votre premier message ou une question ci-dessous.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser.id;
                    const canDelete =
                      isMe ||
                      currentUser.role === "admin" ||
                      currentUser.role === "super_admin" ||
                      currentUser.role === "prof";

                    // Résolution robuste du profil de l'expéditeur
                    const senderProfile = isMe
                      ? currentUser
                      : msg.sender || activeConversation?.participants?.find((p) => p.id === msg.sender_id);

                    const senderName = senderProfile
                      ? `${senderProfile.first_name || ""} ${senderProfile.last_name || ""}`.trim() || (isMe ? "Moi" : "Membre")
                      : isMe ? "Moi" : "Membre";

                    const senderRole = senderProfile?.role || (isMe ? currentUser.role : "etudiant");

                    const senderInitials = senderProfile?.first_name
                      ? `${senderProfile.first_name[0] || ""}${senderProfile.last_name?.[0] || ""}`.toUpperCase()
                      : isMe
                      ? `${currentUser.first_name?.[0] || "M"}${currentUser.last_name?.[0] || ""}`.toUpperCase()
                      : senderName.slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={msg.id}
                        className={`group relative flex items-start gap-2.5 max-w-[92%] sm:max-w-[78%] ${
                          isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl shrink-0 flex items-center justify-center text-xs font-black text-white shadow-2xs ${
                            isMe
                              ? "bg-gradient-to-br from-turquoise to-teal-dark"
                              : senderRole === "prof"
                              ? "bg-gradient-to-br from-orange to-amber-600"
                              : senderRole === "admin" || senderRole === "super_admin"
                              ? "bg-purple-600"
                              : senderRole === "parent"
                              ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                              : "bg-navy/70"
                          }`}
                        >
                          {senderInitials}
                        </div>

                        {/* Bulle de message & Action Supprimer façon Instagram */}
                        <div className={`space-y-1 min-w-0 ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                          <div className={`flex items-center gap-1.5 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                            <span className="text-[11px] font-black text-navy">{senderName}</span>
                            {getRoleBadge(senderRole)}
                          </div>

                          <div className={`relative group/bubble flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {/* Bulle de message */}
                            <div
                              className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs text-left ${
                                isMe
                                  ? "bg-teal-dark text-white rounded-tr-xs"
                                  : "bg-white text-navy border border-navy/5 rounded-tl-xs shadow-xs"
                              }`}
                            >
                              <div className="whitespace-pre-wrap break-words">
                                {parseMessageLinks(msg.content).map((token, idx) => {
                                  if (token.type === "link" && token.url) {
                                    const isMediaUrl = /\.(jpe?g|png|webp|gif|svg|mp4|webm|mov|pdf)(\?.*)?$/i.test(token.url);
                                    return (
                                      <a
                                        key={idx}
                                        href={token.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 break-all transition-colors cursor-pointer ${
                                          isMe
                                            ? "text-cyan-200 hover:text-white"
                                            : "text-teal-dark hover:text-turquoise"
                                        }`}
                                        onClick={(e) => {
                                          if (isMediaUrl) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const isImg = /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(token.url!);
                                            const isVid = /\.(mp4|webm|mov)(\?.*)?$/i.test(token.url!);
                                            const isDoc = /\.pdf(\?.*)?$/i.test(token.url!);
                                            setActiveMediaViewer({
                                              url: token.url!,
                                              type: isImg ? "image" : isVid ? "video" : isDoc ? "pdf" : "other",
                                              fileName: token.content,
                                              senderName: isMe ? "Vous" : senderName,
                                              timestamp: formatMessageTime(msg.created_at),
                                            });
                                          }
                                        }}
                                      >
                                        <span>{token.content}</span>
                                        {isMediaUrl ? (
                                          <Sparkles className="w-3 h-3 inline-block shrink-0 opacity-90 text-turquoise" />
                                        ) : (
                                          <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />
                                        )}
                                      </a>
                                    );
                                  }
                                  return <span key={idx}>{token.content}</span>;
                                })}
                              </div>

                              {/* Pièce jointe */}
                              {msg.attachment_url && (() => {
                                const url = msg.attachment_url;
                                const name = msg.attachment_name || "Fichier";
                                const isImage = /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(name) || /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url);
                                const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(name) || /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
                                const isPdf = /\.pdf(\?.*)?$/i.test(name) || /\.pdf(\?.*)?$/i.test(url);
                                const isAudio = /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(name) || /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(url);

                                const openInViewer = (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActiveMediaViewer({
                                    url,
                                    type: isImage ? "image" : isVideo ? "video" : isPdf ? "pdf" : isAudio ? "audio" : "other",
                                    fileName: name,
                                    senderName: isMe ? "Vous" : senderName,
                                    timestamp: formatMessageTime(msg.created_at),
                                  });
                                };

                                return (
                                  <div className="mt-2 pt-2 border-t border-white/20">
                                    {isImage ? (
                                      <button
                                        type="button"
                                        onClick={openInViewer}
                                        className="block group relative overflow-hidden rounded-xl border border-white/20 cursor-pointer text-left w-full"
                                      >
                                        <img
                                          src={url}
                                          alt={name}
                                          className="max-h-44 sm:max-h-56 rounded-xl object-cover hover:scale-105 transition-transform w-full"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity backdrop-blur-[1px]">
                                          🔍 Voir la photo en grand
                                        </div>
                                      </button>
                                    ) : isVideo ? (
                                      <button
                                        type="button"
                                        onClick={openInViewer}
                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                                          isMe
                                            ? "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                                            : "bg-navy/5 hover:bg-navy/10 border-navy/10 text-navy"
                                        }`}
                                      >
                                        <div className="w-10 h-10 rounded-xl bg-turquoise/20 text-turquoise flex items-center justify-center shrink-0 shadow-sm">
                                          <Play className="w-5 h-5 fill-turquoise" />
                                        </div>
                                        <div className="truncate flex-1">
                                          <div className="font-bold text-xs truncate">{name}</div>
                                          <div className="text-[10px] opacity-70">🎬 Cliquer pour lire la vidéo</div>
                                        </div>
                                      </button>
                                    ) : isPdf ? (
                                      <button
                                        type="button"
                                        onClick={openInViewer}
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                          isMe
                                            ? "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                                            : "bg-navy/5 hover:bg-navy/10 text-navy border border-navy/10"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 shrink-0 text-red-400" />
                                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{name}</span>
                                        <span className="text-[10px] opacity-70 bg-white/20 px-1.5 py-0.5 rounded">PDF</span>
                                      </button>
                                    ) : isAudio ? (
                                      <div className="w-full">
                                        <audio src={url} controls className="w-full max-w-xs h-10 rounded-xl" />
                                      </div>
                                    ) : (
                                      <a
                                        href={url}
                                        download={name}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                          isMe
                                            ? "bg-white/15 hover:bg-white/25 text-white"
                                            : "bg-navy/5 hover:bg-navy/10 text-navy"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{name}</span>
                                        <Download className="w-3.5 h-3.5 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Statut Heure & Envoi -> Envoyé -> Distribué -> Vu (Monotone) */}
                              <div
                                className={`flex items-center gap-1.5 mt-1 text-[10px] ${
                                  isMe ? "justify-end text-white/80" : "justify-start text-navy/40"
                                }`}
                              >
                                <span>{formatMessageTime(msg.created_at)}</span>
                                {isMe && (
                                  <span className="flex items-center ml-0.5">
                                    {msg.status === "read" || msg.status === "seen" || msg.is_seen ? (
                                      <span
                                        className="inline-flex items-center gap-0.5 text-emerald-300 font-bold"
                                        title="Message lu par le destinataire"
                                      >
                                        <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                                        <span>Vu</span>
                                      </span>
                                    ) : msg.status === "delivered" ? (
                                      <span
                                        className="inline-flex items-center gap-0.5 text-white/85 font-medium"
                                        title="Message distribué au destinataire"
                                      >
                                        <CheckCheck className="w-3.5 h-3.5 text-white/70" />
                                        <span>Distribué</span>
                                      </span>
                                    ) : msg.status === "sent" ? (
                                      <span
                                        className="inline-flex items-center gap-0.5 text-white/75 font-medium"
                                        title="Message envoyé au serveur"
                                      >
                                        <Check className="w-3.5 h-3.5 text-white/90" />
                                        <span>Envoyé</span>
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center gap-1 text-white/70 font-medium"
                                        title="En cours d'envoi..."
                                      >
                                        <Loader2 className="w-3 h-3 animate-spin text-turquoise" />
                                        <span>Envoi...</span>
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions Flottantes (Bouton Emoji + Bouton Supprimer) */}
                            <div
                              className={`flex items-center gap-0.5 transition-all shrink-0 ${
                                isMe ? "flex-row-reverse" : "flex-row"
                              }`}
                            >
                              {/* Bouton Réactions Emojis */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveEmojiPickerMessageId((prev) => (prev === msg.id ? null : msg.id));
                                  }}
                                  className={`p-1.5 rounded-xl hover:bg-navy/5 transition-all cursor-pointer ${
                                    activeEmojiPickerMessageId === msg.id
                                      ? "text-teal-dark bg-teal-50 opacity-100"
                                      : "text-navy/40 hover:text-navy opacity-70 sm:opacity-0 group-hover/bubble:opacity-100"
                                  }`}
                                  title="Réagir avec un emoji"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>

                                {/* Sélecteur Flottant Rapide de 6 Emojis */}
                                {activeEmojiPickerMessageId === msg.id && (
                                  <div
                                    className={`absolute bottom-full mb-1.5 z-40 bg-white/95 backdrop-blur-md border border-navy/10 rounded-full shadow-lg p-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100 ${
                                      isMe ? "right-0" : "left-0"
                                    }`}
                                  >
                                    {QUICK_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleReaction(msg.id, emoji);
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-navy/5 active:scale-125 transition-all flex items-center justify-center text-sm sm:text-base cursor-pointer"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Bouton Supprimer (Unsend ou Modération) */}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setMessageToDelete(msg)}
                                  className="p-1.5 rounded-xl hover:bg-red-50 text-navy/30 hover:text-red-600 transition-all cursor-pointer opacity-70 sm:opacity-0 group-hover/bubble:opacity-100"
                                  title={isMe ? "Supprimer ce message (Unsend)" : "Modérer ce message (Supprimer)"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Pilules de Réactions Emojis sous la bulle */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`flex flex-wrap items-center gap-1.5 pt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                              {msg.reactions.map((r) => (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs border ${
                                    r.has_reacted
                                      ? "bg-turquoise/20 text-teal-dark border-turquoise/40 font-black scale-105"
                                      : "bg-white text-navy/70 border-navy/10 hover:bg-navy/5"
                                  }`}
                                  title={r.has_reacted ? "Vous avez réagi (cliquer pour retirer)" : "Cliquer pour réagir"}
                                >
                                  <span>{r.emoji}</span>
                                  <span className="text-[10px] font-extrabold">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Indicateur "En train d'écrire..." ✍️ */}
              {typingUser && (
                <div className="px-4 py-1.5 bg-teal-50/90 border-t border-turquoise/20 flex items-center gap-2 text-xs font-semibold text-teal-dark shrink-0 animate-in fade-in slide-in-from-bottom-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-turquoise animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-turquoise animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-turquoise animate-bounce"></span>
                  </div>
                  <span className="truncate">
                    <strong className="text-navy font-black">{typingUser}</strong> est en train d'écrire...
                  </span>
                </div>
              )}

              {/* Aperçu Pièce Jointe */}
              {attachmentFile && (
                <div className="px-4 py-2 bg-teal-50 border-t border-turquoise/20 flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {attachmentPreview ? (
                      <img
                        src={attachmentPreview}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-turquoise/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-turquoise/20 text-teal-dark flex items-center justify-center font-bold text-xs">
                        📄
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-navy truncate">
                        {attachmentFile.name}
                      </div>
                      <div className="text-[10px] text-teal-dark font-medium">
                        {(attachmentFile.size / 1024).toFixed(0)} Ko prêt à l'envoi
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAttachmentFile(null);
                      setAttachmentPreview(null);
                    }}
                    className="p-1 rounded-lg text-navy/40 hover:text-navy cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Barre d'envoi Fixe en bas ou Message Mode Lecture Seule */}
              {activeConversation.is_readonly_for_members ? (
                <div className="p-3 sm:p-4 border-t border-navy/5 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 shrink-0 z-10 flex items-center justify-between gap-3 text-xs text-amber-950">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-orange text-white flex items-center justify-center text-sm font-black shrink-0 shadow-2xs">
                      📢
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-navy text-xs sm:text-sm truncate">
                        Canal officiel d&apos;annonces en lecture seule
                      </div>
                      <div className="text-[10px] sm:text-xs text-navy/60 truncate">
                        Réservé aux communications de la direction. Vous pouvez réagir aux messages avec des émojis 👍 ❤️.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-2.5 sm:p-4 border-t border-navy/5 bg-white shrink-0 z-10">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-vlight/60 hover:bg-blue-vlight text-navy/70 hover:text-navy flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Prendre une photo du cahier ou de l'exercice"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-orange" />
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-vlight/60 hover:bg-blue-vlight text-navy/70 hover:text-navy flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Joindre un document ou un exercice"
                  >
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-turquoise" />
                  </button>

                  <input
                    type="text"
                    placeholder="Écrivez votre message..."
                    value={messageText}
                    onChange={handleTypingChange}
                    className="flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-blue-vlight/40 border border-navy/10 rounded-2xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-turquoise focus:bg-white outline-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={(!messageText.trim() && !attachmentFile) || sendingMessage}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-r from-teal-dark to-turquoise text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    title="Envoyer le message"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                    ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </form>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              {loadingConversations ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-turquoise" />
                  <p className="text-xs font-bold text-navy/60">Chargement de la messagerie...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-blue-vlight text-teal-dark flex items-center justify-center shadow-2xs">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-black text-navy">Sélectionnez une discussion pour échanger</p>
                  <p className="text-xs text-navy/60 max-w-xs">
                    Choisissez une conversation dans la liste de gauche ou démarrez un nouvel échange.
                  </p>
                  <button
                    onClick={() => setActionModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-dark to-turquoise text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer mt-1"
                  >
                    + Nouvelle Discussion
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Scanner Caméra 📸 */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Scanner ou Photographier votre Cahier"
      />

      {/* MODALE 1 : SUPPRESSION DE MESSAGE FAÇON INSTAGRAM (UNSEND) */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-navy/10 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-navy">Supprimer le message ?</h3>
              <p className="text-xs text-navy/60 leading-relaxed">
                Ce message sera définitivement retiré pour <strong>tous les participants</strong> de la discussion.
              </p>
            </div>
            <div className="p-3 bg-blue-vlight/50 rounded-2xl text-left border border-navy/5">
              <p className="text-xs text-navy/80 italic line-clamp-3">"{messageToDelete.content}"</p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                disabled={deletingMessage}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 2 : SUPPRESSION DE DISCUSSION / SALON */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-navy/10 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-navy">
                {conversationToDelete.type === "direct" ? "Supprimer la discussion ?" : "Supprimer le salon ?"}
              </h3>
              <p className="text-xs text-navy/60 leading-relaxed">
                Cette action supprimera l'intégralité de l'historique des messages et des fichiers pour tous les membres.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                disabled={deletingConversation}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingConversation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 3 : NOUVEAU SALON DE CLASSE OU MESSAGE DIRECT */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-navy/10 max-h-[90vh] overflow-y-auto">
            {/* Header Modale */}
            <div className="flex items-center justify-between border-b border-navy/5 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-turquoise/15 text-teal-dark flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-navy">Nouvelle Discussion</h3>
                  <p className="text-xs text-navy/50">Choisissez le type d'échange</p>
                </div>
              </div>
              <button
                onClick={() => setActionModalOpen(false)}
                className="p-1.5 rounded-xl text-navy/40 hover:text-navy hover:bg-navy/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets 2-en-1 */}
            <div className="flex bg-blue-vlight/50 p-1 rounded-2xl border border-navy/5">
              {(currentUser.role === "prof" || currentUser.role === "admin" || currentUser.role === "super_admin") && (
                <button
                  type="button"
                  onClick={() => setModalTab("class_room")}
                  className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalTab === "class_room"
                      ? "bg-white text-navy font-black shadow-xs"
                      : "text-navy/60 hover:text-navy"
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-turquoise" />
                  <span>1. Salon de Classe</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalTab("direct_message")}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === "direct_message"
                    ? "bg-white text-navy font-black shadow-xs"
                    : "text-navy/60 hover:text-navy"
                }`}
              >
                <Mail className="w-4 h-4 text-purple-600" />
                <span>2. Message Direct (1-à-1)</span>
              </button>
            </div>

            {/* ONGLET 1 : SALON DE CLASSE */}
            {modalTab === "class_room" && (
              <form onSubmit={handleCreateClassRoom} className="space-y-3.5 sm:space-y-4">
                <div className="p-3 bg-teal-50/70 rounded-2xl border border-turquoise/20 text-xs text-teal-dark space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-turquoise" />
                    <span>Inscription automatique de la classe</span>
                  </div>
                  <p className="text-[11px] text-navy/70 leading-relaxed">
                    Tous les élèves inscrits dans la classe sélectionnée seront <strong>automatiquement intégrés</strong> au salon et recevront une notification.
                  </p>
                </div>

                {/* 1. Sélecteur de Classe */}
                <div>
                  <label className="block text-xs font-bold text-navy/70 mb-1 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-navy/60" />
                    <span>1. Choisir la Classe ciblée *</span>
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer focus:border-turquoise focus:bg-white"
                    required
                  >
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Type de salon */}
                <div>
                  <label className="block text-xs font-bold text-navy/70 mb-1">
                    2. Type d'Échange
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer focus:border-turquoise focus:bg-white"
                  >
                    <option value="subject_channel">📚 Salon de Matière (Questions / Exercices)</option>
                    <option value="announcement">📢 Fil d'Annonces Officielles de la Classe</option>
                  </select>
                </div>

                {/* 3. Sélecteur de Matière */}
                {roomType === "subject_channel" && (
                  <div>
                    <label className="block text-xs font-bold text-navy/70 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-turquoise" />
                      <span>3. Matière concernée *</span>
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer focus:border-turquoise focus:bg-white"
                      required
                    >
                      {subjectsForSelectedClass.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Titre personnalisé optionnel */}
                <div>
                  <label className="block text-xs font-bold text-navy/70 mb-1">
                    Titre du Salon (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Laissez vide pour le titre automatique..."
                    value={customRoomTitle}
                    onChange={(e) => setCustomRoomTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-bold text-navy placeholder:text-navy/40 outline-none focus:border-turquoise focus:bg-white"
                  />
                </div>

                {/* 5. Message d'accueil */}
                <div>
                  <label className="block text-xs font-bold text-navy/70 mb-1">
                    Premier Message / Consignes aux élèves (optionnel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ex: Bonjour à tous, posez ici toutes vos questions..."
                    value={initialRoomMessage}
                    onChange={(e) => setInitialRoomMessage(e.target.value)}
                    className="w-full px-3.5 py-2 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy placeholder:text-navy/40 outline-none focus:border-turquoise focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRoom || !selectedClassId}
                    className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-dark to-turquoise text-white text-xs font-black shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {creatingRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Créer le salon</span>
                  </button>
                </div>
              </form>
            )}

            {/* ONGLET 2 : DISCUSSION PRIVÉE DIRECTE */}
            {modalTab === "direct_message" && (
              <div className="space-y-3.5 sm:space-y-4">
                {currentUser.role === "parent" ? (
                  <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-turquoise/10 rounded-2xl border border-emerald-200/60 text-xs text-emerald-950 space-y-2">
                    <div className="font-bold flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-900">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Espace d&apos;échange Parent &amp; Équipe Éducative</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                      Contactez directement l&apos;administration ou les professeurs attitrés de vos enfants sans avoir à chercher.
                    </p>

                    {/* Raccourci 1-Clic Administration */}
                    <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                          🏛️
                        </div>
                        <div>
                          <div className="text-xs font-bold text-navy">Direction &amp; Administration Scolaire</div>
                          <div className="text-[10px] text-navy/50">Pour toute question générale ou administrative</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!!startingDirectChat}
                        onClick={() => {
                          const adminConv = conversations.find(
                            (c) =>
                              c.type === "direct" &&
                              (c.title?.toLowerCase().includes("direction") ||
                                c.title?.toLowerCase().includes("administration") ||
                                c.participants?.some((p) => p.role === "admin" || p.role === "super_admin"))
                          );
                          if (adminConv) {
                            setActiveConvId(adminConv.id);
                            setMobileView("chat");
                            setActionModalOpen(false);
                            return;
                          }
                          const adminUser = directoryUsers.find((u: any) => u.role === "admin" || u.role === "super_admin");
                          if (adminUser) {
                            handleStartDirectChat(adminUser.id);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {startingDirectChat ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Ouverture...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Écrire</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>Discussions directes 1-à-1 sécurisées</span>
                    </div>
                    <p className="text-[11px] text-purple-800/80 leading-relaxed">
                      Échangez en privé entre professeurs, avec l&apos;administration ou avec un élève en particulier.
                    </p>
                  </div>
                )}

                {/* Recherche dans l'annuaire */}
                <div className="relative">
                  <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher par prénom, nom ou matière..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Filtres par Rôle */}
                {currentUser.role === "parent" ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setDirectoryRoleFilter("child_teachers")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                        directoryRoleFilter === "child_teachers"
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      ⭐ Professeurs de vos enfants
                    </button>
                    <button
                      onClick={() => setDirectoryRoleFilter("admin")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                        directoryRoleFilter === "admin"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      🏛️ Administration
                    </button>
                    <button
                      onClick={() => setDirectoryRoleFilter("prof")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                        directoryRoleFilter === "prof"
                          ? "bg-teal-dark text-white shadow-sm"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      🧑‍🏫 Tous les Professeurs
                    </button>
                    <button
                      onClick={() => setDirectoryRoleFilter("all")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                        directoryRoleFilter === "all"
                          ? "bg-navy text-white shadow-sm"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      Tous les contacts
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setDirectoryRoleFilter("all")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 ${
                        directoryRoleFilter === "all"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setDirectoryRoleFilter("prof")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 ${
                        directoryRoleFilter === "prof"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      🧑‍🏫 Professeurs
                    </button>
                    <button
                      onClick={() => setDirectoryRoleFilter("admin")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 ${
                        directoryRoleFilter === "admin"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      🛡️ Administration
                    </button>
                    <button
                      onClick={() => setDirectoryRoleFilter("etudiant")}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer shrink-0 ${
                        directoryRoleFilter === "etudiant"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-vlight text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      🎒 Élèves
                    </button>
                  </div>
                )}

                {/* Liste des Utilisateurs */}
                <div className="max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-navy/5 border border-navy/5 rounded-2xl overscroll-contain">
                  {loadingDirectory ? (
                    <div className="p-8 text-center text-navy/40">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-600" />
                    </div>
                  ) : filteredDirectory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-navy/40">
                      Aucun membre trouvé dans cette catégorie.
                    </div>
                  ) : (
                    filteredDirectory.map((userItem: any) => (
                      <div
                        key={userItem.id}
                        onClick={() => handleStartDirectChat(userItem.id)}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          userItem.is_child_teacher
                            ? "bg-emerald-50/40 hover:bg-emerald-50/80"
                            : "hover:bg-purple-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                            userItem.is_child_teacher
                              ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
                              : "bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
                          }`}>
                            {userItem.first_name?.[0]?.toUpperCase()}
                            {userItem.last_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-navy truncate flex items-center gap-1.5 flex-wrap">
                              <span>{userItem.first_name} {userItem.last_name}</span>
                              {userItem.is_child_teacher && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full shrink-0">
                                  ⭐ Enseignant de {userItem.child_name || "votre enfant"}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-navy/50 flex items-center gap-1 truncate">
                              {getRoleBadge(userItem.role)}
                              {userItem.class_name && (
                                <span className="truncate text-teal-dark font-medium">• {userItem.class_name}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          disabled={startingDirectChat === userItem.id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                            userItem.is_child_teacher
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white"
                          }`}
                        >
                          {startingDirectChat === userItem.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          <span>Discuter</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE 4 : ALERTE DE MODÉRATION & SÉCURITÉ 🛡️ */}
      {moderationAlert && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-navy/10 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs border border-amber-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-navy">Message non conforme</h3>
              <p className="text-xs text-navy/70 leading-relaxed">
                {moderationAlert.message}
              </p>
              {moderationAlert.label && (
                <div className="inline-block px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Motif détecté : {moderationAlert.label}
                </div>
              )}
            </div>
            <div className="p-3 bg-blue-vlight/50 rounded-2xl text-xs text-navy/60 text-left border border-navy/5">
              <p className="font-bold text-navy">Charte de vie scolaire :</p>
              <p className="text-[11px] mt-0.5 text-navy/70 leading-relaxed">
                Les insultes, menaces, vulgarités ou propos inappropriés sont strictement interdits sur la plateforme éducative.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModerationAlert(null)}
              className="w-full py-2.5 rounded-xl bg-navy text-white text-xs font-bold shadow-md hover:bg-navy/90 cursor-pointer transition-colors"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}

      {/* VISIONNEUSE MEDIA IN-APP (Photos, Vidéos, Documents sans quitter la plateforme) */}
      <ChatMediaViewerModal
        media={activeMediaViewer}
        onClose={() => setActiveMediaViewer(null)}
      />
    </div>
  );
}
