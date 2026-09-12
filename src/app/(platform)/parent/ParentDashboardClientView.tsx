"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Award,
  FileCheck,
  MessageSquare,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  Video,
  PhoneOff,
} from "lucide-react";
import { ParentChildInfo, AdminMeeting } from "@/lib/types";
import ParentChildSelector from "@/components/platform/ParentChildSelector";
import JitsiEmbed from "@/components/platform/JitsiEmbed";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import { fetchChildPlanningAndAttendanceAction, fetchChildDevoirsAction, fetchChildNotesAction } from "./actions";

interface ParentDashboardClientViewProps {
  initialChildren: ParentChildInfo[];
  initialMeetings?: AdminMeeting[];
  parentProfile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
  };
}

export default function ParentDashboardClientView({
  initialChildren,
  initialMeetings = [],
  parentProfile,
}: ParentDashboardClientViewProps) {
  const [childrenList] = useState<ParentChildInfo[]>(initialChildren);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildren[0]?.id || ""
  );

  const [meetings] = useState<AdminMeeting[]>(initialMeetings);
  const [activeMeetingSession, setActiveMeetingSession] = useState<AdminMeeting | null>(null);
  const [selectedMeetingReplay, setSelectedMeetingReplay] = useState<AdminMeeting | null>(null);
  const [loadingChildData, setLoadingChildData] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [notesData, setNotesData] = useState<any>({ subjects: [], generalAverage: null });

  const parentDisplayName = `Parent (${parentProfile?.first_name || "Parent"} ${parentProfile?.last_name || ""})`.trim();

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  // Charger les données de l'enfant sélectionné
  useEffect(() => {
    if (!selectedChildId) return;

    let isMounted = true;
    setLoadingChildData(true);

    Promise.all([
      fetchChildPlanningAndAttendanceAction(selectedChildId),
      fetchChildDevoirsAction(selectedChildId),
      fetchChildNotesAction(selectedChildId),
    ])
      .then(([planningRes, devoirsRes, notesRes]) => {
        if (!isMounted) return;
        if (planningRes.success) setSessions(planningRes.sessions || []);
        if (devoirsRes.success) setAssignments(devoirsRes.assignments || []);
        if (notesRes.success) setNotesData(notesRes);
      })
      .finally(() => {
        if (isMounted) setLoadingChildData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);

  if (childrenList.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-navy/10 shadow-sm space-y-4 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-navy">Aucun élève rattaché</h2>
        <p className="text-xs sm:text-sm text-navy/60 leading-relaxed">
          Votre compte parent n&apos;est actuellement lié à aucun élève. Veuillez contacter l&apos;administration pour associer votre compte à votre ou vos enfant(s).
        </p>
      </div>
    );
  }

  const upcomingSessions = sessions.filter((s) => s.status !== "ended").slice(0, 3);
  const pendingAssignments = assignments.filter((a) => !a.submission).slice(0, 3);
  const gradedAssignments = assignments.filter((a) => a.submission && a.submission.grade !== null).slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header avec message de bienvenue et Sélecteur d'enfant */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Espace Suivi Parent
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Bonjour, {parentProfile?.first_name || "Parent"} 👋
          </h1>
          <p className="text-xs sm:text-sm text-navy/60">
            Suivi en direct de la scolarité, des cours et des évaluations de votre enfant.
          </p>
        </div>

        {/* Sélecteur d'Enfant Multi-Enfants */}
        <ParentChildSelector
          childrenList={childrenList}
          selectedChildId={selectedChildId}
          onSelectChild={(id) => setSelectedChildId(id)}
        />
      </div>

      {/* Visioconférence Active en Direct pour le Parent */}
      {activeMeetingSession && (
        <div className="space-y-4 animate-in zoom-in-95">
          <div className="bg-[#2d1b4e] text-white rounded-3xl p-5 flex items-center justify-between shadow-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-400 animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  🔴 Visioconférence Institutionnelle des Parents
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {activeMeetingSession.title}
                </h3>
                <p className="text-xs text-white/60">
                  {activeMeetingSession.description || "Échange en direct avec la direction et l'équipe pédagogique."}
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
            displayName={parentDisplayName}
            title={activeMeetingSession.title}
            isTeacher={false}
            onLeave={() => setActiveMeetingSession(null)}
          />
        </div>
      )}

      {/* Bannière Réunion en Direct ou Programmée */}
      {!activeMeetingSession && meetings.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black shrink-0 shadow-inner">
              <Video className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full">
                  Assemblée &amp; Visioconférence Parents
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
              <p className="text-xs text-white/70">
                Prévue le {new Date(meetings[0].start_time).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {new Date(meetings[0].start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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
                href="/parent/planning"
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              >
                <span>Voir les détails</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 2. Cartes Statistiques Clés pour l'enfant actif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taux de présence */}
        <div className="bg-white rounded-3xl p-5 border border-navy/5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/60">Assiduité & Présences</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-navy">{activeChild.attendance_rate || 100}%</span>
            <span className="text-xs text-emerald-600 font-bold">de présence</span>
          </div>
          <p className="text-[10px] text-navy/40">Cours en direct suivis avec assiduité</p>
        </div>

        {/* Moyenne Générale */}
        <div className="bg-white rounded-3xl p-5 border border-navy/5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/60">Moyenne Générale</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-navy">
              {notesData.generalAverage !== null ? `${notesData.generalAverage}/20` : "--/20"}
            </span>
          </div>
          <p className="text-[10px] text-navy/40">Basé sur les devoirs et évaluations notés</p>
        </div>

        {/* Devoirs en attente */}
        <div className="bg-white rounded-3xl p-5 border border-navy/5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/60">Travaux à Rendre</span>
            <div className="w-9 h-9 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-navy">{pendingAssignments.length}</span>
            <span className="text-xs text-navy/60 font-bold">devoirs en cours</span>
          </div>
          <p className="text-[10px] text-navy/40">À rendre avant la date limite</p>
        </div>

        {/* Prochains Directs */}
        <div className="bg-white rounded-3xl p-5 border border-navy/5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/60">Prochains Cours</span>
            <div className="w-9 h-9 rounded-xl bg-turquoise/10 text-teal-dark flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-navy">{upcomingSessions.length}</span>
            <span className="text-xs text-teal-dark font-bold">séances prévues</span>
          </div>
          <p className="text-[10px] text-navy/40">Emploi du temps de la semaine</p>
        </div>
      </div>

      {/* 3. Deux Colonnes : Prochains Cours & Devoirs Récents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : Prochains cours & Replays */}
        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-navy flex items-center gap-2">
              <Calendar className="w-4 h-4 text-turquoise" />
              <span>Prochains Cours & Directs ({activeChild.first_name})</span>
            </h3>
            <Link
              href="/parent/planning"
              className="text-xs font-bold text-teal-dark hover:underline flex items-center gap-1"
            >
              <span>Tout voir</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingChildData ? (
            <div className="py-8 text-center text-xs text-navy/40">Chargement de l&apos;emploi du temps...</div>
          ) : upcomingSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-navy/40 bg-blue-vlight/40 rounded-2xl">
              Aucun cours prévu prochainement pour {activeChild.first_name}.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((sess) => {
                const startDate = new Date(sess.start_time);
                const isLive = sess.status === "in_progress";

                return (
                  <div
                    key={sess.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isLive
                        ? "bg-orange/5 border-orange/20 shadow-xs"
                        : "bg-blue-vlight/30 border-navy/5"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-teal-dark bg-teal-50 px-2 py-0.5 rounded-full">
                          {sess.subject?.name}
                        </span>
                        {isLive && (
                          <span className="text-[10px] font-black text-white bg-orange px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> En Direct
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-navy truncate">{sess.title}</h4>
                      <p className="text-[11px] text-navy/50 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-turquoise" />
                        {startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à{" "}
                        {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <Link
                      href="/parent/planning"
                      className="px-3 py-2 rounded-xl bg-navy text-white text-xs font-bold shrink-0 hover:bg-navy/90 transition-colors"
                    >
                      Détails ➔
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne 2 : Devoirs & Travail */}
        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-navy flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-orange" />
              <span>Devoirs & Évaluations ({activeChild.first_name})</span>
            </h3>
            <Link
              href="/parent/devoirs"
              className="text-xs font-bold text-teal-dark hover:underline flex items-center gap-1"
            >
              <span>Tout voir</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingChildData ? (
            <div className="py-8 text-center text-xs text-navy/40">Chargement des devoirs...</div>
          ) : assignments.length === 0 ? (
            <div className="py-8 text-center text-xs text-navy/40 bg-blue-vlight/40 rounded-2xl">
              Aucun devoir actuellement pour {activeChild.first_name}.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.slice(0, 3).map((a) => {
                const isSubmitted = !!a.submission;
                const grade = a.submission?.grade;

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-blue-vlight/30 border border-navy/5 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        {a.subject_name}
                      </span>
                      <h4 className="text-xs font-bold text-navy truncate">{a.title}</h4>
                      <p className="text-[11px] text-navy/50 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange" />
                        Pour le {new Date(a.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {grade !== null && grade !== undefined ? (
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 font-black text-xs">
                          {grade}/20
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          ✓ Rendu
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold text-[10px]">
                          À faire
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Modale Lecteur Replay Réunion pour le Parent */}
      {selectedMeetingReplay && selectedMeetingReplay.replay_url && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Replay Visioconférence • Espace Parent
                </span>
                <h3 className="text-lg sm:text-xl font-black text-navy">{selectedMeetingReplay.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedMeetingReplay.description || "Enregistrement de la visioconférence des parents"}
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
                Vous pouvez revoir cette assemblée à tout moment.
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
