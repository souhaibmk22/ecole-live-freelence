"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileCheck,
  GraduationCap,
  Video,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  Play,
  PhoneOff,
  ChevronRight,
  Clock,
} from "lucide-react";
import StatCard from "@/components/platform/StatCard";
import JitsiEmbed from "@/components/platform/JitsiEmbed";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import { AdminMeeting, Profile } from "@/lib/types";

interface ProfDashboardClientViewProps {
  teacher: Profile;
  assignedSubjects: any[];
  initialMeetings?: AdminMeeting[];
  directsCount: number;
  devoirsCount: number;
}

export default function ProfDashboardClientView({
  teacher,
  assignedSubjects,
  initialMeetings = [],
  directsCount,
  devoirsCount,
}: ProfDashboardClientViewProps) {
  const [meetings] = useState<AdminMeeting[]>(initialMeetings);
  const [activeMeetingSession, setActiveMeetingSession] = useState<AdminMeeting | null>(null);
  const [selectedMeetingReplay, setSelectedMeetingReplay] = useState<AdminMeeting | null>(null);

  const teacherDisplayName = `Prof. ${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();
  const assignedCount = assignedSubjects.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Espace Enseignant
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Tableau de Bord Professeur
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Gérez vos cours en direct, la présence des élèves et la correction des devoirs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/prof/planning"
            className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-orange/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            Planifier un direct
          </Link>
        </div>
      </div>

      {/* SALON VISIOCONFÉRENCE INSTITUTIONNELLE EN DIRECT SUR DASHBOARD */}
      {activeMeetingSession && (
        <div className="space-y-4 animate-in zoom-in-95">
          <div className="bg-[#2d1b4e] text-white rounded-3xl p-5 flex items-center justify-between shadow-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-400 animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  🔴 Visioconférence Institutionnelle en Direct
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {activeMeetingSession.title}
                </h3>
                <p className="text-xs text-white/60">
                  {activeMeetingSession.description || "Échange officiel avec l'équipe pédagogique et la direction"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveMeetingSession(null)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5 text-red-400" />
              Quitter la réunion
            </button>
          </div>

          <JitsiEmbed
            roomName={activeMeetingSession.room_name}
            displayName={teacherDisplayName}
            title={activeMeetingSession.title}
            isTeacher={true}
            onLeave={() => setActiveMeetingSession(null)}
          />
        </div>
      )}

      {/* BANNIÈRE EN PREMIER : RÉUNION / VISIOCONFÉRENCE EN DIRECT OU PROGRAMMÉE */}
      {!activeMeetingSession && meetings.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black shrink-0 shadow-inner">
              <Video className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full">
                  Visioconférence &amp; Conseil Pédagogique
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
              <p className="text-xs text-white/70 flex items-center gap-1.5 mt-0.5" suppressHydrationWarning>
                <Clock className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span suppressHydrationWarning>
                  Prévue le {new Date(meetings[0].start_time).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {new Date(meetings[0].start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {meetings[0].status === "live" ? (
              <button
                type="button"
                onClick={() => setActiveMeetingSession(meetings[0])}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-orange hover:bg-orange/90 text-white text-xs font-black shadow-lg shadow-orange/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
              >
                <Video className="w-4 h-4" />
                <span>🔴 Rejoindre le Direct 🎥</span>
              </button>
            ) : meetings[0].replay_url ? (
              <button
                type="button"
                onClick={() => setSelectedMeetingReplay(meetings[0])}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-turquoise hover:bg-turquoise/90 text-white text-xs font-black shadow-lg shadow-turquoise/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>🎬 Visionner le Replay Vidéo 🍿</span>
              </button>
            ) : (
              <Link
                href="/prof/planning"
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              >
                <span>Voir les détails</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Directs Prévus"
          value={directsCount}
          subtitle="Séances planifiées"
          icon={Calendar}
          color="turquoise"
          badge="Live"
        />
        <StatCard
          title="Devoirs à Corriger"
          value={devoirsCount}
          subtitle="Copies en attente"
          icon={FileCheck}
          color="orange"
          badge="Évaluation"
        />
        <StatCard
          title="Matières Assignées"
          value={assignedCount}
          subtitle="Groupes sous votre responsabilité"
          icon={GraduationCap}
          color="navy"
          badge="Pédagogie"
        />
      </div>

      {/* Mes Matières & Groupes Assignés */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-navy/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-navy flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-turquoise" />
            Mes Matières Assignées ({assignedCount})
          </h3>
        </div>

        {assignedCount === 0 ? (
          <div className="text-center py-6 text-xs text-navy/40 bg-blue-vlight/40 rounded-2xl p-4">
            Aucune matière ne vous a encore été assignée par l&apos;administrateur.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {assignedSubjects.map((item: any, idx: number) => {
              const sub = item.subjects;
              const cls = sub?.classes;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-blue-vlight/40 border border-navy/5 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-dark bg-teal-50 px-2 py-0.5 rounded-full">
                      {cls?.name || "Classe"}
                    </span>
                    <h4 className="font-bold text-navy text-sm mt-2">{sub?.name}</h4>
                  </div>
                  <div className="mt-3 text-[11px] text-navy/50">
                    {sub?.is_mandatory ? "Socle Obligatoire" : "Matière Optionnelle"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-turquoise/10 text-turquoise flex items-center justify-center mb-4">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy mb-2">Planning &amp; Cours en Direct</h3>
            <p className="text-sm text-navy/60 leading-relaxed mb-6">
              Démarrez votre classe virtuelle Jitsi Meet en 1 clic et effectuez l&apos;appel des présences en temps réel.
            </p>
          </div>
          <Link
            href="/prof/planning"
            className="inline-flex items-center gap-2 text-sm font-bold text-turquoise hover:text-turquoise/80 transition-colors"
          >
            Accéder au planning des cours <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange flex items-center justify-center mb-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy mb-2">Devoirs &amp; Notations</h3>
            <p className="text-sm text-navy/60 leading-relaxed mb-6">
              Publiez des exercices, consultez les copies rendues par les élèves, notez sur 20 et rédigez vos commentaires.
            </p>
          </div>
          <Link
            href="/prof/devoirs"
            className="inline-flex items-center gap-2 text-sm font-bold text-orange hover:text-orange/80 transition-colors"
          >
            Gérer et corriger les devoirs <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Modale Lecteur Replay Réunion pour le Professeur */}
      {selectedMeetingReplay && selectedMeetingReplay.replay_url && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Replay Visioconférence • Espace Enseignant
                </span>
                <h3 className="text-lg sm:text-xl font-black text-navy">{selectedMeetingReplay.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedMeetingReplay.description || "Enregistrement de la visioconférence officielle"}
                </p>
              </div>
              <button
                onClick={() => setSelectedMeetingReplay(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative w-full shadow-lg bg-black">
              <ReplayPlayer
                src={selectedMeetingReplay.replay_url}
                title={selectedMeetingReplay.title}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-navy/50">
                Vous pouvez revoir cette réunion à tout moment.
              </span>
              <button
                onClick={() => setSelectedMeetingReplay(null)}
                className="bg-navy text-white font-bold text-xs px-6 py-2.5 rounded-xl ml-auto hover:bg-navy/90 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
