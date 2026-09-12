import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatCard from "@/components/platform/StatCard";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserPlus,
  ArrowUpRight,
  Sparkles,
  Video,
  Clock,
  ChevronRight,
} from "lucide-react";
import { fetchAdminMeetingsAction } from "./planning/actions";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Compteurs en direct & Réunions
  const [{ count: profCount }, { count: studentCount }, { count: classCount }, meetingsRes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "prof"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "etudiant"),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    fetchAdminMeetingsAction(),
  ]);

  const meetings = meetingsRes.success ? meetingsRes.data : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange/10 text-orange text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Administration Scolaire
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Tableau de Bord Administrateur
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Gérez les professeurs, les inscriptions des élèves et l&apos;organisation des classes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/planning"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            Planning &amp; Visioconférences
          </Link>
        </div>
      </div>

      {/* Bannière Réunion Institutionnelle Active ou Programmée */}
      {meetings.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black shrink-0 shadow-inner">
              <Video className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full">
                  Visioconférence &amp; Assemblée
                </span>
                {meetings.some((m) => m.status === "live") && (
                  <span className="text-[10px] font-black uppercase text-white bg-orange px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> EN DIRECT
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {meetings[0].title}
              </h3>
              <p className="text-xs text-white/70 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span>
                  Prévue le {new Date(meetings[0].start_time).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {new Date(meetings[0].start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/admin/planning"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Gérer les Visioconférences</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Professeurs"
          value={profCount || 0}
          subtitle="Enseignants actifs"
          icon={GraduationCap}
          color="turquoise"
          badge="Pédagogie"
        />
        <StatCard
          title="Étudiants Inscrits"
          value={studentCount || 0}
          subtitle="Élèves sur la plateforme"
          icon={Users}
          color="orange"
          badge="Effectif"
        />
        <StatCard
          title="Classes Actives"
          value={classCount || 0}
          subtitle="Cycle découverte & niveaux"
          icon={BookOpen}
          color="navy"
          badge="Structure"
        />
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-7 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy mb-2">Gestion des Utilisateurs</h3>
            <p className="text-sm text-navy/60 leading-relaxed mb-6">
              Créez des comptes pour les professeurs et les élèves, générez des mots de passe temporaires et gérez les rôles.
            </p>
          </div>
          <Link
            href="/admin/utilisateurs"
            className="inline-flex items-center gap-2 text-sm font-bold text-orange hover:text-orange/80 transition-colors"
          >
            Accéder à la liste des utilisateurs <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-7 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-turquoise/10 text-turquoise flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy mb-2">Classes &amp; Matières</h3>
            <p className="text-sm text-navy/60 leading-relaxed mb-6">
              Structurez les classes du Cycle Découverte, assignez les matières obligatoires et optionnelles aux enseignants.
            </p>
          </div>
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-2 text-sm font-bold text-turquoise hover:text-turquoise/80 transition-colors"
          >
            Configurer les classes et matières <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
