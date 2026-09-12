"use client";

import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  Play,
  AlertCircle,
  CheckCircle2,
  PhoneOff,
} from "lucide-react";
import { LiveSession, Profile } from "@/lib/types";
import JitsiEmbed from "@/components/platform/JitsiEmbed";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import { markStudentAutoPresentAction, fetchStudentLiveSessionsAction } from "@/app/(platform)/prof/planning/actions";
import { createClient } from "@/lib/supabase/client";

interface EtudiantPlanningClientViewProps {
  student: Profile;
  initialSessions: LiveSession[];
  hasEnrolledClass: boolean;
}

export default function EtudiantPlanningClientView({
  student,
  initialSessions,
  hasEnrolledClass,
}: EtudiantPlanningClientViewProps) {
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions);
  const [joinedSession, setJoinedSession] = useState<LiveSession | null>(null);
  const [selectedReplaySession, setSelectedReplaySession] = useState<LiveSession | null>(null);

  const studentFullName = student.first_name && student.last_name
    ? `${student.first_name} ${student.last_name}`
    : student.email || "Élève";

  // Synchronisation Realtime des cours en direct (Zéro Polling continu)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const uniqueChannelName = `student_live_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => {
          fetchStudentLiveSessionsAction().then((res) => {
            if (res.success && res.data) setSessions(res.data);
          });
        }
      )
      .subscribe();

    const handleOnline = () => {
      fetchStudentLiveSessionsAction().then((res) => {
        if (res.success && res.data) setSessions(res.data);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now();
      } else if (document.visibilityState === "visible") {
        // Revalider uniquement si l'onglet était inactif depuis plus de 2 minutes
        if (Date.now() - hiddenSince > 120000) {
          fetchStudentLiveSessionsAction().then((res) => {
            if (res.success && res.data) setSessions(res.data);
          });
        }
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleJoinSession = (sess: LiveSession) => {
    setJoinedSession(sess);
    // Inscription automatique de présence en base de données
    markStudentAutoPresentAction(sess.id);
  };

  const [activeTab, setActiveTab] = useState<"schedule" | "replays">("schedule");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  const replaysList = sessions.filter((s) => !!s.replay_url);

  // Matières uniques pour les filtres
  const uniqueSubjects = Array.from(
    new Set(replaysList.map((s) => s.subject?.name).filter(Boolean))
  ) as string[];

  const filteredReplays = replaysList.filter((s) => {
    if (selectedSubjectFilter === "all") return true;
    return s.subject?.name === selectedSubjectFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-sky-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Video className="w-3.5 h-3.5" />
            Classe Virtuelle en Ligne
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Planning &amp; Cours en Direct
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Rejoignez vos cours en direct avec vos professeurs et révisez grâce aux replays vidéos.
          </p>
        </div>

        {/* Tabs switcher */}
        {!joinedSession && (
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-navy/5 shadow-sm self-start md:self-auto">
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-navy text-white shadow-sm"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              📅 Emploi du Temps &amp; Directs
            </button>
            <button
              onClick={() => setActiveTab("replays")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "replays"
                  ? "bg-turquoise text-white shadow-sm"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              🎬 Replays Vidéos ({replaysList.length})
            </button>
          </div>
        )}
      </div>

      {/* SALLE DE COURS LIVE REJOINTE (JITSI EMBED) */}
      {joinedSession && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange to-amber-500 text-white rounded-3xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
                  En Direct Maintenant
                </span>
                <h3 className="text-lg font-black text-white">
                  {joinedSession.subject?.name} — {joinedSession.title}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setJoinedSession(null)}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Quitter la classe
            </button>
          </div>

          <JitsiEmbed
            roomName={joinedSession.room_name}
            displayName={studentFullName}
            title={`${joinedSession.subject?.name} • ${joinedSession.title}`}
            isTeacher={false}
            onLeave={() => setJoinedSession(null)}
          />
        </div>
      )}

      {/* TAB 2 : MÉDIATHÈQUE DES REPLAYS */}
      {!joinedSession && activeTab === "replays" && (
        <div className="space-y-6">
          {/* Subject Filter Tabs */}
          {uniqueSubjects.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedSubjectFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === "all"
                    ? "bg-navy text-white"
                    : "bg-white text-navy/70 hover:bg-navy/5 border border-navy/5"
                }`}
              >
                Toutes les matières ({replaysList.length})
              </button>
              {uniqueSubjects.map((subName) => (
                <button
                  key={subName}
                  onClick={() => setSelectedSubjectFilter(subName)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedSubjectFilter === subName
                      ? "bg-turquoise text-white"
                      : "bg-white text-navy/70 hover:bg-navy/5 border border-navy/5"
                  }`}
                >
                  {subName} ({replaysList.filter((s) => s.subject?.name === subName).length})
                </button>
              ))}
            </div>
          )}

          {filteredReplays.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-turquoise/10 text-turquoise flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-navy">Aucun replay disponible</h3>
              <p className="text-sm text-navy/60 max-w-md mx-auto">
                Les enregistrements vidéo des cours apparaîtront ici dès que vos professeurs les auront publiés.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReplays.map((sess) => {
                const startDateObj = new Date(sess.start_time);
                const teacherName = sess.teacher
                  ? `${sess.teacher.first_name} ${sess.teacher.last_name}`
                  : "Professeur";

                return (
                  <div
                    key={sess.id}
                    className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                          {sess.subject?.name}
                        </span>

                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-turquoise/15 text-teal-dark flex items-center gap-1">
                          <Play className="w-3 h-3 fill-turquoise" /> Vidéo HD
                        </span>
                      </div>

                      <h4 className="font-bold text-navy text-base mb-2">{sess.title}</h4>

                      <div className="space-y-1.5 text-xs text-navy/60">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-navy/40" />
                          <span>Prof : <strong className="text-navy">{teacherName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-orange" />
                          <span>
                            {startDateObj.toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-navy/5">
                      <button
                        onClick={() => setSelectedReplaySession(sess)}
                        className="w-full bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-turquoise/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Visionner le Replay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1 : EMPLOI DU TEMPS & DIRECTS */}
      {!joinedSession && activeTab === "schedule" && (
        <div className="space-y-6">
          {!hasEnrolledClass ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-navy/5 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-navy">Pas encore de classe assignée</h3>
              <p className="text-xs text-navy/60 max-w-md mx-auto">
                L&apos;administrateur de l&apos;école va bientôt vous inscrire dans votre groupe. Vos cours apparaîtront ici automatiquement dès qu&apos;ils seront planifiés.
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-turquoise/10 text-turquoise flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-navy">Aucun cours planifié pour le moment</h3>
              <p className="text-sm text-navy/60 max-w-md mx-auto">
                Vos professeurs n&apos;ont pas encore programmé de séance en direct. Revenez bientôt pour découvrir votre emploi du temps.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((sess) => {
                const startDateObj = new Date(sess.start_time);
                const endDateObj = new Date(sess.end_time);
                const isLive = sess.status === "live";
                const isEnded = sess.status === "ended";
                const teacherName = sess.teacher
                  ? `${sess.teacher.first_name} ${sess.teacher.last_name}`
                  : "Professeur";

                return (
                  <div
                    key={sess.id}
                    className={`rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${
                      isLive
                        ? "bg-white border-orange shadow-xl shadow-orange/15"
                        : "bg-white border-navy/5 shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                          {sess.subject?.name}
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isLive
                              ? "bg-orange text-white animate-pulse"
                              : isEnded
                              ? "bg-navy/5 text-navy/40"
                              : "bg-blue-100 text-sky-800"
                          }`}
                        >
                          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                          {isLive ? "En direct" : isEnded ? "Terminé" : "Programmé"}
                        </span>
                      </div>

                      <h4 className="font-bold text-navy text-base mb-2">{sess.title}</h4>

                      <div className="space-y-1.5 text-xs text-navy/60">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-navy/40" />
                          <span>Prof : <strong className="text-navy">{teacherName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-orange" />
                          <span>
                            {startDateObj.toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-turquoise" />
                          <span>
                            {startDateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {" — "}
                            {endDateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-navy/5 space-y-2">
                      {isLive ? (
                        <button
                          onClick={() => handleJoinSession(sess)}
                          className="w-full bg-orange hover:bg-orange/90 text-white font-black text-xs py-3.5 rounded-xl shadow-lg shadow-orange/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          Rejoindre le direct maintenant !
                        </button>
                      ) : sess.replay_url ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => setSelectedReplaySession(sess)}
                            className="w-full bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-turquoise/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            🎬 Visionner le Replay Vidéo
                          </button>
                          <div className="text-[10px] text-center font-bold text-teal-dark flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-turquoise" /> Enregistrement disponible
                          </div>
                        </div>
                      ) : isEnded ? (
                        <div className="w-full text-center text-xs text-navy/40 font-bold py-2.5 bg-blue-vlight rounded-xl">
                          Séance terminée
                        </div>
                      ) : (
                        <div className="w-full text-center text-xs text-navy/50 font-bold py-2.5 bg-blue-vlight rounded-xl flex items-center justify-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-turquoise" />
                          Démarre à {startDateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE : Lecteur Replay Vidéo pour l'élève */}
      {selectedReplaySession && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Replay Vidéo de Cours
                </span>
                <h3 className="text-lg sm:text-xl font-black text-navy">{selectedReplaySession.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedReplaySession.subject?.name} • {selectedReplaySession.subject?.class_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReplaySession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative w-full shadow-lg bg-black">
              {selectedReplaySession.replay_url ? (
                <ReplayPlayer
                  src={selectedReplaySession.replay_url}
                  title={`${selectedReplaySession.subject?.name} • ${selectedReplaySession.title}`}
                />
              ) : (
                <div className="text-center p-6 text-white text-xs bg-navy w-full h-full flex items-center justify-center">
                  Replay non disponible pour le moment.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              {selectedReplaySession.replay_url && (
                <a
                  href={selectedReplaySession.replay_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-teal-dark hover:underline flex items-center gap-1.5 bg-turquoise/10 px-3 py-2 rounded-xl"
                >
                  <Sparkles className="w-3.5 h-3.5 text-turquoise" />
                  Ouvrir le fichier direct ➔
                </a>
              )}
              <button
                onClick={() => setSelectedReplaySession(null)}
                className="bg-navy text-white font-bold text-xs px-6 py-2.5 rounded-xl ml-auto hover:bg-navy/90 transition-colors"
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
