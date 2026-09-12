"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Sparkles, CheckCircle2, Compass, GraduationCap, Briefcase, Palette, Clock, Sun, Moon, Sunrise, ArrowRight } from "lucide-react";

type Subject = {
  name: string;
  emoji: string;
  mandatory: boolean;
  category?: string;
};

// Exact 19 subjects from the official infographic:
const subjects: Subject[] = [
  // Socle Commun Obligatoire (8 matières fondamentales)
  { name: "Français", emoji: "✍️", mandatory: true, category: "Socle commun" },
  { name: "Mathématiques", emoji: "🔢", mandatory: true, category: "Socle commun" },
  { name: "Anglais", emoji: "🇬🇧", mandatory: true, category: "Socle commun" },
  { name: "Développement personnel", emoji: "💡", mandatory: true, category: "Socle commun" },
  { name: "Histoire", emoji: "🏛️", mandatory: true, category: "Socle commun" },
  { name: "Géographie", emoji: "🌍", mandatory: true, category: "Socle commun" },
  { name: "Droit", emoji: "⚖️", mandatory: true, category: "Socle commun" },
  { name: "Informatique", emoji: "💻", mandatory: true, category: "Socle commun" },

  // Matières complémentaires / Spécialisations & Découvertes
  { name: "Physique", emoji: "⚡", mandatory: false, category: "Sciences" },
  { name: "Biologie", emoji: "🧬", mandatory: false, category: "Sciences" },
  { name: "Chimie", emoji: "🧪", mandatory: false, category: "Sciences" },
  { name: "Langues étrangères", emoji: "🌐", mandatory: false, category: "Langues" },
  { name: "Arts du spectacle", emoji: "🎭", mandatory: false, category: "Artistique" },
  { name: "Arts musicaux", emoji: "🎵", mandatory: false, category: "Artistique" },
  { name: "Arts plastiques", emoji: "🎨", mandatory: false, category: "Artistique" },
  { name: "Arts graphiques", emoji: "🖌️", mandatory: false, category: "Artistique" },
  { name: "Agriculture", emoji: "🌾", mandatory: false, category: "Pratique" },
  { name: "Entrepreneuriat", emoji: "🚀", mandatory: false, category: "Projet" },
  { name: "Sports", emoji: "🏃‍♂️", mandatory: false, category: "Santé" },
];

const metrics = [
  { value: 10, suffix: null, label: "élèves maximum par classe" },
  { value: 19, suffix: null, label: "matières enseignées au total" },
  { value: 8,  suffix: null, label: "matières au socle commun obligatoire" },
  { value: 100, suffix: "%", label: "gratuit, porté par l'association" },
];

function CountUp({ end, suffix, duration = 2 }: { end: number; suffix?: string | null; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const stepTime = Math.max(10, Math.floor((duration * 1000) / end));
      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start >= end) { setCount(end); clearInterval(timer); }
      }, stepTime);
      return () => clearInterval(timer);
    }
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix && <span className="text-orange">{suffix}</span>}
    </span>
  );
}

