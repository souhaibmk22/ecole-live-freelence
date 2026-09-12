"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Award,
} from "lucide-react";
import { ParentChildInfo } from "@/lib/types";
import ParentChildSelector from "@/components/platform/ParentChildSelector";
import { fetchChildDevoirsAction } from "../actions";
import UniversalDocumentViewerModal, { DocumentViewerItem } from "@/components/platform/UniversalDocumentViewerModal";
import AttachmentActionCard from "@/components/platform/AttachmentActionCard";

interface ParentDevoirsClientViewProps {
  initialChildren: ParentChildInfo[];
}

export default function ParentDevoirsClientView({
  initialChildren,
}: ParentDevoirsClientViewProps) {
  const [childrenList] = useState<ParentChildInfo[]>(initialChildren);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildren[0]?.id || ""
  );

  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [activeDocumentViewer, setActiveDocumentViewer] = useState<DocumentViewerItem | null>(null);

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  const openDocumentViewer = (url: string, fileName?: string, title?: string) => {
    if (!url) return;
    setActiveDocumentViewer({
      url,
      fileName: fileName || "Document",
      title: title || fileName || "Visualisation du document",
      subtitle: `${activeChild?.first_name || "Élève"} • Espace Parent`,
    });
  };

  useEffect(() => {
    if (!selectedChildId) return;

    let isMounted = true;
    setLoading(true);

    fetchChildDevoirsAction(selectedChildId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) setAssignments(res.assignments || []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);

  const filteredAssignments = assignments.filter((a) => {
    const isSubmitted = !!a.submission;
    const isGraded = a.submission && a.submission.grade !== null && a.submission.grade !== undefined;

    if (filter === "pending") return !isSubmitted;
    if (filter === "submitted") return isSubmitted && !isGraded;
    if (filter === "graded") return isGraded;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange/10 text-orange font-bold text-xs uppercase tracking-wider mb-1">
            <FileCheck className="w-3.5 h-3.5 text-orange" />
            Suivi des Devoirs & Évaluations
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Devoirs de {activeChild?.first_name || "votre enfant"}
          </h1>
          <p className="text-xs sm:text-sm text-navy/60">
            Consultez les devoirs assignés, les rendus et les retours des professeurs.
          </p>
        </div>

        <ParentChildSelector
          childrenList={childrenList}
          selectedChildId={selectedChildId}
          onSelectChild={(id) => setSelectedChildId(id)}
        />
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            filter === "all"
              ? "bg-navy text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
          }`}
        >
          Tous ({assignments.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            filter === "pending"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-amber-50 border border-navy/5"
          }`}
        >
          À faire ({assignments.filter((a) => !a.submission).length})
        </button>
        <button
          onClick={() => setFilter("submitted")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            filter === "submitted"
              ? "bg-turquoise text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-turquoise/10 border border-navy/5"
          }`}
        >
          Rendus en attente ({assignments.filter((a) => a.submission && a.submission.grade === null).length})
        </button>
        <button
          onClick={() => setFilter("graded")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            filter === "graded"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-purple-50 border border-navy/5"
          }`}
        >
          Corrigés & Notés ({assignments.filter((a) => a.submission && a.submission.grade !== null).length})
        </button>
      </div>

      {/* Liste des devoirs */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-xs text-navy/40 border border-navy/5">
          Chargement des devoirs...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-2">
          <FileCheck className="w-10 h-10 text-navy/30 mx-auto" />
          <h3 className="text-sm font-bold text-navy">Aucun devoir dans cette catégorie</h3>
          <p className="text-xs text-navy/50">Sélectionnez un autre filtre pour voir les travaux.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((a) => {
            const isSubmitted = !!a.submission;
            const grade = a.submission?.grade;
            const feedback = a.submission?.feedback;
            const dueDate = new Date(a.due_date);

            return (
              <div
                key={a.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                        {a.subject_name}
                      </span>
                      <span className="text-xs text-navy/50">• Prof : {a.teacher_name}</span>
                    </div>
                    <h3 className="text-base font-black text-navy">{a.title}</h3>
                  </div>

                  {/* Badge statut / Note */}
                  <div className="shrink-0">
                    {grade !== null && grade !== undefined ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-purple-100 border border-purple-200 text-purple-800">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-black">Note : {grade}/20</span>
                      </div>
                    ) : isSubmitted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Rendu (En attente de correction)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600" /> À rendre avant le {dueDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description de la consigne */}
                {a.description && (
                  <p className="text-xs text-navy/70 bg-blue-vlight/30 p-3.5 rounded-2xl leading-relaxed">
                    {a.description}
                  </p>
                )}

                {/* Pièces jointes (Sujet, Copie rendue, Corrigé) */}
                <div className="space-y-2 pt-2 border-t border-navy/5">
                  {a.attachment_url && (
                    <AttachmentActionCard
                      url={a.attachment_url}
                      fileName={a.attachment_name || "Sujet_du_devoir"}
                      label="Sujet & Énoncé"
                      onView={openDocumentViewer}
                    />
                  )}

                  {isSubmitted && a.submission?.file_url && (
                    <AttachmentActionCard
                      url={a.submission.file_url}
                      fileName={a.submission.file_name || "Copie_rendue"}
                      label={`Copie rendue par ${activeChild?.first_name || "votre enfant"}`}
                      onView={openDocumentViewer}
                      compact={true}
                    />
                  )}

                  {a.solution_published && a.solution_url && (
                    <AttachmentActionCard
                      url={a.solution_url}
                      fileName={a.solution_name || "Corrige_officiel"}
                      label="Corrigé officiel"
                      onView={openDocumentViewer}
                    />
                  )}
                </div>

                {/* Retour du professeur si corrigé */}
                {feedback && (
                  <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                      Appréciation du professeur :
                    </span>
                    <p className="text-xs text-purple-950 font-medium leading-relaxed italic">
                      « {feedback} »
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 📄 Visionneuse Universelle de Documents */}
      <UniversalDocumentViewerModal
        document={activeDocumentViewer}
        onClose={() => setActiveDocumentViewer(null)}
      />
    </div>
  );
}
