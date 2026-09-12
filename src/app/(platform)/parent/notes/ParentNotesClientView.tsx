"use client";

import { useState, useEffect } from "react";
import {
  Award,
  TrendingUp,
  BookOpen,
  Calendar,
  Sparkles,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { ParentChildInfo } from "@/lib/types";
import ParentChildSelector from "@/components/platform/ParentChildSelector";
import { fetchChildNotesAction } from "../actions";

interface ParentNotesClientViewProps {
  initialChildren: ParentChildInfo[];
}

export default function ParentNotesClientView({
  initialChildren,
}: ParentNotesClientViewProps) {
  const [childrenList] = useState<ParentChildInfo[]>(initialChildren);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildren[0]?.id || ""
  );

  const [notesData, setNotesData] = useState<{
    subjects: any[];
    generalAverage: number | null;
    totalGradesCount: number;
  }>({
    subjects: [],
    generalAverage: null,
    totalGradesCount: 0,
  });

  const [loading, setLoading] = useState(false);

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  useEffect(() => {
    if (!selectedChildId) return;

    let isMounted = true;
    setLoading(true);

    fetchChildNotesAction(selectedChildId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setNotesData({
            subjects: res.subjects || [],
            generalAverage: res.generalAverage ?? null,
            totalGradesCount: res.totalGradesCount || 0,
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            Relevé de Notes & Évaluations
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Notes de {activeChild?.first_name || "votre enfant"}
          </h1>
          <p className="text-xs sm:text-sm text-navy/60">
            Moyennes par matière et appréciations des enseignants.
          </p>
        </div>

        <ParentChildSelector
          childrenList={childrenList}
          selectedChildId={selectedChildId}
          onSelectChild={(id) => setSelectedChildId(id)}
        />
      </div>

      {/* Carte Moyenne Générale */}
      <div className="bg-gradient-to-br from-navy to-[#1a2e3b] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-turquoise text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Synthèse Trimestrielle
          </span>
          <h2 className="text-xl sm:text-2xl font-black">
            Moyenne Générale : {activeChild.first_name} {activeChild.last_name}
          </h2>
          <p className="text-xs text-white/60">
            {notesData.totalGradesCount} évaluation(s) notée(s) enregistrée(s)
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-3xl border border-white/15 text-center shrink-0 shadow-lg">
          <span className="text-[10px] text-white/60 uppercase font-black tracking-widest block mb-1">
            Moyenne
          </span>
          <span className="text-4xl sm:text-5xl font-black text-turquoise">
            {notesData.generalAverage !== null ? `${notesData.generalAverage}` : "--"}
          </span>
          <span className="text-sm font-bold text-white/70"> / 20</span>
        </div>
      </div>

      {/* Liste des matières et notes */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-xs text-navy/40 border border-navy/5">
          Chargement des notes...
        </div>
      ) : notesData.subjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-2">
          <Award className="w-10 h-10 text-navy/30 mx-auto" />
          <h3 className="text-sm font-bold text-navy">Aucune note enregistrée pour le moment</h3>
          <p className="text-xs text-navy/50">Les notes attribuées par les professeurs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notesData.subjects.map((subj) => (
            <div
              key={subj.subject_id}
              className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between pb-3 border-b border-navy/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 font-black flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-navy">{subj.subject_name}</h3>
                    <p className="text-xs text-navy/50">{subj.grades.length} note(s)</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-navy/50 font-bold uppercase block">Moyenne</span>
                  <span className="text-xl font-black text-purple-700">{subj.average}/20</span>
                </div>
              </div>

              {/* Liste des évaluations de cette matière */}
              <div className="space-y-2.5">
                {subj.grades.map((g: any) => (
                  <div
                    key={g.id}
                    className="p-3 bg-blue-vlight/40 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-navy truncate">{g.title}</div>
                      {g.feedback && (
                        <p className="text-[11px] text-navy/60 italic truncate mt-0.5">
                          « {g.feedback} »
                        </p>
                      )}
                    </div>
                    <span className="font-black text-sm text-navy px-2.5 py-1 rounded-xl bg-white shadow-2xs shrink-0">
                      {g.grade}/20
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
