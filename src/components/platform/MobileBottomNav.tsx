"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  FileCheck,
  Award,
  MessageSquare,
  Users,
  BookOpen,
} from "lucide-react";
import { Role } from "@/lib/types";
import { fetchTotalUnreadMessagesCountAction } from "@/app/(platform)/messages/actions";
import { createClient } from "@/lib/supabase/client";

interface MobileBottomNavProps {
  role: Role;
}

export default function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Réinitialiser le pending quand la navigation est effective
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Écoute en temps réel des messages non lus
  const loadUnreadCount = async () => {
    try {
      const res = await fetchTotalUnreadMessagesCountAction();
      if (res.success) {
        setUnreadCount(res.unreadCount);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadUnreadCount();

    const supabase = createClient();
    const uniqueChannel = `bottom_nav_msg_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannel)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => loadUnreadCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_participants" },
        () => loadUnreadCount()
      )
      .subscribe();

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

  // Définition des 5 onglets principaux par rôle
  const getNavItems = () => {
    if (role === "admin" || role === "super_admin") {
      return [
        { label: "Accueil", href: role === "super_admin" ? "/super-admin" : "/admin", icon: LayoutDashboard },
        { label: "Membres", href: "/admin/utilisateurs", icon: Users },
        { label: "Planning", href: "/admin/planning", icon: Calendar },
        { label: "Présences", href: "/admin/presences", icon: Award },
        { label: "Messages", href: "/admin/messages", icon: MessageSquare, isChat: true },
      ];
    }
    if (role === "prof") {
      return [
        { label: "Accueil", href: "/prof", icon: LayoutDashboard },
        { label: "Planning", href: "/prof/planning", icon: Calendar },
        { label: "Devoirs", href: "/prof/devoirs", icon: FileCheck },
        { label: "Cours", href: "/prof/cours", icon: BookOpen },
        { label: "Messages", href: "/prof/messages", icon: MessageSquare, isChat: true },
      ];
    }
    if (role === "parent") {
      return [
        { label: "Accueil", href: "/parent", icon: LayoutDashboard },
        { label: "Planning", href: "/parent/planning", icon: Calendar },
        { label: "Devoirs", href: "/parent/devoirs", icon: FileCheck },
        { label: "Notes", href: "/parent/notes", icon: Award },
        { label: "Messages", href: "/parent/messages", icon: MessageSquare, isChat: true },
      ];
    }
    // etudiant par défaut
    return [
      { label: "Accueil", href: "/etudiant", icon: LayoutDashboard },
      { label: "Planning", href: "/etudiant/planning", icon: Calendar },
      { label: "Devoirs", href: "/etudiant/devoirs", icon: FileCheck },
      { label: "Notes", href: "/etudiant/notes", icon: Award },
      { label: "Messages", href: "/etudiant/messages", icon: MessageSquare, isChat: true },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a2e3b]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.25)] flex items-center justify-around safe-area-pb"
      aria-label="Navigation mobile"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isRoot = item.href === "/etudiant" || item.href === "/prof" || item.href === "/admin" || item.href === "/super-admin" || item.href === "/parent";
        const isCurrent = isRoot ? pathname === item.href : pathname.startsWith(item.href);
        const isPending = pendingHref === item.href;
        const isActive = isPending || (isCurrent && !pendingHref);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (pathname !== item.href) {
                setPendingHref(item.href);
              }
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all select-none min-w-[56px] active:scale-90 ${
              isPending
                ? "text-orange font-black scale-105"
                : isActive
                ? "text-orange font-black"
                : "text-white/60 hover:text-white/90 font-medium"
            }`}
          >
            {/* Arrière-plan subtil pour l'onglet actif ou en cours de chargement */}
            {isActive && (
              <span className={`absolute inset-0 rounded-xl border transition-all duration-200 ${
                isPending
                  ? "bg-orange/25 border-orange/40 animate-pulse"
                  : "bg-orange/15 border-orange/25"
              }`} />
            )}

            {/* Icône avec badge ou indicateur de chargement immédiat */}
            <div className="relative z-10">
              <Icon className={`w-5 h-5 transition-transform ${isPending ? "scale-115 text-orange animate-bounce" : isActive ? "scale-110 text-orange" : ""}`} />
              {item.isChat && unreadCount > 0 && !isCurrent && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            {/* Libellé de l'onglet */}
            <span className="text-[10px] mt-0.5 z-10 truncate tracking-tight">
              {isPending ? "..." : item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
