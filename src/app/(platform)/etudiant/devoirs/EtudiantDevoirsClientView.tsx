"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileCheck,
  Clock,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
  X,
  Loader2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Camera,
  Lightbulb,
} from "lucide-react";
import { Profile } from "@/lib/types";
import { submitAssignmentAction, fetchStudentAssignmentsAction } from "./actions";
import CameraCaptureModal from "@/components/platform/CameraCaptureModal";
import UniversalDocumentViewerModal, { DocumentViewerItem } from "@/components/platform/UniversalDocumentViewerModal";
import AttachmentActionCard from "@/components/platform/AttachmentActionCard";
import { createClient } from "@/lib/supabase/client";

interface StudentAssignmentItem {
  id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string;
  attachment_url: string | null;
  attachment_name: string | null;
  max_points: number;
  created_at: string;
  solution_url?: string | null;
  solution_name?: string | null;
  solution_text?: string | null;
  solution_published?: boolean;
  subject: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  class_name?: string;
  mySubmission: {
    id: string;
    assignment_id: string;
    student_id: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    student_comment?: string | null;
    submitted_at: string;
    grade?: number | null;
    feedback?: string | null;
    graded_at?: string | null;
    status: string;
  } | null;
}

interface EtudiantDevoirsClientViewProps {
  student: Profile;
  initialAssignments: StudentAssignmentItem[];
  hasClass: boolean;
  classSubjects?: { id: string; name: string }[];
  initialSubjectFilter?: string;
}

