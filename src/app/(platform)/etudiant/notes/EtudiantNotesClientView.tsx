"use client";

import { useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Profile } from "@/lib/types";
import { StudentGradesReport } from "./actions";

interface EtudiantNotesClientViewProps {
  student: Profile;
  report: StudentGradesReport;
}

export default function EtudiantNotesClientView({
  student,
  report,
}: EtudiantNotesClientViewProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const toggleSubject = (subId: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const getMention = (avg: number | null) => {
    if (avg === null) return { text: "En attente d'évaluations", color: "text-navy/40 bg-navy/5" };
    if (avg >= 16) return { text: "Mention Très Bien 🌟", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (avg >= 14) return { text: "Mention Bien ✨", color: "text-teal-dark bg-teal-50 border-turquoise/30" };
    if (avg >= 12) return { text: "Mention Assez Bien 👍", color: "text-sky-700 bg-sky-50 border-sky-200" };
    if (avg >= 10) return { text: "Résultats Satisfaisants 🎯", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: "En cours d'encouragement 💪", color: "text-orange bg-orange/10 border-orange/20" };
  };

  const mention = getMention(report.overallAverage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Award className="w-3.5 h-3.5" />
          Relevé de Notes &amp; Bulletins
        </div>
        <h1 className="text-3xl font-black text-navy tracking-tight">
          Mes Résultats &amp; Moyennes
        </h1>
        <p className="text-sm text-navy/60 mt-1">
          Suivez votre progression scolaire, vos moyennes par matière et les retours pédagogiques de vos enseignants.
        </p>
      </div>

      {/* Résumé Général / Carte d'Honneur */}
      <div className="bg-gradient-to-br from-navy via-[#1e3a4a] to-navy rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-turquoise/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Moyenne Générale */}
          <div className="lg:col-span-4 flex items-center gap-5">
            <div className="w-24 h-24 rounded-3xl bg-white/10 border-2 border-turquoise/40 flex flex-col items-center justify-center shadow-lg shrink-0">
              <span className="text-3xl font-black text-turquoise font-mono">
                {report.overallAverage !== null ? report.overallAverage.toFixed(1) : "--"}
              </span>
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">/ 20</span>
            </div>

            <div>
              <div className="text-xs uppercase font-bold text-white/50 tracking-wider">
                Moyenne Générale
              </div>
              <div className="text-xl font-black text-white mt-0.5">
                {student.first_name || "Élève"} {student.last_name || ""}
              </div>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${mention.color}`}>
                {mention.text}
              </div>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] text-white/50 font-bold uppercase">Évaluations</div>
              <div className="text-2xl font-black text-white mt-1">
                {report.totalEvaluations}
              </div>
              <div className="text-[11px] text-turquoise mt-0.5">Devoirs notés</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] text-white/50 font-bold uppercase">Meilleure Note</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {report.highestGrade !== null ? `${report.highestGrade}/20` : "--"}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">Plus haut score</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-white/50 font-bold uppercase">Matières Notées</div>
              <div className="text-2xl font-black text-orange mt-1">
                {report.subjectsSummary.length}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">Avec devoirs corrigés</div>
            </div>
          </div>
        </div>
      </div>

      {/* Détail par Matière */}
      {report.subjectsSummary.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-blue-vlight text-turquoise flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy">Aucune note pour le moment</h3>
          <p className="text-sm text-navy/60 max-w-md mx-auto">
            Dès que vos professeurs auront corrigé vos premiers devoirs, votre bulletin et vos moyennes s&apos;afficheront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy/50 px-1">
            Résultats Détaillés par Matière
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {report.subjectsSummary.map((sub) => {
              const isExpanded = expandedSubjects[sub.subjectId] ?? true;
              return (
                <div
                  key={sub.subjectId}
                  className="bg-white rounded-3xl border border-navy/5 shadow-sm overflow-hidden transition-all"
                >
                  {/* Header de la matière */}
                  <div
                    onClick={() => toggleSubject(sub.subjectId)}
                    className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-vlight/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-dark font-black flex items-center justify-center text-sm shrink-0">
                        {sub.subjectName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-navy">{sub.subjectName}</h3>
                        <div className="text-xs text-navy/50">
                          {sub.evaluationsCount} devoir(s) noté(s)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Moyenne de la matière */}
                      <div className="text-right">
                        <div className="text-xs text-navy/40 font-bold uppercase">Moyenne</div>
                        <div className="text-xl font-black text-teal-dark font-mono">
                          {sub.average.toFixed(1)}{" "}
                          <span className="text-xs text-navy/40 font-normal">/ 20</span>
                        </div>
                      </div>

                      <div className="text-navy/30">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Liste des devoirs de la matière */}
                  {isExpanded && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-navy/5 space-y-3 bg-blue-vlight/20">
                      {sub.grades.map((gradeItem, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-4 rounded-2xl border border-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-navy text-sm">{gradeItem.title}</div>
                            <div className="flex items-center gap-3 text-xs text-navy/50">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(gradeItem.gradedAt).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span>•</span>
                              <span>Professeur : {gradeItem.teacherName}</span>
                            </div>

                            {gradeItem.feedback && (
                              <div className="text-xs text-navy/80 italic bg-teal-50/50 p-2.5 rounded-xl border border-turquoise/20 mt-2">
                                « {gradeItem.feedback} »
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0 self-end sm:self-center">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-mono font-black text-sm">
                              <Award className="w-4 h-4" />
                              <span>{gradeItem.grade}</span>
                              <span className="text-xs text-emerald-700/50 font-normal">
                                / {gradeItem.maxPoints}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
