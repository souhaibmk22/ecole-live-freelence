"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Video,
  ChevronRight,
  Filter,
  PhoneOff,
  UserCheck,
  LayoutGrid,
  ListFilter,
  Award,
  Search,
  BookOpen,
} from "lucide-react";
import { ParentChildInfo, LiveSession, AdminMeeting } from "@/lib/types";
import ParentChildSelector from "@/components/platform/ParentChildSelector";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import JitsiEmbed from "@/components/platform/JitsiEmbed";
import { fetchChildPlanningAndAttendanceAction } from "../actions";

interface ParentPlanningClientViewProps {
  initialChildren: ParentChildInfo[];
  initialMeetings?: AdminMeeting[];
  parentProfile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
  };
}

export default function ParentPlanningClientView({
  initialChildren,
  initialMeetings = [],
  parentProfile,
}: ParentPlanningClientViewProps) {
  const [childrenList] = useState<ParentChildInfo[]>(initialChildren);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildren[0]?.id || ""
  );

  const [meetings, setMeetings] = useState<AdminMeeting[]>(initialMeetings);
  const [activeMeetingSession, setActiveMeetingSession] = useState<AdminMeeting | null>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [className, setClassName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "present" | "absences" | "replays" | "live">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReplaySession, setSelectedReplaySession] = useState<any | null>(null);

  const parentDisplayName = `Parent (${parentProfile?.first_name || "Parent"} ${parentProfile?.last_name || ""})`.trim();

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  useEffect(() => {
    if (!selectedChildId) return;

    let isMounted = true;
    setLoading(true);

    fetchChildPlanningAndAttendanceAction(selectedChildId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setSessions(res.sessions || []);
          setClassName(res.className || "Classe");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);

  // Calculs statistiques d'assiduité
  const endedSessions = sessions.filter((s) => s.status === "ended");
  const attendedSessionsCount = endedSessions.filter((s) => s.attendance?.present).length;
  const absentSessionsCount = endedSessions.filter((s) => s.attendance && !s.attendance.present).length;
  const attendanceRate =
    endedSessions.length > 0
      ? Math.round((attendedSessionsCount / endedSessions.length) * 100)
      : activeChild?.attendance_rate || 100;

  const filteredSessions = sessions.filter((s) => {
    // Filtre texte
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title?.toLowerCase().includes(q);
      const matchSub = s.subject?.name?.toLowerCase().includes(q);
      const matchProf = `${s.teacher?.first_name || ""} ${s.teacher?.last_name || ""}`.toLowerCase().includes(q);
      if (!matchTitle && !matchSub && !matchProf) return false;
    }

    // Filtre statut
    if (filter === "replays") return !!s.replay_url;
    if (filter === "live") return s.status === "in_progress";
    if (filter === "present") return s.attendance?.present;
    if (filter === "absences") return s.status === "ended" && s.attendance && !s.attendance.present;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header avec sélecteur d'enfant */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-turquoise" />
            Emploi du Temps, Présences &amp; Replays
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Planning &amp; Assiduité de {activeChild?.first_name || "votre enfant"}
          </h1>
          <p className="text-xs sm:text-sm text-navy/60">
            Consultez les cours passés, la feuille d&apos;émargement des présences et les replays vidéo enregistrés.
          </p>
        </div>

        <ParentChildSelector
          childrenList={childrenList}
          selectedChildId={selectedChildId}
          onSelectChild={(id) => setSelectedChildId(id)}
        />
      </div>

      {/* 📊 Cartes Statistiques d'Assiduité & Présences de l'enfant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taux d'assiduité */}
        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-xs space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-teal-dark">Taux d&apos;Assiduité</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              attendanceRate >= 90
                ? "bg-emerald-50 text-emerald-700"
                : attendanceRate >= 75
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
            }`}>
              {attendanceRate >= 90 ? "Excellent" : attendanceRate >= 75 ? "Régulier" : "Vigilance"}
            </span>
          </div>
          <div className="text-3xl font-black text-navy">{attendanceRate}%</div>
          <p className="text-[10px] text-navy/50">Taux de présence effectif en direct</p>
        </div>

        {/* Total cours délivrés */}
        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-xs space-y-1 hover:shadow-md transition-shadow">
          <span className="text-[11px] font-black uppercase text-navy/50">Cours Dispensés</span>
          <div className="text-3xl font-black text-navy">{endedSessions.length}</div>
          <p className="text-[10px] text-navy/50">Séances terminées dans la classe</p>
        </div>

        {/* Cours suivis (présent) */}
        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-xs space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-700">Présences Validées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{attendedSessionsCount}</div>
          <p className="text-[10px] text-navy/50">Séances suivies avec émargement</p>
        </div>

        {/* Absences */}
        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-xs space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-red-700">Absences Relevées</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-black text-red-600">{absentSessionsCount}</div>
          <p className="text-[10px] text-navy/50">
            {absentSessionsCount === 0 ? "Aucune absence enregistrée" : "Rattrapage possible en Replay"}
          </p>
        </div>
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

      {/* Bloc Réunions & Assemblées des Parents */}
      {!activeMeetingSession && meetings.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50/40 to-purple-50 rounded-3xl p-5 sm:p-6 border border-purple-200/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-sm">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-navy">
                  Visioconférences &amp; Assemblées des Parents
                </h2>
                <p className="text-xs text-navy/60">
                  Participez aux réunions d&apos;information et aux échanges avec la direction.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
              {meetings.length} Réunion{meetings.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {meetings.map((m) => {
              const startDate = new Date(m.start_time);
              const isLive = m.status === "live";
              const isEnded = m.status === "ended";

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        {m.class?.name || "Tous les Parents"}
                      </span>
                      {isLive ? (
                        <span className="text-[10px] font-black uppercase text-white bg-orange px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> EN DIRECT
                        </span>
                      ) : isEnded ? (
                        <span className="text-[10px] font-bold text-navy/50 bg-navy/5 px-2 py-0.5 rounded-full">
                          Terminée
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                          Programmée
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-navy text-sm sm:text-base">{m.title}</h4>
                    {m.description && (
                      <p className="text-xs text-navy/60 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-navy/60 pt-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>
                        {startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à{" "}
                        {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-navy/5">
                    {isLive ? (
                      <button
                        type="button"
                        onClick={() => setActiveMeetingSession(m)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                      >
                        <Video className="w-4 h-4" />
                        <span>🔴 Rejoindre la Réunion en Direct 🎥</span>
                      </button>
                    ) : m.replay_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReplaySession({
                            id: m.id,
                            title: m.title,
                            replay_url: m.replay_url,
                            subject: {
                              name: "Visioconférence & Assemblée",
                              class_name: m.class?.name || "Parents",
                            },
                          })
                        }
                        className="w-full py-2.5 rounded-xl bg-turquoise hover:bg-turquoise/90 text-white text-xs font-black shadow-md shadow-turquoise/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Visionner le Replay Vidéo 🍿</span>
                      </button>
                    ) : isEnded ? (
                      <div className="text-center text-[11px] text-navy/40 py-2 bg-navy/5 rounded-xl">
                        Réunion terminée • Enregistrement en cours
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveMeetingSession(m)}
                        className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Accéder au salon de réunion</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🧭 Barre de Filtres & Bascule de Vue (Cartes / Feuille d'Émargement) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-navy/5 shadow-xs">
        {/* Filtres par statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filter === "all"
                ? "bg-navy text-white shadow-xs"
                : "bg-blue-vlight/50 text-navy/60 hover:bg-navy/5"
            }`}
          >
            Tous ({sessions.length})
          </button>
          <button
            onClick={() => setFilter("present")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              filter === "present"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Présent ({attendedSessionsCount})</span>
          </button>
          <button
            onClick={() => setFilter("absences")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              filter === "absences"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Absences ({absentSessionsCount})</span>
          </button>
          <button
            onClick={() => setFilter("replays")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              filter === "replays"
                ? "bg-turquoise text-white shadow-xs"
                : "bg-turquoise/10 text-teal-dark hover:bg-turquoise/20"
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Replays ({sessions.filter((s) => s.replay_url).length})</span>
          </button>
          <button
            onClick={() => setFilter("live")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              filter === "live"
                ? "bg-orange text-white shadow-xs"
                : "bg-orange/10 text-orange hover:bg-orange/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange animate-ping" />
            <span>En Direct ({sessions.filter((s) => s.status === "in_progress").length})</span>
          </button>
        </div>

        {/* Bascule de Mode d'Affichage : Cartes vs Feuille d'Émargement */}
        <div className="flex items-center gap-1.5 shrink-0 bg-blue-vlight/60 p-1 rounded-xl border border-navy/5">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "cards"
                ? "bg-white text-navy shadow-xs font-black"
                : "text-navy/50 hover:text-navy"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Vue Cartes</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-navy shadow-xs font-black"
                : "text-navy/50 hover:text-navy"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-teal-dark" />
            <span>Feuille d&apos;Émargement</span>
          </button>
        </div>
      </div>

      {/* 📋 SECTION PRINCIPALE : VUE FEUILLE D'ÉMARGEMENT OU CARTES */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-xs text-navy/40 border border-navy/5">
          Chargement de l&apos;emploi du temps et des présences...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-2">
          <Calendar className="w-10 h-10 text-navy/30 mx-auto" />
          <h3 className="text-sm font-bold text-navy">Aucun cours trouvé dans cette catégorie</h3>
          <p className="text-xs text-navy/50">Modifiez les filtres pour voir les autres cours.</p>
        </div>
      ) : viewMode === "table" ? (
        /* VUE FEUILLE D'ÉMARGEMENT DÉTAILLÉE */
        <div className="bg-white rounded-3xl border border-navy/5 shadow-sm overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-navy/5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-dark" />
              <h3 className="font-black text-navy text-sm uppercase tracking-wider">
                Feuille d&apos;Émargement Individuelle ({activeChild.first_name})
              </h3>
            </div>
            <span className="text-xs text-navy/50 font-bold">
              {filteredSessions.length} séance(s) répertoriée(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-blue-vlight/50 border-b border-navy/5 text-[10px] font-black uppercase text-navy/50">
                <tr>
                  <th className="py-3 px-4">Séance &amp; Matière</th>
                  <th className="py-3 px-4">Date &amp; Horaire</th>
                  <th className="py-3 px-4">Professeur</th>
                  <th className="py-3 px-4">Statut d&apos;Émargement</th>
                  <th className="py-3 px-4 text-right">Replay Vidéo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filteredSessions.map((sess) => {
                  const startDate = new Date(sess.start_time);
                  const isEnded = sess.status === "ended";
                  const isLive = sess.status === "in_progress";
                  const isPresent = sess.attendance?.present;

                  return (
                    <tr key={sess.id} className="hover:bg-blue-vlight/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy">{sess.title}</div>
                        <div className="text-[10px] text-teal-dark font-black uppercase">
                          {sess.subject?.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-navy/70 font-medium whitespace-nowrap">
                        {startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}{" "}
                        à {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4 text-navy/80 font-medium">
                        {sess.teacher?.first_name} {sess.teacher?.last_name}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 font-bold text-white bg-orange px-2.5 py-0.5 rounded-full text-[10px] animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> En Direct
                          </span>
                        ) : isPresent ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Présent(e)
                          </span>
                        ) : isEnded ? (
                          <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-red-600" /> Absent(e)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full text-[10px]">
                            ⏳ Programmé
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {sess.replay_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReplaySession(sess)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-turquoise/15 hover:bg-turquoise text-teal-dark hover:text-white font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Replay</span>
                          </button>
                        ) : (
                          <span className="text-navy/30 text-[10px] italic">Non dispo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VUE CARTES DE COURS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((sess) => {
            const startDate = new Date(sess.start_time);
            const endDate = new Date(sess.end_time);
            const isLive = sess.status === "in_progress";
            const isEnded = sess.status === "ended";
            const hasAttendance = sess.attendance !== null && sess.attendance !== undefined;
            const isPresent = sess.attendance?.present;

            return (
              <div
                key={sess.id}
                className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                      {sess.subject?.name}
                    </span>

                    {/* Statut du cours */}
                    {isLive ? (
                      <span className="text-[10px] font-black text-white bg-orange px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> En Direct
                      </span>
                    ) : isEnded ? (
                      <span className="text-[10px] font-bold text-navy/60 bg-navy/5 px-2.5 py-0.5 rounded-full">
                        Terminé
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-teal-dark bg-turquoise/15 px-2.5 py-0.5 rounded-full">
                        Programmé
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-navy text-base mb-2">{sess.title}</h4>

                  <div className="space-y-1.5 text-xs text-navy/60">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-navy/40" />
                      <span>Prof : <strong className="text-navy">{sess.teacher?.first_name} {sess.teacher?.last_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-turquoise" />
                      <span>
                        {startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} •{" "}
                        {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {" — "}
                        {endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Message de confidentialité pour les cours élèves en direct */}
                  {isLive && (
                    <div className="mt-3 p-3 bg-amber-50/90 rounded-2xl border border-amber-200/60 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Cours en direct réservé aux élèves</span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 leading-relaxed">
                        Pour préserver la dynamique de classe et la vie privée des élèves, le flux direct est réservé aux élèves. Le Replay sera accessible dès la fin du cours.
                      </p>
                    </div>
                  )}

                  {/* Statut de présence de l'enfant */}
                  {isEnded && (
                    <div className="mt-4 pt-3 border-t border-navy/5 flex items-center justify-between">
                      <span className="text-[11px] text-navy/50 font-bold">Présence enfant :</span>
                      {hasAttendance ? (
                        isPresent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Présent(e)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" /> Absent(e)
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-navy/40 italic">Non émargé</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bouton Replay Vidéo */}
                <div className="mt-5 pt-3 border-t border-navy/5">
                  {sess.replay_url ? (
                    <button
                      type="button"
                      onClick={() => setSelectedReplaySession(sess)}
                      className="w-full py-2.5 rounded-xl bg-turquoise hover:bg-turquoise/90 text-white text-xs font-bold shadow-md shadow-turquoise/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Visionner le Replay Vidéo</span>
                    </button>
                  ) : isLive ? (
                    <div className="text-center text-[11px] font-bold text-orange py-2.5 bg-orange/10 rounded-xl flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange animate-ping" />
                      <span>Cours en cours • Replay disponible après</span>
                    </div>
                  ) : (
                    <div className="text-center text-[11px] text-navy/40 py-2 bg-blue-vlight/50 rounded-xl">
                      {isEnded ? "Replay non disponible" : "Séance à venir"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale Lecteur Replay Vidéo */}
      {selectedReplaySession && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Replay Vidéo de Cours • Espace Parent
                </span>
                <h3 className="text-lg sm:text-xl font-black text-navy">{selectedReplaySession.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedReplaySession.subject?.name} • {selectedReplaySession.subject?.class_name || className}
                </p>
              </div>
              <button
                onClick={() => setSelectedReplaySession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative w-full shadow-lg bg-black">
              <ReplayPlayer
                src={selectedReplaySession.replay_url}
                title={`${selectedReplaySession.subject?.name} • ${selectedReplaySession.title}`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-navy/50">
                Vous pouvez revoir ce cours avec votre enfant pour ses révisions.
              </span>
              <button
                onClick={() => setSelectedReplaySession(null)}
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
