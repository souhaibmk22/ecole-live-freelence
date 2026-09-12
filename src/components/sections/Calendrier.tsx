"use client";

import { motion } from "framer-motion";
import { Calendar, Download } from "lucide-react";
import Button from "../ui/Button";

const monthNames = [
  "JANVIER", "FÉVRIER", "MARS", "AVRIL",
  "MAI", "JUIN", "JUILLET", "AOÛT",
  "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"
];

// Type for day info
type DayInfo = {
  day: number;
  type: "normal" | "cours" | "examens" | "vacances" | "grandes_vacances" | "weekend";
};

// Exact periods from official flyer:
// Period 1: Cours Jan 1 - Mar 8 (Examens: Mar 2 - Mar 8)
// Vacances 1: Mar 9 - Mar 22
// Period 2: Cours Mar 23 - Jun 7 (Examens: Jun 1 - Jun 7)
// Vacances 2: Jun 8 - Jun 21
// Period 3: Cours Jun 22 - Sep 13 (Examens: Sep 7 - Sep 13)
// Vacances 3: Sep 14 - Sep 27
// Period 4: Cours Sep 28 - Nov 30 (Examens: Nov 24 - Nov 30)
// Grandes Vacances: Dec 1 - Dec 31

function getDayType(monthIdx: number, day: number, isWeekend: boolean): DayInfo["type"] {
  // Month 11: Décembre (Grandes Vacances all month)
  if (monthIdx === 11) {
    return "grandes_vacances";
  }

  // Month 0: Janvier
  if (monthIdx === 0) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 1: Février
  if (monthIdx === 1) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 2: Mars
  if (monthIdx === 2) {
    if (day === 1) return isWeekend ? "weekend" : "cours";
    if (day >= 2 && day <= 8) return "examens";
    if (day >= 9 && day <= 22) return "vacances";
    return isWeekend ? "weekend" : "cours"; // 23-31
  }

  // Month 3: Avril
  if (monthIdx === 3) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 4: Mai
  if (monthIdx === 4) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 5: Juin
  if (monthIdx === 5) {
    if (day >= 1 && day <= 7) return "examens";
    if (day >= 8 && day <= 21) return "vacances";
    return isWeekend ? "weekend" : "cours"; // 22-30
  }

  // Month 6: Juillet
  if (monthIdx === 6) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 7: Août
  if (monthIdx === 7) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 8: Septembre
  if (monthIdx === 8) {
    if (day >= 1 && day <= 6) return isWeekend ? "weekend" : "cours";
    if (day >= 7 && day <= 13) return "examens";
    if (day >= 14 && day <= 27) return "vacances";
    return isWeekend ? "weekend" : "cours"; // 28-30
  }

  // Month 9: Octobre
  if (monthIdx === 9) {
    return isWeekend ? "weekend" : "cours";
  }

  // Month 10: Novembre
  if (monthIdx === 10) {
    if (day >= 1 && day <= 23) return isWeekend ? "weekend" : "cours";
    if (day >= 24 && day <= 30) return "examens";
  }

  return isWeekend ? "weekend" : "cours";
}

// Build 2027 calendar
function buildMonth(monthIdx: number): { name: string; start: number; days: DayInfo[] } {
  const name = monthNames[monthIdx];
  const date = new Date(2027, monthIdx, 1);
  const start = (date.getDay() + 6) % 7; // Mon=0, Sun=6
  const total = new Date(2027, monthIdx + 1, 0).getDate();

  const days: DayInfo[] = [];
  for (let d = 1; d <= total; d++) {
    const dow = (new Date(2027, monthIdx, d).getDay() + 6) % 7;
    const isWeekend = dow === 5 || dow === 6;
    const type = getDayType(monthIdx, d, isWeekend);
    days.push({ day: d, type });
  }

  return { name, start, days };
}

const months = monthNames.map((_, i) => buildMonth(i));

const dayStyles: Record<DayInfo["type"], string> = {
  normal:           "text-navy/60 hover:bg-navy/5",
  cours:            "text-navy font-semibold hover:bg-turquoise/10",
  weekend:          "text-orange/70 font-semibold hover:bg-orange/10",
  examens:          "bg-[#23828c] text-white font-bold shadow-sm shadow-[#23828c]/30 ring-1 ring-[#23828c]",
  vacances:         "bg-orange/15 text-orange font-bold border border-orange/30",
  grandes_vacances: "bg-gradient-to-br from-orange to-amber-500 text-white font-black shadow-sm",
};

