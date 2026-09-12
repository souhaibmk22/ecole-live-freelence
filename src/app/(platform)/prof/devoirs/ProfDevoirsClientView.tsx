"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  Plus,
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  X,
  UploadCloud,
  FileText,
  Sparkles,
  Award,
  ChevronRight,
  Loader2,
  ExternalLink,
  Eye,
  Camera,
  Lightbulb,
  Check,
  Search,
  GraduationCap,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Assignment, Profile, SubjectItem } from "@/lib/types";
import {
  createAssignmentAction,
  deleteAssignmentAction,
  fetchAssignmentSubmissionsAction,
  gradeSubmissionAction,
  fetchTeacherAssignmentsAction,
  saveAssignmentSolutionAction,
} from "./actions";
import CameraCaptureModal from "@/components/platform/CameraCaptureModal";
import UniversalDocumentViewerModal, { DocumentViewerItem } from "@/components/platform/UniversalDocumentViewerModal";
import AttachmentActionCard from "@/components/platform/AttachmentActionCard";
import { createClient } from "@/lib/supabase/client";

interface ProfDevoirsClientViewProps {
  teacher: Profile;
  assignedSubjects: SubjectItem[];
  initialAssignments: Assignment[];
  allClasses?: { id: string; name: string }[];
}

export default function ProfDevoirsClientView({
  teacher,
  assignedSubjects,
  initialAssignments,
  allClasses = [],
}: ProfDevoirsClientViewProps) {
  const isSupervisionOnly = teacher.role === "admin" || teacher.role === "super_admin";
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [activeDocumentViewer, setActiveDocumentViewer] = useState<DocumentViewerItem | null>(null);

  const openDocumentViewer = (url: string, fileName?: string, title?: string) => {
    if (!url) return;
    setActiveDocumentViewer({
      url,
      fileName: fileName || "Document",
      title: title || fileName || "Visualisation du document",
      subtitle: `${teacher.first_name || ""} ${teacher.last_name || ""} • Espace Enseignant`,
    });
  };

  // Synchronisation Realtime des devoirs (Zéro Polling)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const reloadAssignments = () => {
      fetchTeacherAssignmentsAction().then((res) => {
        if (res.success && res.data) setAssignments(res.data);
      });
    };

    const uniqueChannelName = `prof_assignments_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        reloadAssignments
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignment_submissions" },
        reloadAssignments
      )
      .subscribe();

    const handleOnline = reloadAssignments;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now();
      } else if (document.visibilityState === "visible") {
        if (Date.now() - hiddenSince > 120000) {
          reloadAssignments();
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

  // Extraire les classes uniques
  const distinctClasses =
    allClasses.length > 0
      ? allClasses
      : Array.from(
          new Map(
            assignedSubjects
              .filter((s) => s.class_id && s.class_name)
              .map((s) => [s.class_id, { id: s.class_id, name: s.class_name }])
          ).values()
        );

  // Modale de création
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedModalClassId, setSelectedModalClassId] = useState(
    distinctClasses.length > 0 ? distinctClasses[0].id : ""
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    assignedSubjects.length > 0 ? assignedSubjects[0].id : ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [maxPoints, setMaxPoints] = useState(20);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Modale Corrigé & Solution
  const [solutionModalAssignment, setSolutionModalAssignment] = useState<Assignment | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [solutionText, setSolutionText] = useState("");
  const [solutionPublished, setSolutionPublished] = useState(false);
  const [solutionCameraOpen, setSolutionCameraOpen] = useState(false);
  const [savingSolution, setSavingSolution] = useState(false);

  // Panneau / Modale de notation et corrections
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingStudents, setGradingStudents] = useState<any[]>([]);
  const [gradingSubmissions, setGradingSubmissions] = useState<any[]>([]);
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Filtres principaux
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const hasActiveFilters =
    selectedClassFilter !== "all" ||
    selectedSubjectFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetAllFilters = () => {
    setSelectedClassFilter("all");
    setSelectedSubjectFilter("all");
    setSearchQuery("");
  };

  // Matières disponibles pour le filtre selon la classe sélectionnée
  const distinctSubjectNames = Array.from(
    new Set(assignedSubjects.map((s) => s.name.trim()))
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const availableSubjectsInSelectedClass =
    selectedClassFilter === "all"
      ? []
      : assignedSubjects.filter((s) => s.class_id === selectedClassFilter);

  // Matières disponibles dans la modale selon la classe choisie
  const availableSubjectsForModal = assignedSubjects.filter(
    (s) => s.class_id === selectedModalClassId
  );

  // Mise à jour de la matière dans la modale quand la classe change
  const handleModalClassChange = (classId: string) => {
    setSelectedModalClassId(classId);
    const subjectsInClass = assignedSubjects.filter((s) => s.class_id === classId);
    if (subjectsInClass.length > 0) {
      setSelectedSubjectId(subjectsInClass[0].id);
    } else {
      setSelectedSubjectId("");
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    // Filtre par classe
    if (selectedClassFilter !== "all") {
      const sub = assignedSubjects.find((s) => s.id === a.subject_id);
      if (sub && sub.class_id !== selectedClassFilter) return false;
    }
    // Filtre par matière
    if (selectedSubjectFilter !== "all") {
      if (selectedClassFilter === "all") {
        // Filtre par nom de matière distinct
        const subName = a.subject?.name || assignedSubjects.find((s) => s.id === a.subject_id)?.name;
        if (subName !== selectedSubjectFilter) return false;
      } else {
        // Filtre par ID de matière spécifique dans la classe
        if (a.subject_id !== selectedSubjectFilter) return false;
      }
    }
    // Filtre de recherche textuelle
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      const matchSub = a.subject?.name?.toLowerCase().includes(q);
      const matchClass = a.class_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSub && !matchClass) return false;
    }
    return true;
  });

  // 1. Créer un devoir
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubjectId) return;
    setCreating(true);

    let attachmentUrl = "";
    let attachmentName = "";

    // Upload du fichier sujet si fourni
    if (attachmentFile) {
      setUploadingAttachment(true);
      try {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        formData.append("folder", "subjects");
        formData.append("assignmentId", "new");

        const res = await fetch("/api/assignments/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          attachmentUrl = data.fileUrl;
          attachmentName = data.fileName;
        }
      } catch (uploadErr) {
        console.error("Attachment upload error:", uploadErr);
      } finally {
        setUploadingAttachment(false);
      }
    }

    const res = await createAssignmentAction({
      subjectId: selectedSubjectId,
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate).toISOString(),
      attachmentUrl,
      attachmentName,
      maxPoints,
    });

    if (res.success && res.data) {
      const subjectObj = assignedSubjects.find((s) => s.id === selectedSubjectId);
      const newAssign: Assignment = {
        id: res.data.id,
        subject_id: res.data.subject_id,
        teacher_id: res.data.teacher_id,
        title: res.data.title,
        description: res.data.description,
        due_date: res.data.due_date,
        attachment_url: res.data.attachment_url,
        attachment_name: res.data.attachment_name,
        max_points: res.data.max_points,
        created_at: res.data.created_at,
        solution_url: null,
        solution_name: null,
        solution_text: null,
        solution_published: false,
        subject: subjectObj,
        submissions_count: 0,
        graded_count: 0,
        class_name: subjectObj?.class_name || "Classe",
      };

      setAssignments([newAssign, ...assignments]);
      setCreateModalOpen(false);
      setTitle("");
      setDescription("");
      setAttachmentFile(null);
    } else {
      alert(res.error || "Erreur lors de la création du devoir.");
    }
    setCreating(false);
  };

  // 2. Supprimer un devoir
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce devoir et toutes les copies associées ?")) return;

    const res = await deleteAssignmentAction(assignmentId);
    if (res.success) {
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
      if (gradingAssignment?.id === assignmentId) {
        setGradingAssignment(null);
      }
    }
  };

  // 3. Ouvrir le panneau de correction / consultation
  const handleOpenGrading = async (assignment: Assignment) => {
    setGradingAssignment(assignment);
    setGradingLoading(true);

    const res = await fetchAssignmentSubmissionsAction(assignment.id);
    if (res.success) {
      setGradingStudents(res.students || []);
      setGradingSubmissions(res.submissions || []);

      // Initialiser les champs de saisie pour chaque élève
      const initialInputs: Record<string, { grade: string; feedback: string }> = {};
      (res.students || []).forEach((st: any) => {
        const sub = (res.submissions || []).find((s: any) => s.student_id === st.id);
        initialInputs[st.id] = {
          grade: sub?.grade !== null && sub?.grade !== undefined ? String(sub.grade) : "",
          feedback: sub?.feedback || "",
        };
      });
      setGradeInputs(initialInputs);
    }
    setGradingLoading(false);
  };

  // 4. Enregistrer la note d'un élève (Professeur uniquement)
  const handleSaveGrade = async (studentId: string) => {
    if (!gradingAssignment || isSupervisionOnly) return;

    const inputData = gradeInputs[studentId] || { grade: "", feedback: "" };
    const numGrade = parseFloat(inputData.grade);

    if (isNaN(numGrade) || numGrade < 0 || numGrade > (gradingAssignment.max_points || 20)) {
      alert(`Veuillez entrer une note valide entre 0 et ${gradingAssignment.max_points || 20}.`);
      return;
    }

    setSavingGrades((prev) => ({ ...prev, [studentId]: true }));

    const res = await gradeSubmissionAction({
      assignmentId: gradingAssignment.id,
      studentId,
      grade: numGrade,
      feedback: inputData.feedback,
    });

    if (res.success) {
      // Mettre à jour les soumissions locales
      const existingSubIndex = gradingSubmissions.findIndex((s) => s.student_id === studentId);
      if (existingSubIndex >= 0) {
        const updated = [...gradingSubmissions];
        updated[existingSubIndex] = {
          ...updated[existingSubIndex],
          grade: numGrade,
          feedback: inputData.feedback,
          status: "graded",
        };
        setGradingSubmissions(updated);
      } else {
        setGradingSubmissions([
          ...gradingSubmissions,
          {
            assignment_id: gradingAssignment.id,
            student_id: studentId,
            grade: numGrade,
            feedback: inputData.feedback,
            status: "graded",
          },
        ]);
      }

      // Mettre à jour le compteur global de l'assignation
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === gradingAssignment.id) {
            const hasGradedBefore = !!gradingSubmissions.find(
              (s) => s.student_id === studentId && s.grade !== null
            );
            return {
              ...a,
              graded_count: hasGradedBefore ? a.graded_count : (a.graded_count || 0) + 1,
            };
          }
          return a;
        })
      );

      setSaveSuccessToast("Note enregistrée avec succès !");
      setTimeout(() => setSaveSuccessToast(null), 2500);
    } else {
      alert(res.error || "Erreur lors de l'enregistrement de la note.");
    }

    setSavingGrades((prev) => ({ ...prev, [studentId]: false }));
  };

  // 5. Ouvrir la modale de gestion du corrigé
  const handleOpenSolution = (assignment: Assignment) => {
    setSolutionModalAssignment(assignment);
    setSolutionFile(null);
    setSolutionText(assignment.solution_text || "");
    setSolutionPublished(!!assignment.solution_published);
  };

  // 6. Enregistrer le corrigé
  const handleSaveSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionModalAssignment) return;
    setSavingSolution(true);

    let finalSolutionUrl = solutionModalAssignment.solution_url || "";
    let finalSolutionName = solutionModalAssignment.solution_name || "";

    if (solutionFile) {
      try {
        const formData = new FormData();
        formData.append("file", solutionFile);
        formData.append("folder", "solutions");
        formData.append("assignmentId", solutionModalAssignment.id);

        const res = await fetch("/api/assignments/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          finalSolutionUrl = data.fileUrl;
          finalSolutionName = data.fileName;
        }
      } catch (uploadErr) {
        console.error("Solution file upload error:", uploadErr);
      }
    }

    const res = await saveAssignmentSolutionAction({
      assignmentId: solutionModalAssignment.id,
      solutionUrl: finalSolutionUrl,
      solutionName: finalSolutionName,
      solutionText: solutionText.trim(),
      solutionPublished,
    });

    if (res.success) {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === solutionModalAssignment.id) {
            return {
              ...a,
              solution_url: finalSolutionUrl || null,
              solution_name: finalSolutionName || null,
              solution_text: solutionText.trim() || null,
              solution_published: solutionPublished,
            };
          }
          return a;
        })
      );
      setSolutionModalAssignment(null);
      setSaveSuccessToast(
        solutionPublished
          ? "Corrigé enregistré et publié aux élèves avec succès !"
          : "Corrigé enregistré (Actuellement masqué aux élèves)."
      );
      setTimeout(() => setSaveSuccessToast(null), 3500);
    } else {
      alert(res.error || "Erreur lors de l'enregistrement du corrigé.");
    }
    setSavingSolution(false);
  };

  const totalAssignments = assignments.length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissions_count || 0), 0);
  const totalGraded = assignments.reduce((acc, a) => acc + (a.graded_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange/10 text-orange text-xs font-bold uppercase tracking-wider mb-2">
            {isSupervisionOnly ? <Eye className="w-3.5 h-3.5" /> : <FileCheck className="w-3.5 h-3.5" />}
            {isSupervisionOnly ? "Supervision Pédagogique (Consultation)" : "Pédagogie & Évaluations"}
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            {isSupervisionOnly ? "Devoirs & Copies des Élèves" : "Devoirs & Corrections"}
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            {isSupervisionOnly
              ? "Supervisez l'ensemble des devoirs donnés par les professeurs, les copies remises par les élèves et les évaluations attribuées."
              : "Donnez des devoirs à vos élèves, récupérez leurs copies et attribuez les notes sur 20 avec vos appréciations."}
          </p>
        </div>

        {!isSupervisionOnly && (
          <button
            onClick={() => {
              if (distinctClasses.length > 0) {
                handleModalClassChange(distinctClasses[0].id);
              }
              setCreateModalOpen(true);
            }}
            disabled={assignedSubjects.length === 0}
            className="bg-orange hover:bg-orange/90 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-orange/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            Donner un devoir
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-sm">
          <div className="flex items-center justify-between text-navy/60 text-xs font-bold uppercase mb-2">
            <span>Devoirs Donnés</span>
            <FileText className="w-4 h-4 text-orange" />
          </div>
          <div className="text-3xl font-black text-navy">{totalAssignments}</div>
          <div className="text-xs text-navy/40 mt-1">Sur l&apos;ensemble de vos matières</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-sm">
          <div className="flex items-center justify-between text-navy/60 text-xs font-bold uppercase mb-2">
            <span>Copies Reçues</span>
            <UploadCloud className="w-4 h-4 text-turquoise" />
          </div>
          <div className="text-3xl font-black text-teal-dark">{totalSubmissions}</div>
          <div className="text-xs text-navy/40 mt-1">Dépôts élèves effectués</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-navy/5 shadow-sm">
          <div className="flex items-center justify-between text-navy/60 text-xs font-bold uppercase mb-2">
            <span>Copies Corrigées</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {totalGraded} <span className="text-sm font-normal text-navy/40">/ {totalSubmissions}</span>
          </div>
          <div className="text-xs text-navy/40 mt-1">
            {totalSubmissions > 0
              ? `${Math.round((totalGraded / totalSubmissions) * 100)}% de copies notées`
              : "Aucune copie en attente"}
          </div>
        </div>
      </div>

      {/* Barre de Filtres Avancée : Classe, Matière & Recherche */}
      <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm space-y-4">
        {/* En-tête des filtres avec Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-orange" />
            <h3 className="text-sm font-black text-navy uppercase tracking-wider">
              Filtres &amp; Recherche par Classe et Matière
            </h3>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-bold text-orange hover:text-orange/80 flex items-center gap-1.5 cursor-pointer bg-orange/5 px-3 py-1 rounded-xl border border-orange/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser les filtres</span>
              </button>
            )}

            <div className="text-xs font-bold text-navy/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange"></span>
              <span><strong>{filteredAssignments.length}</strong> devoir(s) affiché(s)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
          {/* 1. Filtre par Classe */}
          <div>
            <label className="block text-[11px] font-bold text-navy/60 uppercase mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-navy/70" />
              <span>1. Filtrer par Classe</span>
            </label>
            <div className="relative">
              <select
                value={selectedClassFilter}
                onChange={(e) => {
                  setSelectedClassFilter(e.target.value);
                  setSelectedSubjectFilter("all");
                }}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all border outline-none cursor-pointer appearance-none ${
                  selectedClassFilter !== "all"
                    ? "bg-orange/10 border-orange text-orange-dark font-black shadow-xs"
                    : "bg-blue-vlight/40 border-navy/10 text-navy hover:border-navy/20"
                }`}
              >
                <option value="all">🏫 Toutes les classes</option>
                {distinctClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/40 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 2. Filtre par Matière */}
          <div>
            <label className="block text-[11px] font-bold text-navy/60 uppercase mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-turquoise" />
              <span>2. Filtrer par Matière</span>
            </label>
            <div className="relative">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all border outline-none cursor-pointer appearance-none ${
                  selectedSubjectFilter !== "all"
                    ? "bg-orange/10 border-orange text-orange-dark font-black shadow-xs"
                    : "bg-blue-vlight/40 border-navy/10 text-navy hover:border-navy/20"
                }`}
              >
                <option value="all">
                  {selectedClassFilter === "all"
                    ? "📚 Toutes mes matières"
                    : "📚 Toutes les matières de la classe"}
                </option>
                {selectedClassFilter === "all"
                  ? distinctSubjectNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  : availableSubjectsInSelectedClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/40 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 3. Recherche textuelle */}
          <div>
            <label className="block text-[11px] font-bold text-navy/60 uppercase mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-navy/40" />
              <span>3. Recherche instantanée</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Titre de devoir, consigne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-3 bg-blue-vlight/40 border border-navy/10 rounded-2xl text-xs font-medium text-navy placeholder:text-navy/40 outline-none focus:border-orange focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des devoirs */}
      {assignedSubjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-navy">Aucune matière assignée</h3>
          <p className="text-xs text-navy/60 max-w-md mx-auto">
            L&apos;administrateur doit vous assigner au moins une matière dans une classe pour que vous puissiez donner des devoirs.
          </p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-orange/10 text-orange flex items-center justify-center mx-auto">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy">Aucun devoir trouvé</h3>
          <p className="text-sm text-navy/60 max-w-md mx-auto">
            {assignments.length === 0
              ? "Créez votre premier devoir pour vos élèves avec une date limite et joignez votre sujet."
              : "Aucun devoir ne correspond aux filtres de classe ou matière sélectionnés."}
          </p>
          {!isSupervisionOnly && (
            <button
              onClick={() => {
                if (distinctClasses.length > 0) {
                  handleModalClassChange(distinctClasses[0].id);
                }
                setCreateModalOpen(true);
              }}
              className="bg-orange text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md cursor-pointer"
            >
              Donner un devoir
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assign) => {
            const dueDateObj = new Date(assign.due_date);
            const isPassed = dueDateObj.getTime() < Date.now();
            const subsCount = assign.submissions_count || 0;
            const gradedCount = assign.graded_count || 0;

            return (
              <div
                key={assign.id}
                className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                        {assign.subject?.name || "Matière"}
                      </span>
                      <span className="text-[11px] font-bold text-navy/40 bg-navy/5 px-2 py-0.5 rounded-full">
                        {assign.class_name}
                      </span>
                    </div>

                    {!isSupervisionOnly && (
                      <button
                        onClick={() => handleDeleteAssignment(assign.id)}
                        className="text-navy/30 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer le devoir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="font-black text-navy text-base leading-snug mb-2">
                    {assign.title}
                  </h3>

                  {assign.description && (
                    <p className="text-xs text-navy/60 line-clamp-2 leading-relaxed mb-4">
                      {assign.description}
                    </p>
                  )}

                  {/* Date limite & Pièce jointe */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-navy/70">
                      <Clock className="w-3.5 h-3.5 text-orange" />
                      <span>
                        À rendre pour le :{" "}
                        <strong className={isPassed ? "text-red-500" : "text-navy"}>
                          {dueDateObj.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    </div>

                    {assign.attachment_url && (
                      <AttachmentActionCard
                        url={assign.attachment_url}
                        fileName={assign.attachment_name || "Sujet_du_devoir"}
                        label="Sujet du devoir"
                        onView={openDocumentViewer}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-navy/5 space-y-2.5">
                  {/* Progression des corrections */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-navy/60 font-medium">Copies rendues</span>
                    <span className="font-black text-navy">
                      {subsCount} remise(s) • <span className="text-emerald-600">{gradedCount} notée(s)</span>
                    </span>
                  </div>

                  {/* Statut du corrigé */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-navy/50">Corrigé officiel</span>
                    {assign.solution_url || assign.solution_text ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        assign.solution_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        {assign.solution_published ? "Publié aux élèves" : "Prêt (Masqué)"}
                      </span>
                    ) : (
                      <span className="text-[10px] text-navy/40 font-medium italic">Non renseigné</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenGrading(assign)}
                    className="w-full bg-navy hover:bg-turquoise text-white font-bold text-xs py-2.5 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSupervisionOnly ? <Eye className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                    <span>{isSupervisionOnly ? "Consulter les copies & Statuts ➔" : "Corriger & Noter la classe ➔"}</span>
                  </button>

                  {!isSupervisionOnly && (
                    <button
                      onClick={() => handleOpenSolution(assign)}
                      className="w-full bg-blue-vlight/70 hover:bg-orange/10 hover:text-orange text-navy/80 font-bold text-xs py-2.5 rounded-2xl border border-navy/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>{assign.solution_url || assign.solution_text ? "Gérer le Corrigé / Solution" : "+ Ajouter le Corrigé officiel"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE : Créer un devoir (Sélection Classe -> Matière) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Évaluation &amp; Travaux
                </span>
                <h3 className="text-xl font-black text-navy">Donner un Nouveau Devoir</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Étape 1 : Choisir la Classe */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-navy/70" />
                  <span>1. Classe ciblée</span>
                </label>
                <select
                  value={selectedModalClassId}
                  onChange={(e) => handleModalClassChange(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {distinctClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Étape 2 : Choisir la Matière de cette Classe */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-turquoise" />
                  <span>2. Matière</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {availableSubjectsForModal.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Titre du Devoir
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dissertation : Les figures de style en poésie"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Consignes &amp; Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Expliquez les consignes, le barème et les attentes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Date &amp; Heure limite
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Note Maximale
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Pièce jointe optionnelle */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Document joint / Sujet (PDF, Word, Photo)
                </label>

                {attachmentFile ? (
                  <div className="bg-teal-50 border border-turquoise/30 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-teal-dark shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-navy truncate">{attachmentFile.name}</div>
                        <div className="text-[10px] text-navy/50">{(attachmentFile.size / 1024).toFixed(1)} Ko</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentFile(null)}
                      className="text-navy/40 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                      title="Changer de fichier"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="border-2 border-dashed border-navy/15 hover:border-turquoise bg-blue-vlight/40 hover:bg-blue-vlight/80 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all">
                      <UploadCloud className="w-4 h-4 text-turquoise" />
                      <span className="text-xs font-bold text-navy">Choisir un fichier</span>
                      <span className="text-[10px] text-navy/40">PDF, Word, Image</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.zip"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      className="border-2 border-dashed border-orange/30 hover:border-orange bg-orange/5 hover:bg-orange/10 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all text-orange"
                    >
                      <Camera className="w-4 h-4 text-orange" />
                      <span className="text-xs font-bold">Prendre une photo 📸</span>
                      <span className="text-[10px] text-orange/70">Tableau / Exercice</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || uploadingAttachment || !title.trim()}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {creating || uploadingAttachment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publication...</span>
                    </>
                  ) : (
                    <span>Publier le devoir ➔</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANNEAU / MODALE DE NOTATION OU DE SUPERVISION */}
      {gradingAssignment && (
        <div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-6 max-h-[90vh] flex flex-col">
            {/* Header du panneau */}
            <div className="flex items-start justify-between pb-4 border-b border-navy/5 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-turquoise bg-turquoise/10 px-2.5 py-0.5 rounded-full">
                    {gradingAssignment.subject?.name}
                  </span>
                  <span className="text-xs text-navy/40 font-bold">
                    {gradingAssignment.class_name}
                  </span>
                  {isSupervisionOnly && (
                    <span className="text-[10px] font-bold text-navy/50 bg-navy/5 px-2.5 py-0.5 rounded-full">
                      Consultation Administrateur
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-navy mt-1">
                  {isSupervisionOnly ? "Suivi des Copies :" : "Correction :"} {gradingAssignment.title}
                </h2>
              </div>

              <button
                onClick={() => setGradingAssignment(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer hover:bg-navy/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toast de confirmation de note */}
            {saveSuccessToast && (
              <div className="p-3 bg-teal-50 border border-turquoise/30 rounded-2xl text-xs font-bold text-teal-dark flex items-center gap-2 animate-in fade-in shrink-0">
                <CheckCircle2 className="w-4 h-4 text-turquoise shrink-0" />
                <span>{saveSuccessToast}</span>
              </div>
            )}

            {/* Liste des élèves et de leurs copies */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {gradingLoading ? (
                <div className="py-12 text-center text-xs text-navy/50 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-turquoise" />
                  <span>Chargement des copies de la classe...</span>
                </div>
              ) : gradingStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-navy/40 bg-blue-vlight/40 rounded-2xl">
                  Aucun élève inscrit dans cette classe pour le moment.
                </div>
              ) : (
                gradingStudents.map((st) => {
                  const studentName = `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.email;
                  const submission = gradingSubmissions.find((s) => s.student_id === st.id);
                  const isSubmitted = !!submission && !!submission.file_url;
                  const isGraded = submission?.grade !== null && submission?.grade !== undefined;
                  const currentInput = gradeInputs[st.id] || { grade: "", feedback: "" };
                  const isSaving = !!savingGrades[st.id];

                  return (
                    <div
                      key={st.id}
                      className="bg-blue-vlight/30 border border-navy/5 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-turquoise/30 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-navy text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {st.first_name?.[0] || "E"}{st.last_name?.[0] || "L"}
                          </div>
                          <div>
                            <div className="font-bold text-navy text-sm">{studentName}</div>
                            <div className="text-[11px] text-navy/40">{st.email}</div>
                          </div>
                        </div>

                        {/* Statut du dépôt */}
                        <div className="flex items-center gap-2">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-dark text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-turquoise" />
                              Copie rendue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Non rendu
                            </span>
                          )}

                          {isGraded && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black">
                              <Award className="w-3.5 h-3.5" />
                              {submission.grade} / {gradingAssignment.max_points || 20}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fichier rendu par l'élève */}
                      {isSubmitted && (
                        <AttachmentActionCard
                          url={submission.file_url}
                          fileName={submission.file_name || "Copie_eleve.pdf"}
                          label={`Copie de ${studentName}`}
                          onView={openDocumentViewer}
                          compact={true}
                        />
                      )}

                      {/* Commentaire laissé par l'élève */}
                      {submission?.student_comment && (
                        <div className="text-xs text-navy/70 italic bg-white/60 p-2.5 rounded-xl border border-navy/5">
                          « {submission.student_comment} »
                        </div>
                      )}

                      {/* Section Note & Appréciation */}
                      {isSupervisionOnly ? (
                        <div className="pt-3 border-t border-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/70 p-3 rounded-xl border border-navy/5">
                          {isGraded ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-navy/50">Note Enseignant :</span>
                                <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                  {submission.grade} / {gradingAssignment.max_points || 20}
                                </span>
                              </div>
                              {submission.feedback && (
                                <div className="text-xs text-navy/70 italic bg-teal-50/50 p-2 rounded-xl border border-turquoise/10 flex-1">
                                  « {submission.feedback} »
                                </div>
                              )}
                            </>
                          ) : isSubmitted ? (
                            <span className="text-xs text-navy/50 font-medium italic">
                              ⏳ Copie déposée par l&apos;élève — En attente de correction par le professeur.
                            </span>
                          ) : (
                            <span className="text-xs text-red-500/80 font-medium">
                              ⚠️ Devoir non encore rendu par cet élève.
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-navy/5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-navy uppercase mb-1">
                              Note (/{gradingAssignment.max_points || 20})
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={gradingAssignment.max_points || 20}
                              placeholder="Ex: 16.5"
                              value={currentInput.grade}
                              onChange={(e) =>
                                setGradeInputs((prev) => ({
                                  ...prev,
                                  [st.id]: { ...prev[st.id], grade: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2 bg-white border border-navy/10 rounded-xl text-xs font-black text-navy focus:border-turquoise outline-none"
                            />
                          </div>

                          <div className="sm:col-span-6">
                            <label className="block text-[10px] font-bold text-navy uppercase mb-1">
                              Appréciation &amp; Conseils
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Très bon raisonnement, soigner la présentation..."
                              value={currentInput.feedback}
                              onChange={(e) =>
                                setGradeInputs((prev) => ({
                                  ...prev,
                                  [st.id]: { ...prev[st.id], feedback: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2 bg-white border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise outline-none"
                            />
                          </div>

                          <div className="sm:col-span-3 sm:pt-4">
                            <button
                              onClick={() => handleSaveGrade(st.id)}
                              disabled={isSaving || !currentInput.grade}
                              className="w-full bg-orange hover:bg-orange/90 text-white font-bold text-xs py-2 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span>Enregistrer</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE CAMERA SCANNER POUR LE PROFESSEUR */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => setAttachmentFile(file)}
        title="Prendre une photo du sujet / tableau"
      />

      {/* MODALE : GÉRER LE CORRIGÉ / SOLUTION DU DEVOIR */}
      {solutionModalAssignment && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                    Corrigé &amp; Solution Officielle
                  </span>
                  <h3 className="text-lg font-black text-navy leading-tight">
                    {solutionModalAssignment.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSolutionModalAssignment(null)}
                className="text-navy/40 hover:text-navy p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSolution} className="space-y-4">
              {/* Document ou Photo du corrigé */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Fichier ou Photo du Corrigé (.pdf, .docx, photo manuscrite)
                </label>

                {solutionFile ? (
                  <div className="bg-teal-50 border border-turquoise/30 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-teal-dark shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-navy truncate">{solutionFile.name}</div>
                        <div className="text-[10px] text-navy/50">{(solutionFile.size / 1024).toFixed(1)} Ko</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSolutionFile(null)}
                      className="text-navy/40 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : solutionModalAssignment.solution_url ? (
                  <div className="bg-blue-vlight/60 border border-navy/10 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-navy truncate">
                        {solutionModalAssignment.solution_name || "Corrigé_actuel.pdf"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={solutionModalAssignment.solution_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-turquoise hover:underline text-xs font-bold"
                      >
                        Voir
                      </a>
                      <label className="text-xs text-orange font-bold hover:underline cursor-pointer">
                        Remplacer
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.zip"
                          onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="border-2 border-dashed border-navy/15 hover:border-turquoise bg-blue-vlight/40 hover:bg-blue-vlight/80 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all">
                      <UploadCloud className="w-5 h-5 text-turquoise" />
                      <span className="text-xs font-bold text-navy">Choisir un fichier</span>
                      <span className="text-[10px] text-navy/40">PDF, Word, Image</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.zip"
                        onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setSolutionCameraOpen(true)}
                      className="border-2 border-dashed border-orange/30 hover:border-orange bg-orange/5 hover:bg-orange/10 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all text-orange"
                    >
                      <Camera className="w-5 h-5 text-orange" />
                      <span className="text-xs font-bold">Prendre en photo 📸</span>
                      <span className="text-[10px] text-orange/70">Feuille de corrigé</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Explications écrites / Notes de correction */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Explications &amp; Démarche de résolution (Texte explicatif)
                </label>
                <textarea
                  rows={4}
                  placeholder="Détaillez les étapes de résolution, les pièges à éviter ou les barèmes par question..."
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none resize-none"
                />
              </div>

              {/* Toggle de publication */}
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>Publier pour les élèves</span>
                  </div>
                  <div className="text-[11px] text-navy/60">
                    {solutionPublished
                      ? "Les élèves peuvent dès maintenant consulter ce corrigé."
                      : "Le corrigé reste masqué aux élèves tant que vous ne cochez pas cette case."}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={solutionPublished}
                    onChange={(e) => setSolutionPublished(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-navy/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-navy/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setSolutionModalAssignment(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingSolution}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {savingSolution ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer le corrigé ➔</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER POUR LE CORRIGÉ */}
      <CameraCaptureModal
        isOpen={solutionCameraOpen}
        onClose={() => setSolutionCameraOpen(false)}
        onCapture={(file) => setSolutionFile(file)}
        title="Prendre en photo la feuille de corrigé"
      />

      {/* 🖼️ Visionneuse de copies et documents universelle in-app */}
      <UniversalDocumentViewerModal
        document={activeDocumentViewer}
        onClose={() => setActiveDocumentViewer(null)}
      />
    </div>
  );
}
