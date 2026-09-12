"use client";

import { useState } from "react";
import {
  UserCheck,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  User,
  CheckCircle2,
  XCircle,
  Video,
  Play,
  ArrowLeft,
  X,
  Search,
  Filter,
  GraduationCap,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { LiveSession } from "@/lib/types";
import ReplayPlayer from "@/components/platform/ReplayPlayer";
import { useDebounce } from "@/hooks/useDebounce";
import PaginationBar from "@/components/ui/PaginationBar";

interface PresencesClientViewProps {
  initialSessions: LiveSession[];
  allClasses?: Array<{ id: string; name: string; level: string; cycle: string }>;
  allSubjects?: Array<{ id: string; name: string }>;
  allTeachers?: Array<{ id: string; first_name: string; last_name: string }>;
}

export default function PresencesClientView({
  initialSessions,
  allClasses = [],
  allSubjects = [],
  allTeachers = [],
}: PresencesClientViewProps) {
  const [sessions] = useState<LiveSession[]>(initialSessions);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<LiveSession | null>(null);
  const [selectedReplaySession, setSelectedReplaySession] = useState<LiveSession | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("ALL");
  const [selectedReplay, setSelectedReplay] = useState<string>("ALL");
  const [selectedRate, setSelectedRate] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const debouncedSearch = useDebounce(searchTerm, 250);

  // Extraction de TOUTES les classes de l'école (même celles qui n'ont pas encore de séances)
  const uniqueClasses = Array.from(
    new Set([
      ...allClasses.map((c) => c.name),
      ...sessions.map((s) => s.subject?.class_name).filter(Boolean),
    ])
  ).filter(Boolean) as string[];

  // Extraction de TOUTES les matières
  const uniqueSubjects = Array.from(
    new Set([
      ...allSubjects.map((s) => s.name),
      ...sessions.map((s) => s.subject?.name).filter(Boolean),
    ])
  ).filter(Boolean) as string[];

  // Extraction de TOUS les enseignants
  const uniqueTeachers = Array.from(
    new Set([
      ...allTeachers.map((t) => `${t.first_name || ""} ${t.last_name || ""}`.trim()),
      ...sessions
        .map((s) =>
          s.teacher
            ? `${s.teacher.first_name || ""} ${s.teacher.last_name || ""}`.trim()
            : ""
        )
        .filter(Boolean),
    ])
  ).filter(Boolean) as string[];

  // Filtrage combiné avec recherche debouncée
  const filteredSessions = sessions.filter((s) => {
    const search = debouncedSearch.trim().toLowerCase();
    const subName = (s.subject?.name || "").toLowerCase();
    const className = (s.subject?.class_name || "").toLowerCase();
    const teacherName = `${s.teacher?.first_name || ""} ${s.teacher?.last_name || ""}`.toLowerCase();
    const title = s.title.toLowerCase();

    const matchesSearch =
      !search ||
      subName.includes(search) ||
      className.includes(search) ||
      teacherName.includes(search) ||
      title.includes(search);

    const matchesClass =
      selectedClass === "ALL" || s.subject?.class_name === selectedClass;

    const matchesSubject =
      selectedSubject === "ALL" || s.subject?.name === selectedSubject;

    const currentTeacher = s.teacher
      ? `${s.teacher.first_name || ""} ${s.teacher.last_name || ""}`.trim()
      : "";
    const matchesTeacher =
      selectedTeacher === "ALL" || currentTeacher === selectedTeacher;

    const matchesReplay =
      selectedReplay === "ALL"
        ? true
        : selectedReplay === "HAS_REPLAY"
        ? !!s.replay_url
        : !s.replay_url;

    const presentCount = (s.attendance || []).filter((a) => a.present).length;
    const totalInClass = s.attendance?.length || 0;
    const rate =
      totalInClass > 0 ? Math.round((presentCount / totalInClass) * 100) : 100;

    const matchesRate =
      selectedRate === "ALL"
        ? true
        : selectedRate === "HIGH"
        ? rate >= 80
        : selectedRate === "MED"
        ? rate >= 50 && rate < 80
        : rate < 50;

    return (
      matchesSearch &&
      matchesClass &&
      matchesSubject &&
      matchesTeacher &&
      matchesReplay &&
      matchesRate
    );
  });

  // Pagination intelligente
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Réinitialiser la page sur changement de filtres
  const hasActiveFilters =
    searchTerm !== "" ||
    selectedClass !== "ALL" ||
    selectedSubject !== "ALL" ||
    selectedTeacher !== "ALL" ||
    selectedReplay !== "ALL" ||
    selectedRate !== "ALL";

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedClass("ALL");
    setSelectedSubject("ALL");
    setSelectedTeacher("ALL");
    setSelectedReplay("ALL");
    setSelectedRate("ALL");
    setCurrentPage(1);
  };

  // Calcul des statistiques globales
  const totalSessions = sessions.length;
  let totalPresences = 0;
  let totalAttendancesCount = 0;

  sessions.forEach((s) => {
    (s.attendance || []).forEach((a) => {
      totalAttendancesCount++;
      if (a.present) totalPresences++;
    });
  });

  const globalRate =
    totalAttendancesCount > 0 ? Math.round((totalPresences / totalAttendancesCount) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark text-xs font-bold uppercase tracking-wider mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            Supervision &amp; Émargements
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Suivi des Présences aux Cours
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Consultez les feuilles d&apos;émargement des séances en direct, les taux de présence et les replays associés.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-navy/10 text-xs font-bold text-navy hover:bg-navy/5 transition-colors self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4 text-orange" />
          Tableau de bord
        </Link>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-navy/40 block mb-1">
            Total Séances de Direct
          </span>
          <div className="text-3xl font-black text-navy">{totalSessions}</div>
          <p className="text-xs text-navy/50 mt-1">Cours programmés et délivrés</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-dark block mb-1">
            Taux de Présence Moyen
          </span>
          <div className="text-3xl font-black text-turquoise">{globalRate}%</div>
          <p className="text-xs text-navy/50 mt-1">{totalPresences} présences enregistrées</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-orange block mb-1">
            Replays Disponibles
          </span>
          <div className="text-3xl font-black text-orange">
            {sessions.filter((s) => !!s.replay_url).length}
          </div>
          <p className="text-xs text-navy/50 mt-1">Vidéos enregistrées pour les élèves</p>
        </div>
      </div>

      {/* Search & Comprehensive Filters Bar */}
      <div className="bg-white rounded-3xl p-5 border border-navy/5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Barre de recherche */}
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-navy/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par matière, classe, professeur, titre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-2xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-turquoise focus:bg-white outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bouton de réinitialisation rapide */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange/10 hover:bg-orange/20 text-orange font-bold text-xs transition-colors self-end lg:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>

        {/* Ligne des Sélecteurs de Filtres Spécifiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-navy/5">
          {/* Filtre par Classe */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy/50 block mb-1">
              Classe / Groupe
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-blue-vlight/40 hover:bg-blue-vlight/70 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Toutes les classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Matière */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy/50 block mb-1">
              Matière
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 bg-blue-vlight/40 hover:bg-blue-vlight/70 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Toutes les matières</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Enseignant */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy/50 block mb-1">
              Enseignant
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 bg-blue-vlight/40 hover:bg-blue-vlight/70 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Tous les enseignants</option>
              {uniqueTeachers.map((tch) => (
                <option key={tch} value={tch}>
                  {tch}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Replay */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy/50 block mb-1">
              Replay Vidéo
            </label>
            <select
              value={selectedReplay}
              onChange={(e) => setSelectedReplay(e.target.value)}
              className="w-full px-3 py-2 bg-blue-vlight/40 hover:bg-blue-vlight/70 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Tous les statuts Replay</option>
              <option value="HAS_REPLAY">🎬 Replay disponible</option>
              <option value="NO_REPLAY">❌ Sans Replay</option>
            </select>
          </div>

          {/* Filtre par Taux de Présence */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-navy/50 block mb-1">
              Taux d&apos;Assiduité
            </label>
            <select
              value={selectedRate}
              onChange={(e) => setSelectedRate(e.target.value)}
              className="w-full px-3 py-2 bg-blue-vlight/40 hover:bg-blue-vlight/70 border border-navy/10 rounded-xl text-xs font-bold text-navy outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Tous les taux</option>
              <option value="HIGH">🟢 Assiduité Forte (≥ 80%)</option>
              <option value="MED">🟡 Assiduité Moyenne (50-79%)</option>
              <option value="LOW">🔴 Assiduité Faible (&lt; 50%)</option>
            </select>
          </div>
        </div>

        {/* Compteur de résultats filtrés */}
        <div className="text-[11px] font-bold text-navy/50 pt-1">
          {filteredSessions.length} séance{filteredSessions.length > 1 ? "s" : ""} affichée{filteredSessions.length > 1 ? "s" : ""} sur {sessions.length} au total
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-3xl border border-navy/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-vlight/60 border-b border-navy/5 text-[11px] font-black uppercase tracking-wider text-navy/50">
                <th className="py-4 px-6">Séance &amp; Matière</th>
                <th className="py-4 px-6">Enseignant</th>
                <th className="py-4 px-6">Date &amp; Horaire</th>
                <th className="py-4 px-6">Taux de Présence</th>
                <th className="py-4 px-6">Replay</th>
                <th className="py-4 px-6 text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5 text-xs font-medium text-navy">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange flex items-center justify-center mx-auto">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-navy text-sm">
                        {selectedClass !== "ALL"
                          ? `Aucune séance enregistrée pour "${selectedClass}"`
                          : selectedSubject !== "ALL"
                          ? `Aucun cours trouvé pour la matière "${selectedSubject}"`
                          : selectedTeacher !== "ALL"
                          ? `Aucun cours trouvé pour l'enseignant "${selectedTeacher}"`
                          : selectedReplay === "HAS_REPLAY"
                          ? "Aucun replay vidéo disponible pour cette sélection"
                          : "Aucune séance ne correspond aux critères sélectionnés"}
                      </div>
                      <p className="text-xs text-navy/60 leading-relaxed">
                        {selectedClass !== "ALL"
                          ? `La classe "${selectedClass}" n'a pas encore de direct planifié ou archivé. Vous pouvez programmer une nouvelle séance depuis le Planning global.`
                          : "Ajustez vos filtres de recherche ou planifiez une nouvelle séance pour cette matière / enseignant."}
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedClass("ALL");
                            setSelectedSubject("ALL");
                            setSelectedTeacher("ALL");
                            setSelectedReplay("ALL");
                            setSelectedRate("ALL");
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-navy/70 bg-navy/5 hover:bg-navy/10 transition-colors cursor-pointer"
                        >
                          Réinitialiser les filtres
                        </button>
                        <Link
                          href="/admin/planning"
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange hover:bg-orange/90 transition-colors shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Programmer une séance</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((s) => {
                  const startDate = new Date(s.start_time);
                  const teacherName = s.teacher
                    ? `${s.teacher.first_name || ""} ${s.teacher.last_name || ""}`.trim()
                    : "Professeur";

                  const presentCount = (s.attendance || []).filter((a) => a.present).length;
                  const totalInClass = s.attendance?.length || 0;
                  const rate =
                    totalInClass > 0 ? Math.round((presentCount / totalInClass) * 100) : 100;

                  return (
                    <tr key={s.id} className="hover:bg-blue-vlight/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-navy text-sm">{s.title}</div>
                        <div className="text-[11px] text-navy/50 mt-0.5">
                          {s.subject?.name} • <span className="font-semibold text-teal-dark">{s.subject?.class_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-bold text-navy">
                          <User className="w-3.5 h-3.5 text-navy/40" />
                          <span>{teacherName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-navy/60 font-medium">
                        {startDate.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        à {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black px-2.5 py-0.5 rounded-full text-[10px] ${
                              rate >= 80
                                ? "bg-teal-50 text-teal-dark"
                                : rate >= 50
                                ? "bg-orange/10 text-orange"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {presentCount} / {totalInClass} ({rate}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {s.replay_url ? (
                          <button
                            onClick={() => setSelectedReplaySession(s)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-orange bg-orange/10 hover:bg-orange/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-orange" /> Voir Replay
                          </button>
                        ) : (
                          <span className="text-[10px] text-navy/40">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedSessionForDetails(s)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-vlight hover:bg-turquoise/15 text-navy hover:text-teal-dark font-bold text-xs transition-colors cursor-pointer border border-navy/5"
                        >
                          Voir l&apos;appel ➔
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barre de pagination */}
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredSessions.length}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="séances"
        />
      </div>

      {/* MODALE : Détail de la Feuille d'Émargement */}
      {selectedSessionForDetails && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Feuille d&apos;Émargement Officielle
                </span>
                <h3 className="text-xl font-black text-navy">{selectedSessionForDetails.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedSessionForDetails.subject?.name} • {selectedSessionForDetails.subject?.class_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionForDetails(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Students Attendance */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!selectedSessionForDetails.attendance ||
                selectedSessionForDetails.attendance.length === 0) ? (
                <div className="text-center py-6 text-xs text-navy/40">
                  Aucun élève inscrit pour cette séance.
                </div>
              ) : (
                selectedSessionForDetails.attendance.map((att) => {
                  const studentName = att.student
                    ? `${att.student.first_name || ""} ${att.student.last_name || ""}`.trim() ||
                      att.student.email
                    : "Élève";

                  const isScheduled = selectedSessionForDetails.status === "scheduled";
                  const isLive = selectedSessionForDetails.status === "live";

                  let statusBadgeText = "Absent";
                  let statusBg = "bg-red-50/40 border-red-200";
                  let iconBg = "bg-red-200 text-red-700";
                  let icon = <XCircle className="w-4 h-4" />;

                  if (att.present) {
                    statusBadgeText = "Présent au direct";
                    statusBg = "bg-teal-50/60 border-turquoise/30";
                    iconBg = "bg-turquoise text-white";
                    icon = <CheckCircle2 className="w-4 h-4" />;
                  } else if (isScheduled) {
                    statusBadgeText = "Inscrit — En attente du démarrage";
                    statusBg = "bg-blue-50/50 border-sky-200";
                    iconBg = "bg-sky-100 text-sky-700";
                    icon = <Clock className="w-4 h-4" />;
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
                          <div className="text-[10px] text-navy/60 font-medium">
                            {statusBadgeText}
                          </div>
                        </div>
                      </div>

                      {att.present && att.marked_at && (
                        <span className="text-[10px] text-teal-dark font-bold font-mono">
                          Émargé à {new Date(att.marked_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setSelectedSessionForDetails(null)}
              className="w-full bg-navy text-white font-bold text-xs py-3.5 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Fermer la feuille d&apos;émargement
            </button>
          </div>
        </div>
      )}

      {/* MODALE : Visionneuse Replay Vidéo */}
      {selectedReplaySession && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-turquoise" />
                  Replay Vidéo de Cours
                </span>
                <h3 className="text-xl font-black text-navy">{selectedReplaySession.title}</h3>
                <p className="text-xs text-navy/60">
                  {selectedReplaySession.subject?.name} • {selectedReplaySession.subject?.class_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReplaySession(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl hover:bg-navy/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
              {selectedReplaySession.replay_url ? (
                <ReplayPlayer
                  src={selectedReplaySession.replay_url}
                  title={`${selectedReplaySession.subject?.name} • ${selectedReplaySession.title}`}
                />
              ) : (
                <div className="text-white/40 text-xs bg-black w-full h-full flex items-center justify-center">
                  Aucune vidéo disponible
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <a
                href={selectedReplaySession.replay_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-teal-dark hover:text-turquoise transition-colors"
              >
                Ouvrir en plein écran dans un nouvel onglet ➔
              </a>

              <button
                onClick={() => setSelectedReplaySession(null)}
                className="px-6 py-2.5 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy/90 transition-colors cursor-pointer"
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
