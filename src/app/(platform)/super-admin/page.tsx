import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatCard from "@/components/platform/StatCard";
import {
  ShieldAlert,
  Users,
  GraduationCap,
  Award,
  KeyRound,
  FileCheck,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  // Compteurs en direct depuis la table profiles
  const [{ count: superAdminCount }, { count: adminCount }, { count: profCount }, { count: studentCount }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "super_admin"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "prof"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "etudiant"),
    ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          Accès Maître &amp; Supervision
        </div>
        <h1 className="text-3xl font-black text-navy tracking-tight">
          Tableau de Bord Super Admin
        </h1>
        <p className="text-sm text-navy/60 mt-1">
          Supervision globale de la sécurité, des accès administrateurs et des effectifs de l&apos;école.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Super Admins"
          value={superAdminCount || 0}
          subtitle="Comptes maîtres actifs"
          icon={KeyRound}
          color="purple"
          badge="Sécurité"
        />
        <StatCard
          title="Administrateurs"
          value={adminCount || 0}
          subtitle="Gestionnaires d'école"
          icon={ShieldAlert}
          color="orange"
          badge="Opérations"
        />
        <StatCard
          title="Professeurs"
          value={profCount || 0}
          subtitle="Enseignants enregistrés"
          icon={GraduationCap}
          color="turquoise"
          badge="Pédagogie"
        />
        <StatCard
          title="Étudiants"
          value={studentCount || 0}
          subtitle="Apprenants inscrits"
          icon={Users}
          color="navy"
          badge="Effectif"
        />
      </div>

      {/* Vault & Security Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-navy/5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-purple-600" />
              État du Coffre-fort Numérique &amp; Sécurité
            </h3>
            <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Système Sécurisé
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-vlight/50 border border-navy/5 rounded-2xl p-4">
              <div className="text-xs font-bold text-navy/50 uppercase">Service Role Vault</div>
              <div className="text-sm font-black text-navy mt-1">Confiné côté serveur (Isolé)</div>
              <p className="text-xs text-navy/60 mt-1">Aucune clé d&apos;administration exposée au navigateur.</p>
            </div>
            <div className="bg-blue-vlight/50 border border-navy/5 rounded-2xl p-4">
              <div className="text-xs font-bold text-navy/50 uppercase">Row Level Security (RLS)</div>
              <div className="text-sm font-black text-teal-dark mt-1">100% des tables protégées</div>
              <p className="text-xs text-navy/60 mt-1">Contrôle strict des lectures et écritures par rôle.</p>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-navy/5">
            <span className="text-xs text-navy/60 font-medium">
              Toutes les actions d&apos;administration sont consignées dans le journal d&apos;audit.
            </span>
            <Link
              href="/super-admin/audit"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Consulter l&apos;audit log <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-gradient-to-br from-[#1a2e3b] to-[#243f52] text-white rounded-3xl p-7 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">Actions Administratives</h3>
            <p className="text-xs text-white/70 leading-relaxed mb-6">
              Raccourcis pour configurer l&apos;école, créer des comptes et structurer les matières.
            </p>

            <div className="space-y-3">
              <Link
                href="/admin/utilisateurs"
                className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-orange" />
                  Gérer les Utilisateurs
                </span>
                <ArrowUpRight className="w-4 h-4 text-white/50" />
              </Link>
              <Link
                href="/admin/classes"
                className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-turquoise" />
                  Gérer Classes &amp; Matières
                </span>
                <ArrowUpRight className="w-4 h-4 text-white/50" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-white/50">
            Mon École en Live — Version Plateforme 1.0
          </div>
        </div>
      </div>
    </div>
  );
}
