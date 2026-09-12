"use client";

import { motion } from "framer-motion";
import { FileText, MonitorPlay, Clapperboard, Flame, ArrowUpRight } from "lucide-react";

const poles = [
  {
    title: "IGNIS MAG",
    icon: FileText,
    iconBg: "bg-blue-vlight",
    iconColor: "text-turquoise",
    desc: "Le média culturel & pédagogique de l'association : articles, portraits et ressources pour apprendre autrement.",
    highlight: false,
  },
  {
    title: "Mon École en Live",
    icon: MonitorPlay,
    iconBg: "bg-orange/10",
    iconColor: "text-orange",
    desc: "L'école en ligne gratuite : des cours en direct, filmés, accessibles à toutes et à tous.",
    highlight: true,
  },
  {
    title: "IGNIS SHOW",
    icon: Clapperboard,
    iconBg: "bg-blue-vlight",
    iconColor: "text-turquoise",
    desc: "Le pôle événementiel : spectacles vivants et rencontres culturelles qui font vivre le feu de la création.",
    highlight: false,
  },
];

export default function PolesIgnis() {
  return (
    <section id="ignis-novus" className="py-24 px-6 md:px-12 bg-blue-vlight relative overflow-hidden">
      {/* Giant Background Number */}
      <div className="absolute top-0 right-[-20px] md:right-0 pointer-events-none select-none z-0">
        <span
          className="text-[280px] md:text-[420px] font-black text-transparent leading-none"
          style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}
        >
          06
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
              <span className="text-orange font-bold text-xs uppercase tracking-widest">06</span>
              <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
              <span className="text-teal-dark font-bold text-xs uppercase tracking-[0.15em]">L&apos;ASSOCIATION</span>
            </span>
          </motion.div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-24">
            <div className="w-full lg:w-3/5">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-[1.15]"
              >
                Un pôle de l&apos;association{" "}
                <span className="text-orange">IGNIS</span>
                <br />
                <span className="text-orange">NOVUS</span>
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
                IGNIS NOVUS — « nouvelle flamme » — est une association loi 1901 qui porte trois pôles
                complémentaires autour de la culture, de la pédagogie et du vivant.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-10">
          {poles.map((pole, i) => {
            const Icon = pole.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`relative bg-white rounded-[2rem] p-8 flex flex-col shadow-sm cursor-default
                  transition-shadow duration-300 hover:shadow-md
                  ${pole.highlight
                    ? "border-2 border-orange shadow-orange/10"
                    : "border border-navy/5"
                  }`}
              >
                {/* TU ES ICI badge */}
                {pole.highlight && (
                  <div className="absolute -top-3.5 right-8 bg-orange text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md z-10">
                    TU ES ICI
                  </div>
                )}

                {/* Icon */}
                <div className="mb-7">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pole.iconBg} border border-navy/5`}>
                    <Icon className={`w-6 h-6 ${pole.iconColor}`} />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-navy mb-3">{pole.title}</h3>
                <p className="text-navy/60 leading-relaxed flex-1 text-sm">{pole.desc}</p>

                {/* Bottom line — animated on hover */}
                <div className="mt-7 overflow-hidden h-1 rounded-full">
                  {pole.highlight ? (
                    <motion.div
                      className="h-full bg-orange rounded-full"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                      style={{ originX: 0, width: "50%" }}
                    />
                  ) : (
                    <motion.div
                      className="h-full bg-turquoise/40 rounded-full"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                      style={{ originX: 0, width: "33%" }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Dark Banner */}
        <motion.a
          href="https://web.ignisnovus.org"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex items-center justify-between bg-navy rounded-[1.75rem] px-8 py-5 shadow-lg cursor-pointer group"
        >
          <div className="flex items-center gap-5">
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-orange/20 transition-colors duration-300">
              <Flame className="w-5 h-5 text-orange" />
            </div>
            <div>
              <div className="text-base font-bold text-white">Découvrir l&apos;association IGNIS NOVUS</div>
              <div className="text-white/40 text-xs mt-0.5">web.ignisnovus.org</div>
            </div>
          </div>

          {/* Arrow button */}
          <motion.div
            whileHover={{ rotate: 45 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-11 h-11 rounded-full bg-orange flex items-center justify-center shrink-0 shadow-md shadow-orange/20"
          >
            <ArrowUpRight className="w-5 h-5 text-white" />
          </motion.div>
        </motion.a>

      </div>
    </section>
  );
}
