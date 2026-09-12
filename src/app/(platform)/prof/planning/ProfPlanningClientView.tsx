"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Play,
  PhoneOff,
  Sparkles,
  BookOpen,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { LiveSession, SubjectItem, Profile, AdminMeeting } from "@/lib/types";
import JitsiEmbed, { JitsiEmbedHandle } from "@/components/platform/JitsiEmbed";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import { createClient } from "@/lib/supabase/client";
import {
  createLiveSessionAction,
  updateSessionStatusAction,
  saveAttendanceAction,
  fetchLiveAttendanceAction,
  attachReplayUrlAction,
  getReplayUploadUrlAction,
  uploadReplayFileAction,
  fetchTeacherLiveSessionsAction,
} from "./actions";

interface ProfPlanningClientViewProps {
  teacher: Profile;
  assignedSubjects: SubjectItem[];
  initialSessions: LiveSession[];
  initialMeetings?: AdminMeeting[];
}

export default function ProfPlanningClientView({
  teacher,
  assignedSubjects,
  initialSessions,
  initialMeetings = [],
}: ProfPlanningClientViewProps) {
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions);
  const [meetings, setMeetings] = useState<AdminMeeting[]>(initialMeetings);
  const [activeLiveSession, setActiveLiveSession] = useState<LiveSession | null>(
    sessions.find((s) => s.status === "live") || null
  );
  const [activeMeetingSession, setActiveMeetingSession] = useState<AdminMeeting | null>(null);
  const [selectedMeetingReplay, setSelectedMeetingReplay] = useState<AdminMeeting | null>(null);

  // Modale de planification
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    assignedSubjects.length > 0 ? assignedSubjects[0].id : ""
  );
  const [title, setTitle] = useState("Séance 1 : Découverte & Fondations");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  // Feuille d'émargement locale
  const [liveStudentsList, setLiveStudentsList] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSavedSuccess, setAttendanceSavedSuccess] = useState(false);
  const [endingLive, setEndingLive] = useState(false);
  const [endingStep, setEndingStep] = useState("");
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [endLiveToast, setEndLiveToast] = useState<string | null>(null);

  const jitsiRef = useRef<JitsiEmbedHandle>(null);

  // Modale Replay
  const [replayModalSession, setReplayModalSession] = useState<LiveSession | null>(null);
  const [selectedPreviewReplaySession, setSelectedPreviewReplaySession] = useState<LiveSession | null>(null);
  const [replayVideoFile, setReplayVideoFile] = useState<File | null>(null);
  const [replayUrlInput, setReplayUrlInput] = useState("");
  const [uploadingReplay, setUploadingReplay] = useState(false);
  const [replaySuccess, setReplaySuccess] = useState(false);

  // Synchronisation Realtime des cours (Zéro Polling continu)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const uniqueChannelName = `teacher_live_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => {
          fetchTeacherLiveSessionsAction().then((res) => {
            if (res.success && res.data) setSessions(res.data);
          });
        }
      )
      .subscribe();

    const handleOnline = () => {
      fetchTeacherLiveSessionsAction().then((res) => {
        if (res.success && res.data) setSessions(res.data);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now();
      } else if (document.visibilityState === "visible") {
        // Revalider uniquement si l'onglet était inactif depuis plus de 2 minutes
        if (Date.now() - hiddenSince > 120000) {
          fetchTeacherLiveSessionsAction().then((res) => {
            if (res.success && res.data) setSessions(res.data);
          });
        }
      }
    };

    const handleReplayUploaded = (e: any) => {
      const { sessionId, replayUrl } = e.detail || {};
      if (sessionId && replayUrl) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, replay_url: replayUrl, status: "ended" as const }
              : s
          )
        );
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("live:replay_uploaded", handleReplayUploaded);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("live:replay_uploaded", handleReplayUploaded);
    };
  }, []);

  // Synchronisation Realtime des présences dès qu'un élève se connecte (Realtime sans polling agressif)
  useEffect(() => {
    if (!activeLiveSession) return;

    // Récupérer immédiatement dès l'ouverture du live
    fetchLiveAttendanceAction(activeLiveSession.id).then((res) => {
      if (res.success && res.data) {
        setLiveStudentsList(res.data);
        const syncMap: Record<string, boolean> = {};
        res.data.forEach((item) => {
          syncMap[item.student_id] = item.present;
        });
        setAttendanceState((prev) => ({ ...prev, ...syncMap }));
      }
    });

    const supabase = createClient();
    const attendanceChannel = supabase
      .channel(`live_attendance_${activeLiveSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_attendance",
          filter: `session_id=eq.${activeLiveSession.id}`,
        },
        () => {
          fetchLiveAttendanceAction(activeLiveSession.id).then((res) => {
            if (res.success && res.data) {
              setLiveStudentsList(res.data);
              const syncMap: Record<string, boolean> = {};
              res.data.forEach((item) => {
                syncMap[item.student_id] = item.present;
              });
              setAttendanceState((prev) => ({ ...prev, ...syncMap }));
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
    };
  }, [activeLiveSession]);

  const teacherFullName = teacher.first_name && teacher.last_name
    ? `${teacher.first_name} ${teacher.last_name}`
    : teacher.email || "Professeur";

  // 1. Planifier une séance
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !title.trim()) return;

    setCreating(true);
    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${startDate}T${endTime}:00`).toISOString();

    const res = await createLiveSessionAction({
      subjectId: selectedSubjectId,
      title,
      startTime: startIso,
      endTime: endIso,
    });

    if (res.success && res.data) {
      const selectedSubject = assignedSubjects.find((s) => s.id === selectedSubjectId);
      const newSess: LiveSession = {
        id: res.data.id,
        subject_id: res.data.subject_id,
        teacher_id: res.data.teacher_id,
        title: res.data.title,
        start_time: res.data.start_time,
        end_time: res.data.end_time,
        room_name: res.data.room_name,
        status: res.data.status,
        created_at: res.data.created_at,
        subject: {
          id: selectedSubject?.id || "",
          name: selectedSubject?.name || "",
          class_id: "",
          is_mandatory: true,
          created_at: "",
          class_name: selectedSubject?.class_name,
        },
        attendance: [],
      };

      setSessions([newSess, ...sessions]);
      setCreateModalOpen(false);
      window.location.reload();
    }
    setCreating(false);
  };

  // 2. Démarrer le cours en direct avec indicateur de chargement
  const handleStartLive = async (session: LiveSession) => {
    setStartingSessionId(session.id);
    try {
      const res = await fetchLiveAttendanceAction(session.id);
      if (res.success && res.data) {
        setLiveStudentsList(res.data);
        const initialAtt: Record<string, boolean> = {};
        res.data.forEach((a) => {
          initialAtt[a.student_id] = a.present;
        });
        setAttendanceState(initialAtt);
      }

      await updateSessionStatusAction(session.id, "live");
      const updated = { ...session, status: "live" as const };
      setActiveLiveSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    } catch (err) {
      console.error("Error starting live:", err);
    } finally {
      setStartingSessionId(null);
    }
  };

  // 3. Terminer le cours en direct (Méthode SÉCURISÉE avec Timeout Anti-Blocage)
  const handleEndLive = async (sessionId: string) => {
    setEndingLive(true);
    setEndingStep("1/2 Finalisation & envoi du Replay vidéo...");

    try {
      let uploadedReplayUrl: string | null = null;
      if (jitsiRef.current && jitsiRef.current.isRecording()) {
        const stopPromise = jitsiRef.current.stopRecording();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000));
        uploadedReplayUrl = await Promise.race([stopPromise, timeoutPromise]);
      }

      setEndingStep("2/2 Validation définitive de l'émargement...");
      const list = Object.entries(attendanceState).map(([studentId, present]) => ({
        studentId,
        present,
      }));
      if (list.length > 0) {
        await saveAttendanceAction({ sessionId, attendanceList: list }).catch(() => {});
      }

      await updateSessionStatusAction(sessionId, "ended").catch(() => {});

      setActiveLiveSession(null);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: "ended" as const,
                replay_url: uploadedReplayUrl || s.replay_url,
              }
            : s
        )
      );

      setEndLiveToast(
        uploadedReplayUrl
          ? "✓ Séance terminée avec succès ! Replay vidéo envoyé et disponible pour les élèves."
          : "✓ Séance terminée avec succès ! Feuille d'émargement enregistrée."
      );
      setTimeout(() => setEndLiveToast(null), 5000);
    } catch (err) {
      console.error("Error ending live session:", err);
      setActiveLiveSession(null);
    } finally {
      setEndingLive(false);
      setEndingStep("");
    }
  };

  // 4. Enregistrer l'appel (présences)
  const handleSaveAttendance = async (sessionId: string) => {
    setSavingAttendance(true);
    setAttendanceSavedSuccess(false);

    const list = Object.entries(attendanceState).map(([studentId, present]) => ({
      studentId,
      present,
    }));

    await saveAttendanceAction({ sessionId, attendanceList: list });
    setSavingAttendance(false);
    setAttendanceSavedSuccess(true);
    setTimeout(() => setAttendanceSavedSuccess(false), 3000);
  };

  // Basculer la présence d'un élève
  const toggleStudentPresence = (studentId: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // 5. Publier ou mettre à jour le replay vidéo
  const handlePublishReplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replayModalSession) return;
    setUploadingReplay(true);

    if (replayVideoFile) {
      try {
        const formData = new FormData();
        formData.append("file", replayVideoFile);
        formData.append("sessionId", replayModalSession.id);

        const apiRes = await fetch("/api/replays/upload", {
          method: "POST",
          body: formData,
        });

        const apiData = await apiRes.json();

        if (apiRes.ok && apiData.success && apiData.replayUrl) {
          setSessions(
            sessions.map((s) =>
              s.id === replayModalSession.id
                ? { ...s, replay_url: apiData.replayUrl, status: "ended" as const }
                : s
            )
          );
          setReplaySuccess(true);
          setTimeout(() => {
            setReplayModalSession(null);
            setReplaySuccess(false);
            setReplayVideoFile(null);
            setReplayUrlInput("");
          }, 1500);
          return;
        }

        // Fallback signed URL
        const fileExt = replayVideoFile.name.split(".").pop() || "webm";
        const urlRes = await getReplayUploadUrlAction(replayModalSession.id, fileExt);
        if (!urlRes.success || !urlRes.publicUrl) {
          alert(`Erreur: ${apiData.error || urlRes.error || "Échec du téléversement"}`);
          setUploadingReplay(false);
          return;
        }

        const supabase = createClient();
        let uploadError: any = null;

        if (urlRes.token && urlRes.path) {
          const { error } = await supabase.storage
            .from("course-replays")
            .uploadToSignedUrl(urlRes.path, urlRes.token, replayVideoFile, {
              contentType: replayVideoFile.type || "video/webm",
              upsert: true,
            });
          uploadError = error;
        } else {
          const { error } = await supabase.storage
            .from("course-replays")
            .upload(urlRes.fileName, replayVideoFile, {
              contentType: replayVideoFile.type || "video/webm",
              upsert: true,
            });
          uploadError = error;
        }

        if (uploadError) {
          alert(`Erreur de stockage: ${uploadError.message}`);
          setUploadingReplay(false);
          return;
        }

        const attachRes = await attachReplayUrlAction({
          sessionId: replayModalSession.id,
          replayUrl: urlRes.publicUrl,
        });

        if (attachRes.success) {
          setSessions(
            sessions.map((s) =>
              s.id === replayModalSession.id
                ? { ...s, replay_url: urlRes.publicUrl, status: "ended" as const }
                : s
            )
          );
          setReplaySuccess(true);
          setTimeout(() => {
            setReplayModalSession(null);
            setReplaySuccess(false);
            setReplayVideoFile(null);
            setReplayUrlInput("");
          }, 1500);
        } else {
          alert(`Erreur d'association: ${attachRes.error}`);
        }
      } catch (err: any) {
        alert(`Erreur: ${err?.message || "Erreur de téléversement"}`);
      } finally {
        setUploadingReplay(false);
      }
    } else if (replayUrlInput.trim()) {
      const res = await attachReplayUrlAction({
        sessionId: replayModalSession.id,
        replayUrl: replayUrlInput,
      });
      if (res.success) {
        setSessions(
          sessions.map((s) =>
            s.id === replayModalSession.id ? { ...s, replay_url: replayUrlInput } : s
          )
        );
        setReplaySuccess(true);
        setTimeout(() => {
          setReplayModalSession(null);
          setReplaySuccess(false);
          setReplayUrlInput("");
        }, 1500);
      }
    }
    setUploadingReplay(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark text-xs font-bold uppercase tracking-wider mb-2">
            <Video className="w-3.5 h-3.5" />
            Classe Virtuelle en Direct
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Planning &amp; Cours en Direct
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Lancez vos visioconférences Jitsi Meet et effectuez l&apos;appel des présences en temps réel.
          </p>
        </div>

        {!activeLiveSession && (
          <button
            onClick={() => setCreateModalOpen(true)}
            disabled={assignedSubjects.length === 0}
            className="bg-orange hover:bg-orange/90 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-orange/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            Planifier un direct
          </button>
        )}
      </div>

      {/* MODE LIVE ACTIF (ÉCRAN DE CLASSE VIRTUELLE & ÉMARGEMENT) */}
      {activeLiveSession && (
        <div className="space-y-6">
          <div className="bg-orange/10 border-2 border-orange/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-orange animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Séance en Direct en Cours
                </span>
                <h3 className="text-lg font-black text-navy">
                  {activeLiveSession.title} — {activeLiveSession.subject?.name} ({activeLiveSession.subject?.class_name})
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveLiveSession(null)}
                disabled={endingLive}
                className="bg-white hover:bg-navy/5 text-navy font-bold text-xs px-4 py-2.5 rounded-xl border border-navy/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                Masquer la vidéo
              </button>
              <button
                onClick={() => handleEndLive(activeLiveSession.id)}
                disabled={endingLive}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-red-600/20 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {endingLive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{endingStep || "Clôture en cours..."}</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-4 h-4" />
                    <span>Terminer la séance</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {endLiveToast && (
            <div className="p-4 bg-teal-50 border border-turquoise/30 rounded-2xl text-xs font-bold text-teal-dark flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-turquoise shrink-0" />
              <span>{endLiveToast}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lecteur Jitsi (8 cols) — Synchronisation Sécurisée */}
            <div className="lg:col-span-8">
              <JitsiEmbed
                ref={jitsiRef}
                roomName={activeLiveSession.room_name}
                displayName={teacherFullName}
                sessionId={activeLiveSession.id}
                title={`${activeLiveSession.subject?.name} • ${activeLiveSession.title}`}
                isTeacher={true}
                showLeaveButton={false}
                onLeave={() => handleEndLive(activeLiveSession.id)}
              />
            </div>

            {/* Feuille d'émargement / Appel en direct (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-navy/5 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-navy/5">
                <div>
                  <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-turquoise" />
                    Feuille d&apos;Émargement
                  </h3>
                  <p className="text-[11px] text-navy/50">Appel des élèves de la classe</p>
                </div>
                <span className="text-xs font-black text-teal-dark bg-teal-50 px-2.5 py-1 rounded-full">
                  {Object.values(attendanceState).filter(Boolean).length} / {liveStudentsList.length} présents
                </span>
              </div>

              {liveStudentsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-navy/40">
                  Aucun élève inscrit dans ce groupe pour le moment.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {liveStudentsList.map((att) => {
                    const isPresent = !!attendanceState[att.student_id];
                    const studentName = att.student?.first_name && att.student?.last_name
                      ? `${att.student.first_name} ${att.student.last_name}`
                      : att.student?.email || "Élève";

                    return (
                      <div
                        key={att.student_id}
                        onClick={() => toggleStudentPresence(att.student_id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isPresent
                            ? "bg-teal-50/70 border-turquoise/40 text-teal-900"
                            : "bg-blue-vlight/30 border-navy/5 text-navy/60 hover:border-navy/20"
                        }`}
                      >
                        <span className="text-xs font-bold">{studentName}</span>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isPresent ? "bg-turquoise text-white" : "bg-navy/10 text-navy/40"
                          }`}
                        >
                          {isPresent ? <Check className="w-3.5 h-3.5" /> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => handleSaveAttendance(activeLiveSession.id)}
                disabled={savingAttendance}
                className="w-full bg-navy hover:bg-navy/90 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingAttendance ? (
                  "Enregistrement..."
                ) : attendanceSavedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-turquoise" /> Présences Enregistrées !
                  </>
                ) : (
                  "Enregistrer l'appel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISIOCONFÉRENCE INSTITUTIONNELLE EN DIRECT (PROFESSEUR) */}
      {activeMeetingSession && (
        <div className="space-y-4 animate-in zoom-in-95">
          <div className="bg-[#2d1b4e] text-white rounded-3xl p-5 flex items-center justify-between shadow-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-400 animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  🔴 Visioconférence Institutionnelle (Enseignant)
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {activeMeetingSession.title}
                </h3>
                <p className="text-xs text-white/60">
                  {activeMeetingSession.description || "Échange en direct avec la direction, l'équipe pédagogique et les parents."}
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
            displayName={`Prof. ${teacher.first_name || ""} ${teacher.last_name || ""}`.trim()}
            title={activeMeetingSession.title}
            isTeacher={true}
            onLeave={() => setActiveMeetingSession(null)}
          />
        </div>
      )}

      {/* BLOC : VISIOCONFÉRENCES & RÉUNIONS DE L'ÉTABLISSEMENT */}
      {!activeLiveSession && !activeMeetingSession && meetings.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50/40 to-purple-50 rounded-3xl p-5 sm:p-6 border border-purple-200/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-sm">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-navy">
                  Visioconférences &amp; Réunions de l&apos;Établissement
                </h2>
                <p className="text-xs text-navy/60">
                  Conseils pédagogiques, réunions parents-professeurs et assemblées officielles.
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

              const audienceLabel =
                m.target_audience === "all_teachers"
                  ? "🧑‍🏫 Tous les Enseignants"
                  : m.target_audience === "class_teachers"
                  ? `🎓 Équipe Pédagogique — ${m.class?.name || "Classe"}`
                  : m.target_audience === "all_parents"
                  ? "👨‍👩‍👧 Assemblée Parents & Direction"
                  : m.target_audience === "class_parents"
                  ? `🏫 Réunion Parents — ${m.class?.name || "Classe"}`
                  : "🛡️ Direction";

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                    isLive ? "border-purple-500 ring-2 ring-purple-500/20 shadow-md" : "border-purple-100 shadow-xs"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                        {audienceLabel}
                      </span>

                      {isLive ? (
                        <span className="text-[10px] font-black text-white bg-orange px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> EN DIRECT
                        </span>
                      ) : isEnded ? (
                        <span className="text-[10px] font-bold text-navy/40 bg-navy/5 px-2.5 py-0.5 rounded-full">
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
                        <span>🔴 Rejoindre la Visioconférence en Direct 🎥</span>
                      </button>
                    ) : m.replay_url ? (
                      <button
                        type="button"
                        onClick={() => setSelectedMeetingReplay(m)}
                        className="w-full py-2.5 rounded-xl bg-turquoise hover:bg-turquoise/90 text-white text-xs font-black shadow-md shadow-turquoise/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Visionner le Replay Vidéo 🍿</span>
                      </button>
                    ) : isEnded ? (
                      <div className="text-center text-[11px] text-navy/40 py-2 bg-navy/5 rounded-xl">
                        Réunion terminée • Replay non disponible
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

      {/* LISTE DES SÉANCES PLANIFIÉES ET HISTORIQUE */}
      {!activeLiveSession && !activeMeetingSession && (
        <div className="space-y-6">
          {assignedSubjects.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-navy/5 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-navy">Aucune matière assignée</h3>
              <p className="text-xs text-navy/60 max-w-md mx-auto">
                Pour planifier des cours en direct, l&apos;administrateur doit d&apos;abord vous assigner à une ou plusieurs matières dans une classe.
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-turquoise/10 text-turquoise flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-navy">Aucun cours planifié</h3>
              <p className="text-sm text-navy/60 max-w-md mx-auto">
                Planifiez votre premier cours en direct pour vos élèves en sélectionnant l&apos;une de vos matières.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-orange text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md cursor-pointer"
              >
                Planifier un direct
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((sess) => {
                const startDateObj = new Date(sess.start_time);
                const endDateObj = new Date(sess.end_time);
                const isScheduled = sess.status === "scheduled";
                const isEnded = sess.status === "ended";

                return (
                  <div
                    key={sess.id}
                    className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                          {sess.subject?.name} • {sess.subject?.class_name}
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isScheduled
                              ? "bg-blue-100 text-sky-800"
                              : isEnded
                              ? "bg-navy/5 text-navy/50"
                              : "bg-orange/15 text-orange"
                          }`}
                        >
                          {isScheduled ? "Programmé" : isEnded ? "Terminé" : "En direct"}
                        </span>
                      </div>

                      <h4 className="font-bold text-navy text-base mb-2">{sess.title}</h4>

                      <div className="space-y-1.5 text-xs text-navy/60">
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

                    <div className="mt-6 pt-4 border-t border-navy/5 flex items-center gap-2">
                      {isScheduled && (
                        <button
                          disabled={startingSessionId === sess.id}
                          onClick={() => handleStartLive(sess)}
                          className="w-full bg-orange hover:bg-orange/90 disabled:opacity-75 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-orange/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {startingSessionId === sess.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Lancement de la classe...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-white" />
                              <span>Démarrer le direct</span>
                            </>
                          )}
                        </button>
                      )}

                      {sess.status === "live" && (
                        <button
                          onClick={() => setActiveLiveSession(sess)}
                          className="w-full bg-orange hover:bg-orange/90 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-orange/20 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          Rejoindre le direct en cours
                        </button>
                      )}

                      {sess.replay_url ? (
                        <div className="w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedPreviewReplaySession(sess)}
                              className="flex-1 bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              Visionner Replay
                            </button>
                            <button
                              onClick={() => {
                                setReplayModalSession(sess);
                                setReplayUrlInput(sess.replay_url || "");
                              }}
                              className="px-3 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-dark font-bold text-xs rounded-xl border border-turquoise/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Modifier le lien du replay"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                          </div>
                          <div className="text-[10px] font-bold text-teal-dark bg-teal-50 border border-turquoise/20 py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-turquoise" />
                            <span>Replay actif et disponible pour les élèves</span>
                          </div>
                        </div>
                      ) : isEnded ? (
                        <div className="w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartLive(sess)}
                              className="flex-1 bg-blue-vlight hover:bg-turquoise/15 text-navy hover:text-teal-dark font-bold text-xs py-2 rounded-xl border border-navy/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Relancer
                            </button>
                            <button
                              onClick={() => {
                                setReplayModalSession(sess);
                                setReplayUrlInput(sess.replay_url || "");
                              }}
                              className="flex-1 bg-orange/10 hover:bg-orange/20 text-orange font-bold text-xs py-2 rounded-xl border border-orange/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Publier Replay
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE : Publier un Replay Vidéo */}
      {replayModalSession && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Médiathèque Vidéo
                </span>
                <h3 className="text-xl font-black text-navy">Publier le Replay du Cours</h3>
                <p className="text-xs text-navy/60">
                  {replayModalSession.subject?.name} • {replayModalSession.title}
                </p>
              </div>
              <button
                onClick={() => setReplayModalSession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {replaySuccess ? (
              <div className="p-6 bg-teal-50 border border-turquoise/30 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-turquoise mx-auto" />
                <h4 className="font-bold text-navy text-sm">Replay Publié avec Succès !</h4>
                <p className="text-xs text-navy/60">
                  Les élèves de la classe peuvent maintenant revoir ce cours dans leur espace.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePublishReplay} className="space-y-4">
                {/* Option 1 : Déposer le fichier vidéo (.webm / .mp4) */}
                <div className="bg-blue-vlight/60 p-4 rounded-2xl border border-navy/10 space-y-2">
                  <label className="block text-xs font-bold text-navy uppercase">
                    1. Déposer le fichier vidéo enregistré (.webm / .mp4)
                  </label>
                  <input
                    type="file"
                    accept="video/webm,video/mp4,video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplayVideoFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-navy file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange file:text-white hover:file:bg-orange/90 cursor-pointer"
                  />
                  <p className="text-[10px] text-navy/40">
                    Déposez ici la vidéo téléchargée lors du direct.
                  </p>
                </div>

                {/* Option 2 : Coller un lien */}
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    2. Ou coller une URL directe (Lien vidéo / Replay)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={replayUrlInput}
                    onChange={(e) => setReplayUrlInput(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-navy/5">
                  <button
                    type="button"
                    onClick={() => setReplayModalSession(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingReplay || (!replayVideoFile && !replayUrlInput.trim())}
                    className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingReplay ? "Téléversement..." : "Publier pour les élèves ➔"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODALE : Lecteur Replay Vidéo pour le professeur */}
      {selectedPreviewReplaySession && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-4xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Replay Vidéo • Aperçu Enseignant
                </span>
                <h3 className="text-xl font-black text-navy">{selectedPreviewReplaySession.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedPreviewReplaySession.subject?.name} • {selectedPreviewReplaySession.subject?.class_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedPreviewReplaySession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-lg">
              {selectedPreviewReplaySession.replay_url ? (
                <ReplayPlayer
                  src={selectedPreviewReplaySession.replay_url}
                  title={`${selectedPreviewReplaySession.subject?.name} • ${selectedPreviewReplaySession.title}`}
                />
              ) : (
                <div className="text-white/60 text-sm">Replay non disponible.</div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-navy/5">
              <button
                onClick={() => setSelectedPreviewReplaySession(null)}
                className="bg-navy text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Lecteur Replay Réunion pour le professeur */}
      {selectedMeetingReplay && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-4xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Replay Visioconférence &amp; Réunion • Espace Enseignant
                </span>
                <h3 className="text-xl font-black text-navy">{selectedMeetingReplay.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedMeetingReplay.description || "Enregistrement de la réunion officielle de l'établissement."}
                </p>
              </div>
              <button
                onClick={() => setSelectedMeetingReplay(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-lg">
              {selectedMeetingReplay.replay_url ? (
                <ReplayPlayer
                  src={selectedMeetingReplay.replay_url}
                  title={`Réunion • ${selectedMeetingReplay.title}`}
                />
              ) : (
                <div className="text-white/60 text-sm">Replay non disponible.</div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-navy/5">
              <button
                onClick={() => setSelectedMeetingReplay(null)}
                className="bg-navy text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Planifier un cours */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange/10 text-orange flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy">Planifier un Direct</h3>
                  <p className="text-xs text-navy/60">Création de salle Jitsi sécurisée</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Matière &amp; Classe
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none"
                >
                  {assignedSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Titre du cours / Séance
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Séance 1 : Découverte des fractions"
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Date du cours
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Heure de Début
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Heure de Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Création..." : "Programmer la séance ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
