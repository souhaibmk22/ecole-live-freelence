"use client";

import { useState } from "react";
import { Users, GraduationCap, ChevronDown, Check } from "lucide-react";
import { ParentChildInfo } from "@/lib/types";

interface ParentChildSelectorProps {
  childrenList: ParentChildInfo[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export default function ParentChildSelector({
  childrenList,
  selectedChildId,
  onSelectChild,
}: ParentChildSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!childrenList || childrenList.length === 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5 text-xs text-amber-700 font-medium flex items-center gap-2">
        <span>⚠️ Aucun enfant rattaché à ce compte parent pour le moment.</span>
      </div>
    );
  }

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  // S'il n'y a qu'un seul enfant, affichage compact élégant
  if (childrenList.length === 1) {
    return (
      <div className="inline-flex items-center gap-2.5 bg-white border border-navy/10 rounded-2xl px-3.5 py-2 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
          {activeChild.first_name?.[0]?.toUpperCase() || "E"}
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-navy leading-tight">
            {activeChild.first_name} {activeChild.last_name}
          </div>
          <div className="text-[10px] text-teal-dark font-medium flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-turquoise" />
            <span>{activeChild.class_name || "Élève"}</span>
          </div>
        </div>
      </div>
    );
  }

  // S'il y a plusieurs enfants : Sélecteur interactif fluide (Style Pronote / Netflix)
  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-navy/50 uppercase tracking-wider hidden sm:inline">
          Enfant suivi :
        </span>

        {/* Boutons rapides horizontaux pour basculer en 1 clic */}
        <div className="flex items-center gap-1.5 p-1 bg-navy/5 border border-navy/10 rounded-2xl">
          {childrenList.map((child) => {
            const isSelected = child.id === (activeChild?.id || selectedChildId);
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelectChild(child.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm scale-[1.02]"
                    : "text-navy/70 hover:text-navy hover:bg-white/60"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg font-black text-[10px] flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-white/20 text-white" : "bg-navy/10 text-navy"
                  }`}
                >
                  {child.first_name?.[0]?.toUpperCase() || "E"}
                </div>
                <span className="truncate max-w-[100px] sm:max-w-[130px]">
                  {child.first_name}
                </span>
                {child.class_name && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md hidden md:inline ${
                      isSelected ? "bg-white/20 text-white" : "bg-navy/5 text-navy/60"
                    }`}
                  >
                    {child.class_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
