"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  FileCheck,
  Award,
  Lightbulb,
  BookOpen,
  Radio,
  MessageSquare,
  Megaphone,
  X,
  ExternalLink,
  Sparkles,
  Loader2,
  ChevronRight,
  Video,
} from "lucide-react";
import { AppNotification, NotificationType } from "@/lib/types";
import {
  fetchMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications/actions";

import { createClient } from "@/lib/supabase/client";

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [redirectingId, setRedirectingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Charger les notifications
  const loadNotifications = async () => {
    try {
      const res = await fetchMyNotificationsAction();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadNotifications();

    const supabase = createClient();
    const uniqueChannelName = `notif_bell_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fermer le panneau si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (redirectingId) return;
    setRedirectingId(notif.id);

    if (!notif.is_read) {
      // Marquer comme lu localement immédiatement
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationReadAction(notif.id).catch(() => {});
    }

    if (notif.link_url) {
      router.push(notif.link_url);
      setTimeout(() => {
        setIsOpen(false);
        setRedirectingId(null);
      }, 500);
    } else {
      setTimeout(() => {
        setIsOpen(false);
        setRedirectingId(null);
      }, 250);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "assignment":
        return <FileCheck className="w-4 h-4 text-orange" />;
      case "grade":
        return <Award className="w-4 h-4 text-emerald-600" />;
      case "solution":
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case "material":
        return <BookOpen className="w-4 h-4 text-turquoise" />;
      case "live":
        return <Video className="w-4 h-4 text-purple-600" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case "announcement":
        return <Megaphone className="w-4 h-4 text-blue-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-turquoise" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return "À l'instant";
      if (diffMin < 60) return `Il y a ${diffMin} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays === 1) return "Hier";
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  const displayedList =
    filterTab === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton Cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-2xl bg-white/80 hover:bg-white border border-navy/10 flex items-center justify-center text-navy transition-all shadow-xs hover:shadow-sm cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 transition-transform ${isOpen ? "rotate-12 text-turquoise" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau Flottant Dropdown (Adapté Mobile et PC) */}
      {isOpen && (
        <div className="absolute right-[-40px] sm:right-0 mt-3 w-[calc(100vw-2rem)] sm:w-96 max-w-[390px] bg-white rounded-3xl shadow-2xl border border-navy/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-navy/5 bg-gradient-to-r from-blue-vlight/80 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-turquoise/15 flex items-center justify-center">
                <Bell className="w-4 h-4 text-teal-dark" />
              </div>
              <div>
                <h4 className="text-sm font-black text-navy">Notifications</h4>
                <p className="text-[10px] font-medium text-navy/50">
                  {unreadCount > 0
                    ? `${unreadCount} notification(s) non lue(s)`
                    : "Toutes les alertes sont à jour"}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-turquoise hover:text-teal-dark flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-turquoise/20 shadow-2xs transition-colors"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tout lire</span>
              </button>
            )}
          </div>

          {/* Onglets Filtres */}
          <div className="flex border-b border-navy/5 px-4 pt-2 gap-3 bg-white">
            <button
              onClick={() => setFilterTab("all")}
              className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                filterTab === "all"
                  ? "border-turquoise text-teal-dark font-black"
                  : "border-transparent text-navy/50 hover:text-navy"
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilterTab("unread")}
              className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                filterTab === "unread"
                  ? "border-turquoise text-teal-dark font-black"
                  : "border-transparent text-navy/50 hover:text-navy"
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          {/* Liste des Notifications avec Feedback de Clic */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-navy/5 p-1.5">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-vlight flex items-center justify-center mx-auto text-navy/30">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-navy/70">Aucune notification</p>
                <p className="text-[11px] text-navy/40">
                  Vous recevrez ici les alertes de visioconférences, devoirs, notes et annonces.
                </p>
              </div>
            ) : (
              displayedList.map((notif) => {
                const isRedirecting = redirectingId === notif.id;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 my-0.5 active:scale-[0.98] ${
                      isRedirecting
                        ? "bg-turquoise/15 ring-2 ring-turquoise shadow-sm"
                        : !notif.is_read
                        ? "bg-turquoise/5 hover:bg-turquoise/10"
                        : "bg-white hover:bg-blue-vlight/60"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 transition-colors ${
                        isRedirecting
                          ? "bg-turquoise text-white"
                          : "bg-white border border-navy/5"
                      }`}
                    >
                      {isRedirecting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        getIcon(notif.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h5
                          className={`text-xs truncate ${
                            !notif.is_read || isRedirecting
                              ? "font-black text-navy"
                              : "font-bold text-navy/80"
                          }`}
                        >
                          {notif.title}
                        </h5>
                        <span className="text-[10px] text-navy/40 shrink-0 font-medium">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-navy/60 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Indicateur visuel immédiat de redirection */}
                      {isRedirecting ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-turquoise text-white text-[10px] font-black animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Redirection en cours...</span>
                        </div>
                      ) : notif.link_url && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-turquoise">
                          <span>Accéder</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    {!notif.is_read && !isRedirecting && (
                      <div className="w-2 h-2 rounded-full bg-turquoise shrink-0 mt-2"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
