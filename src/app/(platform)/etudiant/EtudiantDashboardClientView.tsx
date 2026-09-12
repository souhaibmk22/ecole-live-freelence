"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileCheck,
  Award,
  Video,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  GraduationCap,
  X,
  FileText,
  ChevronRight,
  User,
  Lightbulb,
} from "lucide-react";
import StatCard from "@/components/platform/StatCard";

interface EtudiantDashboardClientViewProps {
  studentClass: any;
  classSubjects: any[];
  pendingAssignmentsCount: number;
  upcomingLiveCount: number;
}

export default function EtudiantDashboardClientView({
  studentClass,
  classSubjects,
  pendingAssignmentsCount,
  upcomingLiveCount,
}: EtudiantDashboardClientViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-sky-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Espace Apprenant
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Tableau de Bord Élève
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Bienvenue sur votre espace de classe virtuelle. Cliquez sur une matière pour accéder directement à ses cours et devoirs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/etudiant/planning"
            className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-orange/20 transition-all flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Rejoindre mes cours
          </Link>
        </div>
      </div>

      {/* Class Enrollment Banner */}
      <div className="bg-gradient-to-r from-[#1a2e3b] to-[#243f52] text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange/20 text-orange flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
              Mon Groupe / Classe
            </span>
            <h3 className="text-xl font-black text-white">
              {studentClass ? studentClass.name : "Non encore inscrit dans une classe"}
            </h3>
            {studentClass && (
              <p className="text-xs text-white/60">
                {studentClass.cycle} • Niveau {studentClass.level}
              </p>
            )}
          </div>
        </div>

        {!studentClass && (
          <span className="text-xs bg-white/10 text-white/80 px-3 py-1.5 rounded-xl">
            L&apos;administrateur va bientôt vous affecter à un groupe
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link href="/etudiant/planning" className="block cursor-pointer">
          <StatCard
            title="Prochains Directs"
            value={String(upcomingLiveCount)}
            subtitle="Séances à venir"
            icon={Calendar}
            color="turquoise"
            badge="Live"
          />
        </Link>
        <Link href="/etudiant/devoirs" className="block cursor-pointer">
          <StatCard
            title="Devoirs à Rendre"
            value={String(pendingAssignmentsCount)}
            subtitle="Exercices en attente"
            icon={FileCheck}
            color="orange"
            badge="Travail"
          />
        </Link>
        <div className="block">
          <StatCard
            title="Matières Actives"
            value={classSubjects.length}
            subtitle="Au programme de votre classe"
            icon={Award}
            color="navy"
            badge="Programme"
          />
        </div>
      </div>

      {/* Mes Matières & Accès Direct aux Cours et Devoirs */}
      {classSubjects.length > 0 && (
        <div className="bg-white rounded-3xl p-7 border border-navy/5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-navy flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-turquoise" />
                Programme de ma classe ({classSubjects.length} matières)
              </h3>
              <p className="text-xs text-navy/50 mt-0.5">
                👉 Cliquez sur une matière pour ouvrir directement ses supports de cours ou ses devoirs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classSubjects.map((sub: any) => {
              const teacherProfile = sub.teacher_subjects?.[0]?.profiles || sub.teacher;
              const teacherName = teacherProfile
                ? `${teacherProfile.first_name || ""} ${teacherProfile.last_name || ""}`.trim()
                : "Professeur non assigné";

              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  className="p-5 rounded-2xl bg-blue-vlight/40 hover:bg-white border border-navy/5 hover:border-turquoise/40 hover:shadow-md transition-all flex flex-col justify-between text-left group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          sub.is_mandatory
                            ? "text-orange bg-orange/10"
                            : "text-teal-dark bg-teal-50"
                        }`}
                      >
                        {sub.is_mandatory ? "Socle Commun" : "Option"}
                      </span>

                      <span className="text-[11px] font-bold text-turquoise opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Ouvrir <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <h4 className="font-black text-navy text-base mt-2.5 group-hover:text-turquoise transition-colors">
                      {sub.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-navy/5 text-xs text-navy/60 flex items-center justify-between font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-navy/40 shrink-0" />
                      <span className="truncate">{teacherName}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-turquoise/10 text-turquoise flex items-center justify-center mb-4">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-1.5">Cours en Direct</h3>
            <p className="text-xs text-navy/60 leading-relaxed mb-5">
              Accédez à la salle Jitsi Meet de votre classe dès que votre professeur démarre le cours.
            </p>
          </div>
          <Link
            href="/etudiant/planning"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-turquoise hover:text-turquoise/80 transition-colors"
          >
            Voir mon planning <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-orange/10 text-orange flex items-center justify-center mb-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-1.5">Mes Devoirs</h3>
            <p className="text-xs text-navy/60 leading-relaxed mb-5">
              Consultez les consignes, téléchargez les énoncés et déposez vos fichiers avant la date limite.
            </p>
          </div>
          <Link
            href="/etudiant/devoirs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange hover:text-orange/80 transition-colors"
          >
            Accéder à mes devoirs <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-navy/10 text-navy flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-1.5">Mes Notes</h3>
            <p className="text-xs text-navy/60 leading-relaxed mb-5">
              Consultez vos évaluations par matière ainsi que les conseils et appréciations de vos professeurs.
            </p>
          </div>
          <Link
            href="/etudiant/notes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-navy/80 transition-colors"
          >
            Consulter mon relevé <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* MODALE DE CHOIX : ESPACE MATIÈRE (COURS OU DEVOIR) */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6 animate-in fade-in zoom-in duration-150">
            {/* Header de la modale */}
            <div className="flex items-start justify-between pb-4 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase text-turquoise bg-turquoise/10 px-2.5 py-0.5 rounded-full">
                  Espace Matière
                </span>
                <h2 className="text-2xl font-black text-navy mt-1.5">
                  {selectedSubject.name}
                </h2>
                <p className="text-xs text-navy/50 mt-0.5">
                  {studentClass?.name || "Ma Classe"} • Que souhaitez-vous consulter ?
                </p>
              </div>

              <button
                onClick={() => setSelectedSubject(null)}
                className="text-navy/40 hover:text-navy p-1.5 rounded-xl cursor-pointer hover:bg-navy/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Choix d'accès */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* Option 1 : Supports de Cours & Documents */}
              <Link
                href={`/etudiant/cours?subject=${selectedSubject.id}`}
                className="p-5 rounded-2xl bg-teal-50/50 hover:bg-teal-50 border border-turquoise/20 hover:border-turquoise transition-all flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-turquoise/10 text-teal-dark flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6 text-turquoise" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-navy text-sm group-hover:text-teal-dark transition-colors">
                      Supports de Cours &amp; Documents
                    </h3>
                    <ChevronRight className="w-4 h-4 text-turquoise group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-navy/60 mt-1 leading-relaxed">
                    Polycopiés PDF, fiches de révision, vidéos explicatives et liens partagés par votre professeur.
                  </p>
                </div>
              </Link>

              {/* Option 2 : Devoirs & Évaluations */}
              <Link
                href={`/etudiant/devoirs?subject=${selectedSubject.id}`}
                className="p-5 rounded-2xl bg-orange/5 hover:bg-orange/10 border border-orange/20 hover:border-orange transition-all flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileCheck className="w-6 h-6 text-orange" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-navy text-sm group-hover:text-orange transition-colors">
                      Devoirs &amp; Exercices à rendre
                    </h3>
                    <ChevronRight className="w-4 h-4 text-orange group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-navy/60 mt-1 leading-relaxed">
                    Télécharger les énoncés, déposer vos copies (ou photos 📸) et consulter les corrigés officiels.
                  </p>
                </div>
              </Link>

              {/* Option 3 : Relevé de Notes */}
              <Link
                href="/etudiant/notes"
                className="p-4 rounded-2xl bg-blue-vlight/40 hover:bg-blue-vlight/80 border border-navy/5 hover:border-navy/20 transition-all flex items-center justify-between group cursor-pointer text-xs font-bold text-navy"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-navy/60" />
                  <span>Consulter mon relevé de notes &amp; moyennes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-navy/40 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSubject(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
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