const periodsTimeline = [
  {
    type: "cours",
    title: "Période 1 — Cours & Apprentissage",
    dates: "1er Janvier → 8 Mars",
    examDates: "2 Mars → 8 Mars",
    desc: "Apprentissage et progression des acquis",
    badgeColor: "bg-teal-dark text-white",
    isExam: true,
  },
  {
    type: "vacances",
    title: "Vacances 1",
    dates: "9 Mars → 22 Mars",
    desc: "Période de repos et de ressourcement",
    badgeColor: "bg-orange text-white",
    isExam: false,
  },
  {
    type: "cours",
    title: "Période 2 — Cours & Apprentissage",
    dates: "23 Mars → 7 Juin",
    examDates: "1er Juin → 7 Juin",
    desc: "Consolidation et approfondissement",
    badgeColor: "bg-teal-dark text-white",
    isExam: true,
  },
  {
    type: "vacances",
    title: "Vacances 2",
    dates: "8 Juin → 21 Juin",
    desc: "Période de repos et de ressourcement",
    badgeColor: "bg-orange text-white",
    isExam: false,
  },
  {
    type: "cours",
    title: "Période 3 — Cours & Apprentissage",
    dates: "22 Juin → 13 Septembre",
    examDates: "7 Septembre → 13 Septembre",
    desc: "Développement des compétences & projets",
    badgeColor: "bg-teal-dark text-white",
    isExam: true,
  },
  {
    type: "vacances",
    title: "Vacances 3",
    dates: "14 Septembre → 27 Septembre",
    desc: "Période de repos et de ressourcement",
    badgeColor: "bg-orange text-white",
    isExam: false,
  },
  {
    type: "cours",
    title: "Période 4 — Cours & Apprentissage",
    dates: "28 Septembre → 30 Novembre",
    examDates: "24 Novembre → 30 Novembre",
    desc: "Bilan annuel et validation du niveau",
    badgeColor: "bg-teal-dark text-white",
    isExam: true,
  },
  {
    type: "grandes_vacances",
    title: "Grandes Vacances",
    dates: "1er Décembre → 31 Décembre",
    desc: "Grandes vacances : repos, découvertes et projets personnels",
    badgeColor: "bg-gradient-to-r from-orange to-amber-500 text-white",
    isExam: false,
  },
];

const legendItems = [
  { color: "bg-white border border-navy/20", label: "Cours (Apprentissage et progression)" },
  { color: "bg-[#23828c]", label: "Examens (Dernière semaine de chaque période)" },
  { color: "bg-orange/20 border border-orange", label: "Vacances (Repos et ressourcement)" },
  { color: "bg-gradient-to-r from-orange to-amber-500", label: "Grandes Vacances (Décembre)" },
];

import { useState } from "react";
import { BookOpen, CalendarCheck, Sun, Palmtree, Sparkles, LayoutGrid, ListOrdered } from "lucide-react";