export default function Pilote6eme() {
  const [filter, setFilter] = useState<"all" | "mandatory" | "discovery">("all");

  const filteredSubjects = subjects.filter((s) => {
    if (filter === "mandatory") return s.mandatory;
    if (filter === "discovery") return !s.mandatory;
    return true;
  });

  return (
    <section
      id="cycle-decouverte"
      className="py-32 px-6 md:px-12 relative overflow-hidden animate-bg-gradient bg-[length:400%_400%]"
      style={{
        backgroundImage: "linear-gradient(-45deg, #1a2e3b, #23424f, #1d3a48, #2a3f52, #182833)",
      }}
    >
      {/* Anchor for backward compatibility */}
      <span id="cohorte-6eme" className="sr-only">Cycle découverte (à partir de 10-11 ans)</span>

      {/* Gradient orbs for depth */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-turquoise/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-orange/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Giant Background Number */}
      <div className="absolute top-0 -left-[30px] md:left-0 pointer-events-none select-none">
        <span
          className="text-[280px] md:text-[420px] font-black text-transparent leading-none"
          style={{ WebkitTextStroke: "1px rgba(255, 255, 255, 0.07)" }}
        >
          04
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end gap-10 lg:gap-24 mb-16">
          <div className="w-full lg:w-3/5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-3 bg-transparent px-5 py-2 rounded-full border border-white/15">
                <span className="text-orange font-bold text-xs uppercase tracking-widest">04</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                <span className="text-white/60 font-bold text-xs uppercase tracking-[0.15em]">CYCLE DÉCOUVERTE</span>
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.15]"
            >
              4 janvier 2027 :<br />
              <span className="text-turquoise">le cycle découverte</span> ouvre le bal.
            </motion.h2>
          </div>

          <div className="w-full lg:w-2/5 pb-1">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-base text-white/60 leading-relaxed"
            >
              Ouverture d&apos;un premier niveau en janvier, suivi du déploiement progressif des autres niveaux. 10 élèves max par classe pour un accompagnement individualisé.
            </motion.p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="relative rounded-[1.5rem] p-6 flex flex-col justify-center cursor-default overflow-hidden group"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {/* Animated border via pseudo gradient overlay */}
              <motion.div
                className="absolute inset-0 rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(55,182,186,0.3), rgba(249,115,22,0.3))",
                  padding: "2px",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
              <div className="absolute inset-0 rounded-[1.75rem] border border-white/10 group-hover:border-orange/50 transition-colors duration-500 pointer-events-none" />

              <div className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tighter">
                <CountUp end={m.value} suffix={m.suffix} />
              </div>
              <div className="text-white/50 font-medium text-sm group-hover:text-white/75 transition-colors duration-300">
                {m.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Parcours des Élèves & Organisation Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">

          {/* Parcours des élèves */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/[0.06] border border-white/10 rounded-[2rem] p-7 md:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center text-orange font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">Parcours des élèves</h3>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                <span className="text-white font-semibold">2 ans de cours classiques</span> (socle fondamental &amp; consolidation), puis choix d&apos;un parcours adapté au projet de l&apos;élève :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-start hover:border-orange/50 transition-colors">
                  <Briefcase className="w-5 h-5 text-orange mb-2" />
                  <div className="font-bold text-white text-sm mb-1">Entrepreneuriat</div>
                  <p className="text-white/50 text-xs">Initiative, projet, gestion &amp; création</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-start hover:border-turquoise/50 transition-colors">
                  <Palette className="w-5 h-5 text-turquoise mb-2" />
                  <div className="font-bold text-white text-sm mb-1">Artistique</div>
                  <p className="text-white/50 text-xs">Spectacle, musique, graphisme, scène</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-start hover:border-teal-dark/50 transition-colors">
                  <GraduationCap className="w-5 h-5 text-white mb-2" />
                  <div className="font-bold text-white text-sm mb-1">Classique</div>
                  <p className="text-white/50 text-xs">Brevet, baccalauréat &amp; filières générales</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Organisation des cours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.06] border border-white/10 rounded-[2rem] p-7 md:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-turquoise/20 flex items-center justify-center text-turquoise font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">Organisation des cours</h3>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Des créneaux flexibles adaptés aux familles et aux adultes en reconversion :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                  <Sunrise className="w-5 h-5 text-orange shrink-0" />
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40">Matin</div>
                    <div className="font-bold text-white text-sm">8 h – 12 h</div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                  <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40">Après-midi</div>
                    <div className="font-bold text-white text-sm">14 h – 18 h</div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                  <Moon className="w-5 h-5 text-turquoise shrink-0" />
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40">Soir</div>
                    <div className="font-bold text-white text-sm">20 h – 00 h</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/70 border-t border-white/10 pt-4">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange" /> 1h par semaine et par niveau
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-turquoise" /> Adultes : 1 cours par semaine
                </span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Socle Commun Obligatoire Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-orange/20 via-white/[0.07] to-turquoise/20 border-2 border-orange/40 rounded-[2rem] p-7 md:p-8 mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange text-white p-1.5 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-lg md:text-xl font-black uppercase tracking-wider text-white">
              Socle Commun Obligatoire
            </h4>
          </div>
          <p className="text-white/90 text-sm md:text-base font-semibold mb-2">
            Quel que soit le parcours : <span className="text-orange">Français</span> • <span className="text-orange">Mathématiques</span> • <span className="text-orange">Anglais</span> • <span className="text-orange">Développement personnel</span> • <span className="text-orange">Histoire</span> • <span className="text-orange">Géographie</span> • <span className="text-orange">Droit</span> • <span className="text-orange">Informatique</span>
          </p>
          <p className="text-white/60 text-xs md:text-sm leading-relaxed">
            Ces matières donnent les bases pour connaître notre histoire et notre environnement, comprendre le monde, communiquer, connaître ses droits et ses devoirs, savoir agir et se défendre.
          </p>
        </motion.div>

        {/* Subjects Section */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-orange" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Les 19 matières enseignées</h3>
                <p className="text-white/50 text-xs md:text-sm mt-0.5">8 matières au socle commun + 11 matières d&apos;éveil, de spécialisation &amp; d&apos;ouverture</p>
              </div>
            </motion.div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === "all"
                    ? "bg-white text-navy shadow-md"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                Toutes (19)
              </button>
              <button
                onClick={() => setFilter("mandatory")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === "mandatory"
                    ? "bg-orange text-white shadow-md shadow-orange/30"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-orange bg-white rounded-full" />
                8 Socle Obligatoire
              </button>
              <button
                onClick={() => setFilter("discovery")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === "discovery"
                    ? "bg-turquoise text-white shadow-md shadow-turquoise/30"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                11 Spécialisations &amp; Découverte
              </button>
            </div>
          </div>

          {/* Subjects Grid */}
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          >
            <AnimatePresence>
              {filteredSubjects.map((subject) => (
                <motion.div
                  layout
                  key={subject.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className={`relative flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl cursor-default group overflow-hidden ${
                    subject.mandatory
                      ? "border border-orange/40 bg-white/[0.08]"
                      : "border border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange/0 via-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex items-center gap-2.5 z-10 min-w-0">
                    <span className="text-xl shrink-0 leading-none">{subject.emoji}</span>
                    <span className="font-semibold text-white text-xs md:text-sm truncate group-hover:text-orange transition-colors duration-300">
                      {subject.name}
                    </span>
                  </div>

                  {subject.mandatory ? (
                    <span className="shrink-0 bg-orange/20 text-orange border border-orange/40 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
                      Obligatoire
                    </span>
                  ) : (
                    <span className="shrink-0 bg-white/10 text-white/40 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full z-10 group-hover:text-turquoise group-hover:bg-turquoise/10 transition-colors">
                      {subject.category || "Option"}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-white/40 text-sm leading-relaxed border-t border-white/10 pt-8"
          >
            <span className="text-white/60 font-semibold">Bon à savoir</span> : tous les cours sont filmés. Un élève absent peut rattraper n&apos;importe quel créneau — le lendemain, le week-end, ou pendant les vacances.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

