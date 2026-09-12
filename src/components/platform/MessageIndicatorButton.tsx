import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { fetchTotalUnreadMessagesCountAction } from "@/app/(platform)/messages/actions";
import { Role } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface MessageIndicatorButtonProps {
  role: Role;
}

export default function MessageIndicatorButton({ role }: MessageIndicatorButtonProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const getHref = () => {
    switch (role) {
      case "prof":
        return "/prof/messages";
      case "admin":
      case "super_admin":
        return "/admin/messages";
      case "parent":
        return "/parent/messages";
      case "etudiant":
      default:
        return "/etudiant/messages";
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await fetchTotalUnreadMessagesCountAction();
      if (res.success) {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadUnreadCount();

    // 1. Écouter les changements en direct via Supabase Realtime avec un canal unique par instance
    const supabase = createClient();
    const uniqueChannelName = `msg_counter_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          loadUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_participants" },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    // 2. Écouter les événements internes (ex: quand l'utilisateur lit une conversation)
    const handleReadStateChanged = (e: any) => {
      if (e?.detail?.unreadCount !== undefined) {
        setUnreadCount(e.detail.unreadCount);
      } else {
        loadUnreadCount();
      }
    };
    window.addEventListener("chat:read_state_changed", handleReadStateChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("chat:read_state_changed", handleReadStateChanged);
    };
  }, []);

  return (
    <Link
      href={getHref()}
      className="relative w-10 h-10 rounded-2xl bg-white/80 hover:bg-white border border-navy/10 flex items-center justify-center text-navy hover:text-purple-600 transition-all shadow-xs hover:shadow-sm group cursor-pointer"
      title="Messagerie & Salons de discussion"
    >
      <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-bounce [animation-duration:2s]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