export default function Calendrier() {
  const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline");

  return (
    <section id="calendrier" className="py-24 px-6 md:px-12 bg-blue-vlight relative overflow-hidden">
      {/* Giant Background Number */}
      <div className="absolute top-0 left-[-20px] md:left-0 pointer-events-none select-none z-0">
        <span
          className="text-[280px] md:text-[420px] font-black text-transparent leading-none"
          style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}
        >
          05
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end gap-10 lg:gap-24 mb-12">
          <div className="w-full lg:w-3/5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-7"
            >
              <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
                <span className="text-orange font-bold text-xs uppercase tracking-widest">05</span>
                <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
                <span className="text-teal-dark font-bold text-xs uppercase tracking-[0.15em]">CALENDRIER SCOLAIRE</span>
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-[1.1]"
            >
              Année scolaire : <br />
              <span className="text-turquoise">Janvier – Décembre.</span>
            </motion.h2>
          </div>

          <div className="w-full lg:w-2/5 lg:pb-2">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-base text-navy/60 leading-relaxed"
            >
              Un rythme annuel équilibré en 4 périodes de cours, avec examens continus la dernière semaine et un mois complet de grandes vacances en décembre.
            </motion.p>
          </div>
        </div>

        {/* Dark Banner with Slogan & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-navy rounded-[2rem] p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 mb-10 shadow-lg"
        >
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-orange flex items-center justify-center shrink-0 p-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-orange/20 text-orange border border-orange/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  JANVIER – DÉCEMBRE
                </span>
                <span className="text-turquoise text-xs font-semibold hidden sm:inline">
                  • APPRENDRE AUJOURD&apos;HUI, RÉUSSIR DEMAIN.
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Rentrée officielle : lundi 4 janvier 2027</h3>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center bg-white/10 p-1.5 rounded-full w-full md:w-auto justify-center">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                viewMode === "timeline"
                  ? "bg-orange text-white shadow-md shadow-orange/30"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Synthèse du Rythme
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-turquoise text-white shadow-md shadow-turquoise/30"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grille 12 Mois
            </button>
          </div>
        </motion.div>

        {/* View Mode 1: Timeline like Flyer */}
        {viewMode === "timeline" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3.5 mb-10"
          >
            {periodsTimeline.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 md:p-5 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Left: Badge / Dates */}
                <div className="flex items-center gap-4 min-w-[280px]">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === "cours"
                        ? "bg-teal-dark/10 text-teal-dark"
                        : item.type === "grandes_vacances"
                        ? "bg-orange/20 text-orange"
                        : "bg-orange/10 text-orange"
                    }`}
                  >
                    {item.type === "cours" && <BookOpen className="w-6 h-6" />}
                    {item.type === "vacances" && <Palmtree className="w-6 h-6" />}
                    {item.type === "grandes_vacances" && <Sun className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                          item.type === "cours"
                            ? "bg-teal-dark text-white"
                            : item.type === "grandes_vacances"
                            ? "bg-gradient-to-r from-orange to-amber-500 text-white"
                            : "bg-orange text-white"
                        }`}
                      >
                        {item.type === "cours" ? "COURS" : item.type === "grandes_vacances" ? "GRANDES VACANCES" : "VACANCES"}
                      </span>
                    </div>
                    <div className="text-base md:text-lg font-bold text-navy mt-1">
                      {item.dates}
                    </div>
                  </div>
                </div>

                {/* Center / Right: Description & Exam badge */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-1 w-full border-t md:border-t-0 md:border-l border-navy/5 pt-3 md:pt-0 md:pl-6">
                  <p className="text-navy/70 text-sm">{item.desc}</p>

                  {item.isExam && item.examDates && (
                    <div className="inline-flex items-center gap-2 bg-[#23828c]/10 text-[#23828c] border border-[#23828c]/30 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0">
                      <CalendarCheck className="w-4 h-4 text-[#23828c]" />
                      <span>EXAMENS : {item.examDates}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* View Mode 2: 12 Month Grid */}
        {viewMode === "grid" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10"
          >
            {months.map((month) => {
              const empties: null[] = Array(month.start).fill(null);
              return (
                <div
                  key={month.name}
                  className="bg-white rounded-2xl shadow-sm border border-navy/5 overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                >
                  {/* Month header */}
                  <div className="bg-orange text-white text-center font-black py-2.5 tracking-[0.15em] text-[10px] uppercase">
                    {month.name}
                  </div>

                  <div className="px-2.5 pt-2 pb-2.5 flex-1">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 text-center mb-1.5">
                      {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                        <div key={i} className="text-[8px] font-black text-navy/30">{d}</div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-y-0.5 text-center">
                      {empties.map((_, i) => (
                        <div key={`e-${i}`} className="aspect-square" />
                      ))}
                      {month.days.map(({ day, type }) => (
                        <div
                          key={day}
                          className={`aspect-square flex items-center justify-center text-[10px] font-medium rounded cursor-default transition-transform duration-150 hover:scale-125 ${dayStyles[type]}`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center gap-4 md:gap-8 border-t border-navy/10 pt-8"
        >
          {legendItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 cursor-default"
            >
              <div className={`w-5 h-5 rounded ${item.color}`} />
              <span className="text-xs font-semibold text-navy/60">{item.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Bottom Slogan Bar */}
        <div className="mt-8 bg-gradient-to-r from-teal-dark to-navy text-white rounded-2xl p-4 md:p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-orange shrink-0" />
            <span className="font-extrabold text-sm md:text-base tracking-wide">
              APPRENDRE AUJOURD&apos;HUI, RÉUSSIR DEMAIN.
            </span>
          </div>
          <span className="text-white/60 text-xs">
            Calendrier annuel officiel — Mon École en Live
          </span>
        </div>

      </div>
    </section>
  );
}