export default function EtudiantDevoirsClientView({
  student,
  initialAssignments,
  hasClass,
  classSubjects = [],
  initialSubjectFilter = "all",
}: EtudiantDevoirsClientViewProps) {
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get("subject");
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>(initialAssignments);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string }[]>(classSubjects);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(urlSubject || initialSubjectFilter);
  const [activeTab, setActiveTab] = useState<"pending" | "submitted">("pending");
  const [activeDocumentViewer, setActiveDocumentViewer] = useState<DocumentViewerItem | null>(null);

  // Visionneuse de document universelle interactive
  const openDocumentViewer = (url: string, fileName?: string, title?: string) => {
    if (!url) return;
    setActiveDocumentViewer({
      url,
      fileName: fileName || "Document",
      title: title || fileName || "Visualisation du document",
      subtitle: `${student.first_name || ""} ${student.last_name || ""} • Espace Élève`,
    });
  };

  // Synchroniser le filtre si le paramètre d'URL change
  useEffect(() => {
    if (urlSubject) {
      setSelectedSubjectFilter(urlSubject);
    } else if (initialSubjectFilter) {
      setSelectedSubjectFilter(initialSubjectFilter);
    }
  }, [urlSubject, initialSubjectFilter]);

  // Extraire les matières pour les filtres
  const displaySubjects =
    subjectsList.length > 0
      ? subjectsList
      : classSubjects.length > 0
      ? classSubjects
      : Array.from(
          new Map(
            assignments
              .filter((a) => a.subject)
              .map((a) => [a.subject_id, { id: a.subject_id, name: a.subject?.name || "Matière" }])
          ).values()
        );

  const activeSubjectObj = displaySubjects.find((s) => s.id === selectedSubjectFilter);

  // Synchronisation Realtime des devoirs (Zéro Polling)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const reloadAssignments = () => {
      fetchStudentAssignmentsAction().then((res) => {
        if (res.success) {
          if (res.data) setAssignments(res.data as any);
          if (res.subjects && res.subjects.length > 0) setSubjectsList(res.subjects);
        }
      });
    };

    const uniqueChannelName = `student_assignments_${Math.random().toString(36).substring(2, 9)}`;
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

  // Modale de dépôt de devoir
  const [submittingAssignment, setSubmittingAssignment] = useState<StudentAssignmentItem | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [studentComment, setStudentComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitSuccessToast, setSubmitSuccessToast] = useState<string | null>(null);

  // Modale de consultation du corrigé
  const [viewingSolutionAssignment, setViewingSolutionAssignment] = useState<StudentAssignmentItem | null>(null);

  const pendingAssignments = assignments
    .filter((a) => selectedSubjectFilter === "all" || a.subject_id === selectedSubjectFilter)
    .filter((a) => !a.mySubmission || a.mySubmission.grade === null);

  const completedAssignments = assignments
    .filter((a) => selectedSubjectFilter === "all" || a.subject_id === selectedSubjectFilter)
    .filter((a) => !!a.mySubmission && a.mySubmission.grade !== null);

  // Dépôt de devoir par l'élève
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !submissionFile) return;
    setUploading(true);

    try {
      // 1. Upload du fichier vers Supabase Storage
      const formData = new FormData();
      formData.append("file", submissionFile);
      formData.append("folder", "submissions");
      formData.append("assignmentId", submittingAssignment.id);

      const uploadRes = await fetch("/api/assignments/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        alert(uploadData.error || "Erreur lors du téléversement de votre fichier.");
        setUploading(false);
        return;
      }

      // 2. Enregistrement de la soumission en base
      const res = await submitAssignmentAction({
        assignmentId: submittingAssignment.id,
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
        studentComment: studentComment.trim() || undefined,
      });

      if (res.success) {
        // Mettre à jour l'état local
        setAssignments((prev) =>
          prev.map((a) => {
            if (a.id === submittingAssignment.id) {
              return {
                ...a,
                mySubmission: {
                  id: `temp-${Date.now()}`,
                  assignment_id: a.id,
                  student_id: student.id,
                  file_url: uploadData.fileUrl,
                  file_name: uploadData.fileName,
                  file_size: uploadData.fileSize,
                  student_comment: studentComment.trim() || null,
                  submitted_at: new Date().toISOString(),
                  grade: null,
                  feedback: null,
                  graded_at: null,
                  status: "submitted",
                },
              };
            }
            return a;
          })
        );

        setSubmittingAssignment(null);
        setSubmissionFile(null);
        setStudentComment("");
        setSubmitSuccessToast("Votre copie a été transmise à votre professeur avec succès !");
        setTimeout(() => setSubmitSuccessToast(null), 4000);
      } else {
        alert(res.error || "Erreur lors de la remise de votre devoir.");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      alert(err?.message || "Erreur lors de la transmission de la copie.");
    } finally {
      setUploading(false);
    }
  };

  const displayedList = activeTab === "pending" ? pendingAssignments : completedAssignments;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange/10 text-orange text-xs font-bold uppercase tracking-wider mb-2">
            <FileCheck className="w-3.5 h-3.5" />
            Espace Scolaire &amp; Devoirs
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            {activeSubjectObj ? `Devoirs & Exercices : ${activeSubjectObj.name}` : "Mes Devoirs & Évaluations"}
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            {activeSubjectObj
              ? `Consultez les devoirs à rendre, déposez vos copies et accédez aux corrigés officiels en ${activeSubjectObj.name}.`
              : "Consultez vos devoirs à faire, téléchargez les sujets et déposez vos travaux pour être noté par vos professeurs."}
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-navy/5 shadow-sm self-start md:self-auto">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-navy text-white shadow-sm"
                : "text-navy/60 hover:text-navy"
            }`}
          >
            ⏳ Devoirs à faire ({pendingAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab("submitted")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "submitted"
                ? "bg-navy text-white shadow-sm"
                : "text-navy/60 hover:text-navy"
            }`}
          >
            ✅ Corrigés &amp; Notés ({completedAssignments.length})
          </button>
        </div>
      </div>

      {/* Bannière de focus matière si filtrée */}
      {activeSubjectObj && (
        <div className="bg-orange/10 border border-orange/30 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange/20 text-orange flex items-center justify-center font-black">
              <FileCheck className="w-5 h-5 text-orange" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-orange tracking-wider">
                Matière Sélectionnée
              </div>
              <div className="text-base font-black text-navy">{activeSubjectObj.name}</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className="text-xs font-bold text-navy/70 hover:text-navy bg-white px-3.5 py-2 rounded-xl border border-navy/10 hover:border-navy/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Voir toutes les matières</span>
          </button>
        </div>
      )}

      {/* Filtres par Matière */}
      {displaySubjects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedSubjectFilter === "all"
                ? "bg-navy text-white shadow-sm"
                : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
            }`}
          >
            Toutes les matières ({assignments.length})
          </button>
          {displaySubjects.map((sub) => {
            const count = assignments.filter((a) => a.subject_id === sub.id).length;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectFilter(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === sub.id
                    ? "bg-orange text-white shadow-sm"
                    : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
                }`}
              >
                {sub.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Toast de succès */}
      {submitSuccessToast && (
        <div className="p-4 bg-teal-50 border border-turquoise/30 rounded-2xl text-xs font-bold text-teal-dark flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-turquoise shrink-0" />
          <span>{submitSuccessToast}</span>
        </div>
      )}

      {/* Main Content */}
      {!hasClass ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-navy">Non inscrit dans une classe</h3>
          <p className="text-xs text-navy/60 max-w-md mx-auto">
            Vous n&apos;êtes pas encore assigné à un groupe de cours. L&apos;administration scolaire doit d&apos;abord vous inscrire dans votre classe.
          </p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-orange/10 text-orange flex items-center justify-center mx-auto">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy">
            {activeSubjectObj
              ? `Aucun devoir en ${activeSubjectObj.name} (${activeTab === "pending" ? "à rendre" : "corrigé"})`
              : activeTab === "pending"
              ? "Bravo ! Aucun devoir en attente"
              : "Aucun devoir corrigé pour le moment"}
          </h3>
          <p className="text-sm text-navy/60 max-w-md mx-auto">
            {activeSubjectObj
              ? `Votre professeur d'${activeSubjectObj.name} n'a déposé aucun devoir dans cette rubrique pour le moment.`
              : activeTab === "pending"
              ? "Vous êtes parfaitement à jour dans l'ensemble de vos matières."
              : "Vos notes et corrections apparaîtront ici dès que vos professeurs auront évalué vos copies."}
          </p>
          {selectedSubjectFilter !== "all" && (
            <button
              onClick={() => setSelectedSubjectFilter("all")}
              className="bg-navy text-white text-xs font-bold px-6 py-3 rounded-2xl hover:bg-navy/90 cursor-pointer shadow-md transition-all"
            >
              Afficher toutes les matières ({assignments.length} devoirs)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedList.map((assign) => {
            const dueDateObj = new Date(assign.due_date);
            const isPassed = dueDateObj.getTime() < Date.now();
            const mySub = assign.mySubmission;
            const isSubmitted = !!mySub && !!mySub.file_url;
            const isGraded = mySub?.grade !== null && mySub?.grade !== undefined;

            return (
              <div
                key={assign.id}
                className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-black uppercase text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                      {assign.subject?.name || "Matière"}
                    </span>

                    {/* Badge de statut */}
                    {isGraded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                        <Award className="w-3.5 h-3.5" />
                        {mySub.grade} / {assign.max_points || 20}
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-[11px] font-bold text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                        ✓ Rendu (En attente)
                      </span>
                    ) : isPassed ? (
                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                        Date limite dépassée
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-orange bg-orange/10 px-2.5 py-0.5 rounded-full">
                        À rendre
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-navy text-base leading-snug mb-2">
                    {assign.title}
                  </h3>

                  {assign.description && (
                    <p className="text-xs text-navy/60 leading-relaxed mb-4">
                      {assign.description}
                    </p>
                  )}

                  {/* Date limite & Sujet à télécharger */}
                  <div className="space-y-3 text-xs pt-3 border-t border-navy/5">
                    <div className="flex items-center gap-2 text-navy/70">
                      <Clock className="w-3.5 h-3.5 text-orange shrink-0" />
                      <span>
                        Date limite :{" "}
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
                        label="Sujet & Énoncé officiel"
                        onView={openDocumentViewer}
                      />
                    )}
                  </div>

                  {/* Retour & Appréciation du professeur si noté */}
                  {isGraded && mySub.feedback && (
                    <div className="mt-4 p-3 bg-teal-50/60 border border-turquoise/20 rounded-2xl space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-teal-dark flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Appréciation de l&apos;enseignant :
                      </div>
                      <p className="text-xs text-navy font-medium italic">
                        « {mySub.feedback} »
                      </p>
                    </div>
                  )}

                  {/* Fichier rendu par l'élève */}
                  {isSubmitted && (
                    <div className="mt-3">
                      <AttachmentActionCard
                        url={mySub.file_url}
                        fileName={mySub.file_name || "Ma_copie"}
                        label="Ma copie déposée"
                        onView={openDocumentViewer}
                        compact={true}
                      />
                    </div>
                  )}
                </div>

                {/* Bouton d'action */}
                <div className="pt-4 border-t border-navy/5 space-y-2">
                  {!isGraded ? (
                    <button
                      onClick={() => setSubmittingAssignment(assign)}
                      className={`w-full font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                        isSubmitted
                          ? "bg-blue-vlight hover:bg-turquoise/10 text-navy hover:text-teal-dark border border-navy/10"
                          : "bg-orange hover:bg-orange/90 text-white shadow-orange/20"
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isSubmitted ? "Modifier ma copie" : "Déposer mon travail ➔"}</span>
                    </button>
                  ) : (
                    <div className="text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-2.5 rounded-xl">
                      ✓ Évaluation terminée ({mySub.grade}/{assign.max_points || 20})
                    </div>
                  )}

                  {/* Bouton Corrigé Officiel si publié par le professeur */}
                  {assign.solution_published && (assign.solution_url || assign.solution_text) && (
                    <button
                      onClick={() => setViewingSolutionAssignment(assign)}
                      className="w-full bg-gradient-to-r from-amber-500/10 to-orange/10 hover:from-amber-500/20 hover:to-orange/20 text-orange-dark border border-amber-300/40 font-black text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>Consulter le Corrigé Officiel ➔</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE : Déposer une copie */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  {submittingAssignment.subject?.name}
                </span>
                <h3 className="text-xl font-black text-navy">Rendre mon Devoir</h3>
              </div>
              <button
                onClick={() => setSubmittingAssignment(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-vlight/40 p-4 rounded-2xl border border-navy/5">
              <div className="font-bold text-navy text-sm">{submittingAssignment.title}</div>
              <div className="text-xs text-navy/60 mt-1">
                Barème : sur {submittingAssignment.max_points || 20} points
              </div>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Votre document ou copie (.pdf, .docx, photo)
                </label>

                {submissionFile ? (
                  <div className="bg-teal-50 border border-turquoise/30 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-teal-dark shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-navy truncate">{submissionFile.name}</div>
                        <div className="text-[10px] text-navy/50">{(submissionFile.size / 1024).toFixed(1)} Ko</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmissionFile(null)}
                      className="text-navy/40 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                      title="Supprimer / Changer de photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="border-2 border-dashed border-navy/15 hover:border-turquoise bg-blue-vlight/40 hover:bg-blue-vlight/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all">
                      <UploadCloud className="w-5 h-5 text-turquoise" />
                      <span className="text-xs font-bold text-navy">Choisir un fichier</span>
                      <span className="text-[10px] text-navy/40">PDF, Word, Image</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.zip"
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      className="border-2 border-dashed border-orange/30 hover:border-orange bg-orange/5 hover:bg-orange/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all text-orange"
                    >
                      <Camera className="w-5 h-5 text-orange" />
                      <span className="text-xs font-bold">Prendre une photo 📸</span>
                      <span className="text-[10px] text-orange/70">Caméra / Smartphone</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Remarque ou message pour le professeur (Optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Bonjour Monsieur, voici mon travail. J'ai eu une question sur l'exercice 3..."
                  value={studentComment}
                  onChange={(e) => setStudentComment(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading || !submissionFile}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Envoi de votre copie...</span>
                    </>
                  ) : (
                    <span>Transmettre mon devoir ➔</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CAMERA SCANNER */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => setSubmissionFile(file)}
        title="Prendre une photo de votre copie"
      />

      {/* MODALE : VISUALISER LE CORRIGÉ DU PROFESSEUR */}
      {viewingSolutionAssignment && (
        <div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-navy/5 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-navy/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                    {viewingSolutionAssignment.subject?.name} • Corrigé Officiel
                  </span>
                  <h3 className="text-lg font-black text-navy leading-tight">
                    {viewingSolutionAssignment.title}
                  </h3>
                  <div className="text-xs text-navy/50 mt-0.5">
                    Par {viewingSolutionAssignment.teacher?.first_name} {viewingSolutionAssignment.teacher?.last_name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingSolutionAssignment(null)}
                className="text-navy/40 hover:text-navy p-1.5 rounded-xl cursor-pointer hover:bg-navy/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explications écrites du professeur */}
            {viewingSolutionAssignment.solution_text && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-navy/60">
                  Notes &amp; Démarche de résolution
                </label>
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 text-xs text-navy/80 whitespace-pre-line leading-relaxed font-medium">
                  {viewingSolutionAssignment.solution_text}
                </div>
              </div>
            )}

            {/* Fichier joint ou Photo du corrigé */}
            {viewingSolutionAssignment.solution_url && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-navy/60">
                  Document ou Photo du Corrigé
                </label>
                <AttachmentActionCard
                  url={viewingSolutionAssignment.solution_url}
                  fileName={viewingSolutionAssignment.solution_name || "Corrige_officiel"}
                  label={`${viewingSolutionAssignment.title} • Corrigé Officiel`}
                  onView={openDocumentViewer}
                />
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingSolutionAssignment(null)}
                className="bg-navy text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer hover:bg-navy/90"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Visionneuse de document universelle in-app (PDF, Images, Vidéos, Documents) */}
      <UniversalDocumentViewerModal
        document={activeDocumentViewer}
        onClose={() => setActiveDocumentViewer(null)}
      />
    </div>
  );
}
