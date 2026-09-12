"use client";

import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  User,
  Users,
  GraduationCap,
  Sparkles,
  Play,
  PhoneOff,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  X,
  Plus,
  Trash2,
  Clock3,
} from "lucide-react";
import { LiveSession, ClassItem, Profile, SubjectItem, AdminMeeting, MeetingTargetAudience } from "@/lib/types";
import JitsiEmbed from "@/components/platform/JitsiEmbed";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import {
  createLiveSessionByAdminAction,
  deleteLiveSessionAction,
  deleteReplayUrlAction,
  fetchAdminAllLiveSessionsAction,
  createAdminMeetingAction,
  fetchAdminMeetingsAction,
  updateAdminMeetingStatusAction,
  deleteAdminMeetingAction,
  updateMeetingReplayUrlAction,
} from "./actions";
import { attachReplayUrlAction } from "@/app/(platform)/prof/planning/actions";

import { createClient } from "@/lib/supabase/client";

interface AdminPlanningClientViewProps {
  admin: Profile;
  initialSessions: LiveSession[];
  initialMeetings?: AdminMeeting[];
  classes: ClassItem[];
  allSubjects: SubjectItem[];
  allTeachers: Profile[];
}

export default function AdminPlanningClientView({
  admin,
  initialSessions,
  initialMeetings = [],
  classes,
  allSubjects,
  allTeachers,
}: AdminPlanningClientViewProps) {
  const [planningTab, setPlanningTab] = useState<"classes" | "meetings">("classes");
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions);
  const [meetings, setMeetings] = useState<AdminMeeting[]>(initialMeetings);
  const [activeSupervisionSession, setActiveSupervisionSession] = useState<LiveSession | null>(null);
  const [activeMeetingSession, setActiveMeetingSession] = useState<AdminMeeting | null>(null);
  const [selectedReplaySession, setSelectedReplaySession] = useState<LiveSession | null>(null);
  const [selectedAttendanceSession, setSelectedAttendanceSession] = useState<LiveSession | null>(null);
  const [adminReplayModalSession, setAdminReplayModalSession] = useState<LiveSession | null>(null);
  const [adminReplayUrlInput, setAdminReplayUrlInput] = useState("");
  const [adminSavingReplay, setAdminSavingReplay] = useState(false);

  // Replay réunions
  const [selectedMeetingReplay, setSelectedMeetingReplay] = useState<AdminMeeting | null>(null);
  const [editMeetingReplayModal, setEditMeetingReplayModal] = useState<AdminMeeting | null>(null);
  const [editMeetingReplayUrl, setEditMeetingReplayUrl] = useState("");
  const [savingMeetingReplay, setSavingMeetingReplay] = useState(false);

  // Modale création de réunion institutionnelle
  const [createMeetingModalOpen, setCreateMeetingModalOpen] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Assemblée Générale & Échanges Parents");
  const [meetingDesc, setMeetingDesc] = useState("");
  const [meetingAudience, setMeetingAudience] = useState<MeetingTargetAudience>("all_parents");
  const [meetingClassId, setMeetingClassId] = useState<string>(classes[0]?.id || "");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingStartTime, setMeetingStartTime] = useState("18:00");
  const [meetingEndTime, setMeetingEndTime] = useState("19:30");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "live" | "scheduled" | "ended">("all");

  // Synchronisation Realtime des sessions pour l'administrateur (Zéro Polling)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const reloadSessions = () => {
      fetchAdminAllLiveSessionsAction().then((res) => {
        if (res?.success && res?.data) setSessions(res.data);
      });
    };

    const uniqueChannelName = `admin_live_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        reloadSessions
      )
      .subscribe();

    const handleOnline = reloadSessions;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now();
      } else if (document.visibilityState === "visible") {
        if (Date.now() - hiddenSince > 120000) {
          reloadSessions();
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

  // Modale de planification pour l'administrateur
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scheduleClassId, setScheduleClassId] = useState<string>(classes[0]?.id || "");
  const [scheduleSubjectId, setScheduleSubjectId] = useState<string>("");
  const [scheduleTeacherId, setScheduleTeacherId] = useState<string>(allTeachers[0]?.id || "");
  const [scheduleTitle, setScheduleTitle] = useState("Séance : Approfondissement & Exercices");
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleStartTime, setScheduleStartTime] = useState("10:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("11:00");

  const adminDisplayName = `Supervision Admin (${admin.first_name || "Admin"} ${admin.last_name || ""})`.trim();

  // Matières de la classe sélectionnée dans la modale
  const availableSubjectsForClass = allSubjects.filter(
    (s) => s.class_id === scheduleClassId
  );

  const openScheduleModal = () => {
    const initialClassId = classes[0]?.id || "";
    setScheduleClassId(initialClassId);

    const classSubjects = allSubjects.filter((s) => s.class_id === initialClassId);
    if (classSubjects.length > 0) {
      setScheduleSubjectId(classSubjects[0].id);
      if (classSubjects[0].teacher_id) {
        setScheduleTeacherId(classSubjects[0].teacher_id);
      } else if (allTeachers.length > 0) {
        setScheduleTeacherId(allTeachers[0].id);
      }
    } else {
      setScheduleSubjectId("");
    }
    setCreateModalOpen(true);
  };

  const handleClassChange = (classId: string) => {
    setScheduleClassId(classId);
    const classSubs = allSubjects.filter((s) => s.class_id === classId);
    if (classSubs.length > 0) {
      setScheduleSubjectId(classSubs[0].id);
      if (classSubs[0].teacher_id) {
        setScheduleTeacherId(classSubs[0].teacher_id);
      }
    } else {
      setScheduleSubjectId("");
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setScheduleSubjectId(subjectId);
    const matched = allSubjects.find((s) => s.id === subjectId);
    if (matched?.teacher_id) {
      setScheduleTeacherId(matched.teacher_id);
    }
  };

  // Soumission de la création par l'admin
  const handleAdminCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleSubjectId || !scheduleTeacherId || !scheduleTitle.trim()) {
      alert("Veuillez sélectionner une classe, une matière et un professeur.");
      return;
    }

    setCreating(true);
    const startIso = new Date(`${scheduleDate}T${scheduleStartTime}:00`).toISOString();
    const endIso = new Date(`${scheduleDate}T${scheduleEndTime}:00`).toISOString();

    const res = await createLiveSessionByAdminAction({
      subjectId: scheduleSubjectId,
      teacherId: scheduleTeacherId,
      title: scheduleTitle,
      startTime: startIso,
      endTime: endIso,
    });

    if (res.success && res.data) {
      const selectedSubject = allSubjects.find((s) => s.id === scheduleSubjectId);
      const selectedTeacher = allTeachers.find((t) => t.id === scheduleTeacherId);

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
          class_id: selectedSubject?.class_id || "",
          is_mandatory: true,
          created_at: "",
          class_name: selectedSubject?.class_name,
        },
        teacher: selectedTeacher,
        attendance: [],
      };

      setSessions([newSess, ...sessions]);
      setCreateModalOpen(false);
    } else {
      alert(res.error || "Erreur lors de la création de la séance.");
    }
    setCreating(false);
  };

  // Suppression d'une séance de cours
  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement la séance "${title}" ?`)) {
      return;
    }
    const res = await deleteLiveSessionAction(sessionId);
    if (res.success) {
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } else {
      alert(res.error || "Erreur lors de la suppression.");
    }
  };

  // Suppression d'un replay vidéo
  const handleDeleteReplay = async (sessionId: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce replay vidéo de la séance ?")) {
      return;
    }
    const res = await deleteReplayUrlAction(sessionId);
    if (res.success) {
      setSessions(
        sessions.map((s) => (s.id === sessionId ? { ...s, replay_url: null } : s))
      );
      setSelectedReplaySession(null);
    } else {
      alert(res.error || "Erreur lors du retrait du replay.");
    }
  };

  // Enregistrement d'un replay par l'administrateur
  const handleSaveAdminReplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplayModalSession || !adminReplayUrlInput.trim()) return;
    setAdminSavingReplay(true);
    const cleanUrl = adminReplayUrlInput.trim();
    const res = await attachReplayUrlAction({
      sessionId: adminReplayModalSession.id,
      replayUrl: cleanUrl,
    });
    if (res.success) {
      setSessions(
        sessions.map((s) =>
          s.id === adminReplayModalSession.id
            ? { ...s, replay_url: cleanUrl, status: "ended" }
            : s
        )
      );
      setAdminReplayModalSession(null);
      setAdminReplayUrlInput("");
    } else {
      alert(res.error || "Erreur lors de l'enregistrement du replay.");
    }
    setAdminSavingReplay(false);
  };

  // Filtrage des séances
  const filteredSessions = sessions.filter((s) => {
    const search = searchTerm.toLowerCase();
    const subName = (s.subject?.name || "").toLowerCase();
    const className = (s.subject?.class_name || "").toLowerCase();
    const teacherName = `${s.teacher?.first_name || ""} ${s.teacher?.last_name || ""}`.toLowerCase();
    const title = s.title.toLowerCase();

    const matchesSearch =
      subName.includes(search) ||
      className.includes(search) ||
      teacherName.includes(search) ||
      title.includes(search);

    const matchesClass =
      selectedClassFilter === "all" || s.subject?.class_id === selectedClassFilter || s.subject?.class_name === selectedClassFilter;

    const matchesStatus =
      selectedStatusFilter === "all" || s.status === selectedStatusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Métriques
  const liveCount = sessions.filter((s) => s.status === "live").length;
  const scheduledCount = sessions.filter((s) => s.status === "scheduled").length;
  const replaysCount = sessions.filter((s) => !!s.replay_url).length;

  // Soumission de la création de réunion par l'administrateur
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) {
      alert("Veuillez saisir un titre pour la réunion.");
      return;
    }
    setCreatingMeeting(true);
    const startIso = new Date(`${meetingDate}T${meetingStartTime}:00`).toISOString();
    const endIso = meetingEndTime ? new Date(`${meetingDate}T${meetingEndTime}:00`).toISOString() : undefined;

    const res = await createAdminMeetingAction({
      title: meetingTitle,
      description: meetingDesc,
      targetAudience: meetingAudience,
      classId: (meetingAudience === "class_parents" || meetingAudience === "class_teachers") ? meetingClassId : undefined,
      startTime: startIso,
      endTime: endIso,
    });

    if (res.success && res.data) {
      setMeetings([res.data as AdminMeeting, ...meetings]);
      setCreateMeetingModalOpen(false);
      setMeetingTitle("Assemblée Générale & Échanges Parents");
      setMeetingDesc("");
    } else {
      alert(res.error || "Erreur lors de la création de la réunion.");
    }
    setCreatingMeeting(false);
  };

  const handleUpdateMeetingStatus = async (meetingId: string, status: "scheduled" | "live" | "ended") => {
    const res = await updateAdminMeetingStatusAction(meetingId, status);
    if (res.success) {
      setMeetings(meetings.map((m) => (m.id === meetingId ? { ...m, status } : m)));
      if (status === "live") {
        const target = meetings.find((m) => m.id === meetingId);
        if (target) setActiveMeetingSession({ ...target, status: "live" });
      } else if (status === "ended" && activeMeetingSession?.id === meetingId) {
        setActiveMeetingSession(null);
      }
    } else {
      alert(res.error || "Erreur de mise à jour du statut.");
    }
  };

  const handleDeleteMeeting = async (meetingId: string, title: string) => {
    if (!confirm(`Voulez-vous supprimer définitivement la réunion "${title}" ?`)) return;
    const res = await deleteAdminMeetingAction(meetingId);
    if (res.success) {
      setMeetings(meetings.filter((m) => m.id !== meetingId));
      if (activeMeetingSession?.id === meetingId) setActiveMeetingSession(null);
    } else {
      alert(res.error || "Erreur lors de la suppression.");
    }
  };

  const handleSaveMeetingReplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMeetingReplayModal) return;
    setSavingMeetingReplay(true);
    try {
      const res = await updateMeetingReplayUrlAction(editMeetingReplayModal.id, editMeetingReplayUrl);
      if (res.success) {
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === editMeetingReplayModal.id
              ? { ...m, replay_url: editMeetingReplayUrl.trim() || null, status: editMeetingReplayUrl.trim() ? "ended" : m.status }
              : m
          )
        );
        setEditMeetingReplayModal(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMeetingReplay(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Planning Multi-Rôles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5 text-turquoise" />
            Espace Direction &amp; Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Planning &amp; Supervision Générale
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Programmez les cours pour les professeurs, lancez des visioconférences pour les parents et supervisez les directs.
          </p>
        </div>

        <div className="flex flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => setCreateMeetingModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
          >
            <Video className="w-4 h-4" />
            <span>Visioconférence (Parents / Profs)</span>
          </button>
          <button
            onClick={openScheduleModal}
            className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-orange/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Planifier un Cours</span>
          </button>
        </div>
      </div>

      {/* Onglets 2-en-1 : Cours de Classes vs Réunions Institutionnelles */}
      <div className="flex bg-blue-vlight/80 p-1.5 rounded-2xl border border-navy/5 max-w-xl">
        <button
          onClick={() => setPlanningTab("classes")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            planningTab === "classes"
              ? "bg-white text-navy shadow-sm"
              : "text-navy/60 hover:text-navy"
          }`}
        >
          <GraduationCap className="w-4 h-4 text-turquoise" />
          <span>1. Emploi du Temps des Classes ({sessions.length})</span>
        </button>
        <button
          onClick={() => setPlanningTab("meetings")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            planningTab === "meetings"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-navy/60 hover:text-navy"
          }`}
        >
          <Video className="w-4 h-4 text-purple-600" />
          <span>2. Visioconférences &amp; Réunions ({meetings.length})</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-orange block mb-1">
            Cours en Direct Actuellement
          </span>
          <div className="text-3xl font-black text-orange flex items-center gap-2">
            {liveCount}
            {liveCount > 0 && <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />}
          </div>
          <p className="text-xs text-navy/50 mt-1">Séances ouvertes en direct</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-turquoise block mb-1">
            Total Cours Programmés
          </span>
          <div className="text-3xl font-black text-turquoise">{sessions.length}</div>
          <p className="text-xs text-navy/50 mt-1">Séances de cours au planning</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-navy/50 block mb-1">
            Replays Enregistrés
          </span>
          <div className="text-3xl font-black text-navy">{replaysCount}</div>
          <p className="text-xs text-navy/50 mt-1">Médiathèque vidéo des cours</p>
        </div>
      </div>

      {/* LECTEUR DE SUPERVISION LIVE ACTIF */}
      {activeSupervisionSession && (
        <div className="space-y-4">
          <div className="bg-[#1a2e3b] text-white rounded-3xl p-5 flex items-center justify-between shadow-xl border border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-orange animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange bg-orange/20 px-2 py-0.5 rounded-full">
                  Mode Supervision Administrateur
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {activeSupervisionSession.subject?.name} — {activeSupervisionSession.title}
                </h3>
                <p className="text-xs text-white/60">
                  Classe : {activeSupervisionSession.subject?.class_name} • Professeur : {activeSupervisionSession.teacher?.first_name} {activeSupervisionSession.teacher?.last_name}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveSupervisionSession(null)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5 text-red-400" />
              Quitter la supervision
            </button>
          </div>

          <JitsiEmbed
            roomName={activeSupervisionSession.room_name}
            sessionId={activeSupervisionSession.id}
            displayName={adminDisplayName}
            title={`[Supervision] ${activeSupervisionSession.subject?.name} • ${activeSupervisionSession.title}`}
            isTeacher={false}
            onLeave={() => setActiveSupervisionSession(null)}
          />
        </div>
      )}

      {/* LECTEUR DE REUNION INSTITUTIONNELLE LIVE ACTIF */}
      {activeMeetingSession && (
        <div className="space-y-4">
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
                  Audience : {
                    activeMeetingSession.target_audience === "all_parents"
                      ? "👨‍👩‍👧 Tous les Parents d'élèves"
                      : activeMeetingSession.target_audience === "class_parents"
                      ? `🏫 Parents (${activeMeetingSession.class?.name || "Classe"})`
                      : activeMeetingSession.target_audience === "all_teachers"
                      ? "🧑‍🏫 Tous les Enseignants"
                      : activeMeetingSession.target_audience === "class_teachers"
                      ? `🎓 Équipe Pédagogique (${activeMeetingSession.class?.name || "Classe"})`
                      : "🛡️ Direction"
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateMeetingStatus(activeMeetingSession.id, "ended")}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Clôturer la réunion
              </button>
              <button
                onClick={() => setActiveMeetingSession(null)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5 text-red-400" />
                Quitter
              </button>
            </div>
          </div>

          <JitsiEmbed
            roomName={activeMeetingSession.room_name}
            sessionId={activeMeetingSession.id}
            displayName={adminDisplayName}
            title={activeMeetingSession.title}
            isTeacher={true}
            onLeave={() => setActiveMeetingSession(null)}
          />
        </div>
      )}

      {/* 1. ONGLET : EMPLOI DU TEMPS DES CLASSES */}
      {planningTab === "classes" && !activeSupervisionSession && !activeMeetingSession && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="bg-white rounded-3xl p-4 border border-navy/5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-navy/40 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par matière, prof, titre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-turquoise focus:bg-white outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Status filter */}
              <div className="flex items-center gap-1 bg-blue-vlight p-1 rounded-xl">
                <button
                  onClick={() => setSelectedStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStatusFilter === "all" ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("live")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStatusFilter === "live" ? "bg-orange text-white" : "text-navy/60 hover:text-navy"
                  }`}
                >
                  En direct
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("scheduled")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStatusFilter === "scheduled" ? "bg-turquoise text-white" : "text-navy/60 hover:text-navy"
                  }`}
                >
                  Programmés
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("ended")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStatusFilter === "ended" ? "bg-navy/80 text-white" : "text-navy/60 hover:text-navy"
                  }`}
                >
                  Terminés
                </button>
              </div>

              {/* Class filter */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-blue-vlight border border-navy/10 px-3 py-2 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer"
              >
                <option value="all">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sessions Grid */}
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
              <CalendarIcon className="w-12 h-12 text-navy/30 mx-auto" />
              <h3 className="text-lg font-black text-navy">Aucun cours trouvé</h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto">
                Modifiez vos filtres ou planifiez une nouvelle séance pour un professeur.
              </p>
              <button
                onClick={openScheduleModal}
                className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-orange/20 cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Planifier un cours
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map((sess) => {
                const startDateObj = new Date(sess.start_time);
                const isLive = sess.status === "live";
                const isEnded = sess.status === "ended";
                const teacherName = sess.teacher
                  ? `${sess.teacher.first_name || ""} ${sess.teacher.last_name || ""}`.trim()
                  : "Professeur";

                const presentCount = (sess.attendance || []).filter((a) => a.present).length;
                const totalInClass = sess.attendance?.length || 0;

                return (
                  <div
                    key={sess.id}
                    className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                          {sess.subject?.name || "Matière"}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                              isLive
                                ? "bg-orange text-white shadow-sm"
                                : isEnded
                                ? "bg-navy/5 text-navy/40"
                                : "bg-blue-100 text-sky-800"
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            {isLive ? "En direct" : isEnded ? "Terminé" : "Programmé"}
                          </span>

                          <button
                            onClick={() => handleDeleteSession(sess.id, sess.title)}
                            className="p-1 rounded-lg text-navy/30 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Supprimer définitivement la séance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-navy text-base mb-1">{sess.title}</h4>
                      <div className="text-xs font-bold text-turquoise mb-3">
                        Classe : {sess.subject?.class_name || "Groupe"}
                      </div>

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
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-navy/5 space-y-2">
                      {isLive && (
                        <button
                          onClick={() => setActiveSupervisionSession(sess)}
                          className="w-full bg-orange hover:bg-orange/90 text-white font-black text-xs py-3 rounded-xl shadow-md shadow-orange/20 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                        >
                          <Eye className="w-4 h-4" />
                          Rejoindre la séance (Supervision)
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        {sess.replay_url ? (
                          <>
                            <button
                              onClick={() => setSelectedReplaySession(sess)}
                              className="flex-1 bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              Voir Replay
                            </button>
                            <button
                              onClick={() => {
                                setAdminReplayModalSession(sess);
                                setAdminReplayUrlInput(sess.replay_url || "");
                              }}
                              className="px-3 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-dark font-bold text-xs rounded-xl border border-turquoise/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Modifier l'URL du replay"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setAdminReplayModalSession(sess);
                              setAdminReplayUrlInput("");
                            }}
                            className="flex-1 bg-orange/10 hover:bg-orange/20 text-orange font-bold text-xs py-2.5 rounded-xl border border-orange/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter Replay
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedAttendanceSession(sess)}
                          className="px-3.5 py-2.5 bg-blue-vlight hover:bg-navy/10 text-navy font-bold text-xs rounded-xl border border-navy/10 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Feuille d'émargement"
                        >
                          <Users className="w-3.5 h-3.5 text-teal-dark" />
                          <span>{presentCount}/{totalInClass}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ONGLET : VISIOCONFÉRENCES & RÉUNIONS INSTITUTIONNELLES */}
      {planningTab === "meetings" && !activeMeetingSession && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-navy flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-600" />
              <span>Visioconférences &amp; Assemblées ({meetings.length})</span>
            </h3>
            <button
              onClick={() => setCreateMeetingModalOpen(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouvelle Visioconférence</span>
            </button>
          </div>

          {meetings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Video className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-navy">Aucune visioconférence programmée</h4>
              <p className="text-xs text-navy/50 max-w-sm mx-auto">
                Créez une réunion pour les parents d&apos;élèves, un conseil pédagogique pour les professeurs ou un point de direction.
              </p>
              <button
                onClick={() => setCreateMeetingModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Programmer la Première Réunion
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {meetings.map((m) => {
                const startDate = new Date(m.start_time);
                const isLive = m.status === "live";
                const isEnded = m.status === "ended";

                const audienceLabel =
                  m.target_audience === "all_parents"
                    ? "👨‍👩‍👧 Tous les Parents"
                    : m.target_audience === "class_parents"
                    ? `🏫 Parents — ${m.class?.name || "Classe"}`
                    : m.target_audience === "all_teachers"
                    ? "🧑‍🏫 Tous les Profs"
                    : m.target_audience === "class_teachers"
                    ? `🎓 Équipe Profs — ${m.class?.name || "Classe"}`
                    : "🛡️ Direction";

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                          {audienceLabel}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isLive ? (
                            <span className="text-[10px] font-black text-white bg-orange px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> En Direct
                            </span>
                          ) : isEnded ? (
                            <span className="text-[10px] font-bold text-navy/50 bg-navy/5 px-2.5 py-0.5 rounded-full">
                              Terminée
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                              Programmée
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteMeeting(m.id, m.title)}
                            className="p-1 rounded-lg text-navy/30 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Supprimer la réunion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-navy text-base mb-1.5">{m.title}</h4>
                      {m.description && (
                        <p className="text-xs text-navy/60 line-clamp-2 mb-3 leading-relaxed">
                          {m.description}
                        </p>
                      )}

                      <div className="space-y-1.5 text-xs text-navy/60 pt-2 border-t border-navy/5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>
                            {startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} •{" "}
                            {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-navy/40" />
                          <span>Par : <strong className="text-navy">{m.creator?.first_name} {m.creator?.last_name}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-navy/5 space-y-2">
                      {!isEnded && (
                        <button
                          type="button"
                          onClick={() => {
                            if (m.status !== "live") {
                              handleUpdateMeetingStatus(m.id, "live");
                            } else {
                              setActiveMeetingSession(m);
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>{isLive ? "Rejoindre le Direct 🎥" : "Lancer la Visioconférence 🎥"}</span>
                        </button>
                      )}

                      {isLive && (
                        <button
                          type="button"
                          onClick={() => handleUpdateMeetingStatus(m.id, "ended")}
                          className="w-full py-2 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy/70 text-xs font-bold transition-all cursor-pointer"
                        >
                          Clôturer la réunion
                        </button>
                      )}

                      {/* Replay vidéo de la réunion */}
                      <div className="flex items-center gap-2 pt-1">
                        {m.replay_url ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedMeetingReplay(m)}
                              className="flex-1 bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Voir Replay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditMeetingReplayModal(m);
                                setEditMeetingReplayUrl(m.replay_url || "");
                              }}
                              className="px-3 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-dark font-bold text-xs rounded-xl border border-turquoise/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Modifier l'URL du replay"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Modifier</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditMeetingReplayModal(m);
                              setEditMeetingReplayUrl("");
                            }}
                            className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs py-2.5 rounded-xl border border-purple-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter Replay Enregistré</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE : PROGRAMMER UNE RÉUNION INSTITUTIONNELLE */}
      {createMeetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-4 border border-navy/10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-navy">Programmer une Visioconférence</h3>
                  <p className="text-xs text-navy/50">Pour les parents, professeurs ou direction</p>
                </div>
              </div>
              <button
                onClick={() => setCreateMeetingModalOpen(false)}
                className="p-1.5 rounded-xl text-navy/40 hover:text-navy hover:bg-navy/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Titre de la réunion *</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Ex: Assemblée Générale des Parents, Conseil de Classe..."
                  className="w-full px-4 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Audience Cible *</label>
                <select
                  value={meetingAudience}
                  onChange={(e) => setMeetingAudience(e.target.value as MeetingTargetAudience)}
                  className="w-full px-4 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none focus:border-purple-600 cursor-pointer"
                >
                  <option value="all_parents">👨‍👩‍👧 Tous les Parents d&apos;Élèves de l&apos;École</option>
                  <option value="class_parents">🏫 Parents d&apos;une Classe Spécifique</option>
                  <option value="all_teachers">🧑‍🏫 Tous les Enseignants</option>
                  <option value="class_teachers">🎓 Équipe Pédagogique d&apos;une Classe</option>
                  <option value="direction_only">🛡️ Réunion de Direction (Admins &amp; Super Admin)</option>
                </select>
              </div>

              {(meetingAudience === "class_parents" || meetingAudience === "class_teachers") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy">Classe Concernée *</label>
                  <select
                    value={meetingClassId}
                    onChange={(e) => setMeetingClassId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none focus:border-purple-600 cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Ordre du jour / Description</label>
                <textarea
                  rows={2}
                  value={meetingDesc}
                  onChange={(e) => setMeetingDesc(e.target.value)}
                  placeholder="Points abordés, organisation, questions..."
                  className="w-full px-4 py-2.5 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy outline-none focus:border-purple-600 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Date *</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Heure début *</label>
                  <input
                    type="time"
                    required
                    value={meetingStartTime}
                    onChange={(e) => setMeetingStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Heure fin</label>
                  <input
                    type="time"
                    value={meetingEndTime}
                    onChange={(e) => setMeetingEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-blue-vlight/50 border border-navy/10 rounded-xl text-xs font-medium text-navy outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setCreateMeetingModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingMeeting}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creatingMeeting ? "Programmation..." : "Créer la Réunion 🎥"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : Planifier un cours pour un professeur */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange/10 text-orange flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy">Planifier un Cours</h3>
                  <p className="text-xs text-navy/60">Programmation pour une classe et un enseignant</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateSession} className="space-y-4">
              {/* 1. Choix de la classe */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  1. Classe / Groupe
                </label>
                <select
                  value={scheduleClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Choix de la matière */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  2. Matière
                </label>
                <select
                  value={scheduleSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {availableSubjectsForClass.length === 0 ? (
                    <option value="">Aucune matière pour cette classe</option>
                  ) : (
                    availableSubjectsForClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.teacher_name ? `— Assigné à : ${s.teacher_name}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 3. Choix du professeur */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  3. Professeur Responsable
                </label>
                <select
                  value={scheduleTeacherId}
                  onChange={(e) => setScheduleTeacherId(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {allTeachers.map((t) => {
                    const name = `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.email;
                    const email = t.email ? ` (${t.email})` : "";
                    return (
                      <option key={t.id} value={t.id}>
                        {name}{email}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 4. Titre de la séance */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  4. Titre du Cours
                </label>
                <input
                  type="text"
                  required
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder="Ex : Séance 2 : Nombres &amp; Calculs"
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              {/* 5. Date & Horaires */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Début
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:text-navy"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || !scheduleSubjectId}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Programmation..." : "Programmer la séance ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : Lecteur Replay Vidéo Admin */}
      {selectedReplaySession && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Supervision Replay Vidéo
                </span>
                <h3 className="text-xl font-black text-navy">{selectedReplaySession.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedReplaySession.subject?.name} • {selectedReplaySession.subject?.class_name} • Prof: {selectedReplaySession.teacher?.first_name} {selectedReplaySession.teacher?.last_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReplaySession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
              {selectedReplaySession.replay_url ? (
                <ReplayPlayer
                  src={selectedReplaySession.replay_url}
                  title={`${selectedReplaySession.subject?.name} • ${selectedReplaySession.title}`}
                />
              ) : (
                <div className="text-white/40 text-xs bg-navy w-full h-full flex items-center justify-center">
                  Aucune vidéo disponible
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleDeleteReplay(selectedReplaySession.id)}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer ce Replay
              </button>

              <div className="flex items-center gap-3">
                <a
                  href={selectedReplaySession.replay_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-teal-dark hover:underline flex items-center gap-1.5"
                >
                  Plein écran ➔
                </a>
                <button
                  onClick={() => setSelectedReplaySession(null)}
                  className="bg-navy text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Feuille d'émargement */}
      {selectedAttendanceSession && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Feuille d&apos;Émargement
                </span>
                <h3 className="text-xl font-black text-navy">{selectedAttendanceSession.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedAttendanceSession.subject?.name} • {selectedAttendanceSession.subject?.class_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedAttendanceSession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!selectedAttendanceSession.attendance || selectedAttendanceSession.attendance.length === 0) ? (
                <div className="text-center py-6 text-xs text-navy/40">
                  Aucun élève inscrit pour cette séance.
                </div>
              ) : (
                selectedAttendanceSession.attendance.map((att) => {
                  const studentName = att.student
                    ? `${att.student.first_name || ""} ${att.student.last_name || ""}`.trim() || att.student.email
                    : "Élève";

                  const isScheduled = selectedAttendanceSession.status === "scheduled";
                  const isLive = selectedAttendanceSession.status === "live";

                  let statusBadgeText = "Absent";
                  let statusBg = "bg-red-50/40 border-red-200";
                  let iconBg = "bg-red-200 text-red-700";
                  let icon = <XCircle className="w-4 h-4" />;

                  if (att.present) {
                    statusBadgeText = "Présent";
                    statusBg = "bg-teal-50/60 border-turquoise/30";
                    iconBg = "bg-turquoise text-white";
                    icon = <CheckCircle2 className="w-4 h-4" />;
                  } else if (isScheduled) {
                    statusBadgeText = "Inscrit — En attente du démarrage";
                    statusBg = "bg-blue-50/50 border-sky-200";
                    iconBg = "bg-sky-100 text-sky-700";
                    icon = <Clock3 className="w-4 h-4" />;
                  } else if (isLive) {
                    statusBadgeText = "En attente de connexion";
                    statusBg = "bg-amber-50/50 border-amber-200";
                    iconBg = "bg-amber-100 text-amber-700";
                    icon = <Clock className="w-4 h-4" />;
                  }

                  return (
                    <div
                      key={att.student_id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${statusBg}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${iconBg}`}
                        >
                          {icon}
                        </div>
                        <div>
                          <div className="font-bold text-navy text-xs">{studentName}</div>
                          <div className="text-[10px] text-navy/60 font-medium">{statusBadgeText}</div>
                        </div>
                      </div>

                      {att.present && att.marked_at && (
                        <span className="text-[10px] text-teal-dark font-bold font-mono">
                          {new Date(att.marked_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setSelectedAttendanceSession(null)}
              className="w-full bg-navy text-white font-bold text-xs py-3 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODALE : Ajouter / Modifier Replay Admin */}
      {adminReplayModalSession && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Administration • Replay
                </span>
                <h3 className="text-xl font-black text-navy">
                  {adminReplayModalSession.replay_url ? "Modifier le Replay" : "Ajouter un Replay Vidéo"}
                </h3>
                <p className="text-xs text-navy/60">
                  {adminReplayModalSession.subject?.name} • {adminReplayModalSession.title}
                </p>
              </div>
              <button
                onClick={() => setAdminReplayModalSession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminReplay} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  URL / Lien Direct du Replay (Lien vidéo, YouTube, Drive...)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={adminReplayUrlInput}
                  onChange={(e) => setAdminReplayUrlInput(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
                <p className="text-[10px] text-navy/40 mt-1">
                  Le replay sera immédiatement visible et accessible aux élèves et au professeur dans leur espace.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setAdminReplayModalSession(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={adminSavingReplay || !adminReplayUrlInput.trim()}
                  className="bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-turquoise/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {adminSavingReplay ? "Enregistrement..." : "Enregistrer & Publier ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODALE : Lecteur Replay Réunion Institutionnelle */}
      {selectedMeetingReplay && selectedMeetingReplay.replay_url && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-4 max-h-[96vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Replay Visioconférence • Direction
                </span>
                <h3 className="text-lg sm:text-xl font-black text-navy">{selectedMeetingReplay.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedMeetingReplay.description || "Enregistrement de la visioconférence"}
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
                Accessible aux participants autorisés selon l&apos;audience cible.
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

      {/* MODALE : Ajouter / Modifier Replay Réunion */}
      {editMeetingReplayModal && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Visioconférence • Replay
                </span>
                <h3 className="text-xl font-black text-navy">
                  {editMeetingReplayModal.replay_url ? "Modifier le Replay" : "Ajouter un Replay Vidéo"}
                </h3>
                <p className="text-xs text-navy/60">{editMeetingReplayModal.title}</p>
              </div>
              <button
                onClick={() => setEditMeetingReplayModal(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingReplay} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  URL / Lien Direct du Replay (Lien vidéo, YouTube, Drive...)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={editMeetingReplayUrl}
                  onChange={(e) => setEditMeetingReplayUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-purple-600 focus:bg-white outline-none"
                />
                <p className="text-[10px] text-navy/40 mt-1">
                  Le replay sera immédiatement visible et accessible aux parents et participants invités dans leur espace.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setEditMeetingReplayModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingMeetingReplay || !editMeetingReplayUrl.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingMeetingReplay ? "Enregistrement..." : "Enregistrer & Publier ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
