"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  FileCheck,
  Award,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Sparkles,
  BookOpen,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Profile, ROLE_LABEL, type Role } from "@/lib/types";
import NotificationBell from "@/components/platform/NotificationBell";
import MessageIndicatorButton from "@/components/platform/MessageIndicatorButton";
import MobileBottomNav from "@/components/platform/MobileBottomNav";
import TopProgressBar from "@/components/platform/TopProgressBar";

interface PlatformShellProps {
  user: Profile;
  children: React.ReactNode;
}

export default function PlatformShell({ user, children }: PlatformShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Dès que l'URL change (la nouvelle page est chargée), on désactive l'indicateur de transition
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Liens de navigation selon le rôle
  const getNavLinks = (role: Role) => {
    if (role === "super_admin") {
      return [
        { label: "Vue Sécurité & Globale", href: "/super-admin", icon: LayoutDashboard },
        { label: "Gestion Utilisateurs", href: "/admin/utilisateurs", icon: Users },
        { label: "Classes & Matières", href: "/admin/classes", icon: GraduationCap },
        { label: "Planning & Directs Globaux", href: "/admin/planning", icon: Calendar },
        { label: "Présences & Émargements", href: "/admin/presences", icon: Award },
        { label: "Devoirs & Évaluations", href: "/admin/devoirs", icon: FileCheck },
        { label: "Supports & Cours", href: "/admin/cours", icon: BookOpen },
        { label: "Messagerie & Échanges", href: "/admin/messages", icon: MessageSquare },
        { label: "Journal d'Audit & Sécurité", href: "/super-admin/audit", icon: ShieldAlert },
      ];
    }
    if (role === "admin") {
      return [
        { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
        { label: "Gestion Utilisateurs", href: "/admin/utilisateurs", icon: Users },
        { label: "Classes & Matières", href: "/admin/classes", icon: GraduationCap },
        { label: "Planning & Directs Globaux", href: "/admin/planning", icon: Calendar },
        { label: "Présences & Émargements", href: "/admin/presences", icon: Award },
        { label: "Devoirs & Évaluations", href: "/admin/devoirs", icon: FileCheck },
        { label: "Supports & Cours", href: "/admin/cours", icon: BookOpen },
        { label: "Messagerie & Échanges", href: "/admin/messages", icon: MessageSquare },
      ];
    }
    if (role === "prof") {
      return [
        { label: "Tableau de bord", href: "/prof", icon: LayoutDashboard },
        { label: "Planning & Directs", href: "/prof/planning", icon: Calendar },
        { label: "Devoirs & Corrections", href: "/prof/devoirs", icon: FileCheck },
        { label: "Supports de Cours", href: "/prof/cours", icon: BookOpen },
        { label: "Messagerie Pédagogique", href: "/prof/messages", icon: MessageSquare },
      ];
    }
    if (role === "parent") {
      return [
        { label: "Tableau de bord", href: "/parent", icon: LayoutDashboard },
        { label: "Planning & Présences", href: "/parent/planning", icon: Calendar },
        { label: "Devoirs & Travail", href: "/parent/devoirs", icon: FileCheck },
        { label: "Notes & Bulletins", href: "/parent/notes", icon: Award },
        { label: "Messagerie Établissement", href: "/parent/messages", icon: MessageSquare },
      ];
    }
    // etudiant
    return [
      { label: "Tableau de bord", href: "/etudiant", icon: LayoutDashboard },
      { label: "Planning & Directs", href: "/etudiant/planning", icon: Calendar },
      { label: "Mes Devoirs", href: "/etudiant/devoirs", icon: FileCheck },
      { label: "Mes Cours & Documents", href: "/etudiant/cours", icon: BookOpen },
      { label: "Mes Notes", href: "/etudiant/notes", icon: Award },
      { label: "Messagerie & Salons", href: "/etudiant/messages", icon: MessageSquare },
    ];
  };

  const navLinks = getNavLinks(user.role);

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-500/20 text-purple-300 border-purple-400/30";
      case "admin":
        return "bg-orange/20 text-orange border-orange/30";
      case "prof":
        return "bg-turquoise/20 text-turquoise border-turquoise/30";
      case "parent":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
      case "etudiant":
      default:
        return "bg-blue-400/20 text-sky-300 border-blue-400/30";
    }
  };

  const fullName =
    user.first_name || user.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user.email || "Utilisateur";

  const initials =
    user.first_name && user.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : fullName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f7f9] flex flex-col md:flex-row relative">
      {/* 🚀 Barre de progression de navigation supérieure globale et instantanée sur chaque clic */}
      <TopProgressBar />

      {/* Mobile Topbar */}
      <div className="md:hidden bg-[#1a2e3b] text-white px-5 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Mon École en Live"
            width={140}
            height={45}
            className="h-8 w-auto brightness-0 invert object-contain"
          />
        </Link>
        <div className="flex items-center gap-2.5">
          <MessageIndicatorButton role={user.role} />
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop Overlay (Clic extérieur pour fermer immédiatement) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-navy/70 backdrop-blur-xs animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer — 100% Fixe sur la gauche */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] h-screen overflow-y-auto bg-[#1a2e3b] text-white flex flex-col justify-between p-6 transition-transform duration-300 shadow-2xl md:shadow-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Logo & Nav */}
        <div>
          <div className="mb-8 hidden md:block pt-2">
            <Link href="/" className="block">
              <Image
                src="/logo.png"
                alt="Mon École en Live"
                width={180}
                height={55}
                className="h-10 w-auto brightness-0 invert object-contain"
              />
            </Link>
          </div>

          {/* User Profile Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-turquoise to-teal-dark text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{fullName}</div>
                <div className="text-[11px] text-white/50 truncate mb-1">
                  {user.email || ""}
                </div>
                <span
                  className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                    user.role
                  )}`}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="space-y-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isRoot =
                item.href === "/admin" ||
                item.href === "/super-admin" ||
                item.href === "/prof" ||
                item.href === "/etudiant" ||
                item.href === "/parent";

              const isCurrent = isRoot
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                    setMobileOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all relative group cursor-pointer ${
                    isPending
                      ? "bg-orange/90 text-white shadow-lg shadow-orange/20 ring-2 ring-orange/40 scale-[1.02]"
                      : isActive
                      ? "bg-orange text-white shadow-lg shadow-orange/20"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 transition-transform ${isPending ? "scale-110" : ""}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* Badge animé lors du clic sur l'élément */}
                  {isPending && (
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-white bg-white/20 px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ouverture...</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Logout & Site Link */}
        <div className="pt-6 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-turquoise hover:bg-white/5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-turquoise" />
            <span>Voir le site vitrine</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-white/80 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-red-400" />
            )}
            <span>{loggingOut ? "Déconnexion..." : "Se déconnecter"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Desktop Top Bar */}
      <main className="flex-1 md:ml-72 flex flex-col min-w-0 min-h-screen bg-[#f4f7f9]">
        {/* Desktop Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 lg:px-10 py-4 bg-white/60 backdrop-blur-xs border-b border-navy/5 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs font-bold text-navy/60">
            {pendingHref ? (
              <div className="flex items-center gap-2 text-orange font-bold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange" />
                <span>Chargement de la page...</span>
              </div>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Mon École en Live</span>
                <span className="text-navy/30">•</span>
                <span className="text-navy/80 font-medium">Session sécurisée active</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <MessageIndicatorButton role={user.role} />
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 p-3.5 sm:p-6 md:p-8 lg:p-10 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          {children}
        </div>
      </main>

      {/* 📱 Barre de navigation fixe inférieure sur Mobile (Bottom Tab Bar) */}
      <MobileBottomNav role={user.role} />
    </div>
  );
}
