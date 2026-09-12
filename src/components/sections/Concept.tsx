"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Radio, HeartHandshake, RefreshCw, Trophy, Wifi, Smartphone } from "lucide-react";

const cards = [
  {
    icon: Radio,
    title: "En direct, vraiment ensemble",
    desc: "Des cours filmés en direct, en petits groupes, où chaque élève compte. Pas une plateforme froide : une vraie classe, à distance.",
    iconColor: "text-turquoise",
  },
  {
    icon: HeartHandshake,
    title: "Gratuit, pour toujours",
    desc: "Portée par l'association IGNIS NOVUS, l'école est 100% gratuite. L'accès à l'éducation ne devrait jamais dépendre d'un portefeuille.",
    iconColor: "text-orange",
  },
  {
    icon: RefreshCw,
    title: "À ton rythme",
    desc: "Chaque cours est enregistré : les replays sont illimités et pas limités à ton propre créneau. Tu apprends quand tu es prêt·e.",
    iconColor: "text-teal-dark",
  },
  {
    icon: Trophy,
    title: "Exercices & quiz interactifs",
    desc: "Entre les cours, l'élève s'entraîne avec des exercices et quiz ludiques. Et parce que l'école doit suivre partout, tout fonctionne aussi depuis le téléphone.",
    iconColor: "text-orange",
  },
];

export default function Concept() {
  return (
    <section id="concept" className="bg-blue-vlight relative pt-40 pb-16 px-6 md:px-12 mt-4 md:mt-8">

      {/* Infinite Scrolling Marquee */}
      <div className="absolute -top-20 md:-top-24 left-0 w-full h-64 overflow-hidden z-30 pointer-events-none">
        <div className="absolute top-24 -left-[5%] w-[110%] bg-navy py-4 md:py-5 flex whitespace-nowrap shadow-2xl transform -rotate-2 origin-center pointer-events-auto">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            className="flex items-center text-white font-bold text-xl md:text-2xl w-max"
          >
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="flex items-center">
                <span className="mx-6 md:mx-10 text-orange font-black tracking-wider">APPRENDRE AUJOURD&apos;HUI, RÉUSSIR DEMAIN.</span>
                <span className="text-turquoise mx-2">•</span>
                <span className="mx-6 md:mx-10">10 élèves max par classe</span>
                <span className="text-orange mx-2">•</span>
                <span className="mx-6 md:mx-10">Créneaux Matin, Après-midi &amp; Soir</span>
                <span className="text-orange mx-2">•</span>
                <span className="mx-6 md:mx-10">19 matières enseignées</span>
                <span className="text-orange mx-2">•</span>
                <span className="mx-6 md:mx-10">8 matières au socle commun</span>
                <span className="text-orange mx-2">•</span>
                <span className="mx-6 md:mx-10">100% gratuit</span>
                <span className="text-orange mx-2">•</span>
                <span className="mx-6 md:mx-10">Replays illimités</span>
                <span className="text-orange mx-2">•</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Giant Background Number */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-[-5%] md:right-10 pointer-events-none select-none z-0">
          <span className="text-[300px] md:text-[400px] font-black text-transparent leading-none" style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}>
            01
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 mt-10 md:mt-12">

        {/* Header */}
        <div className="mb-14 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-7"
          >
            <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
              <span className="text-orange font-bold text-xs md:text-sm uppercase tracking-widest">01</span>
              <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
              <span className="text-teal-dark font-bold text-xs md:text-sm uppercase tracking-[0.15em]">LE CONCEPT</span>
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-[1.1] mb-5"
          >
            Une école pas comme les autres.<br />
            <span className="text-turquoise">Une vraie classe,</span> <span className="text-orange">sans les murs.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base text-navy/60 leading-relaxed max-w-2xl"
          >
            Mon École en Live réinvente l&apos;école pour celles et ceux que le système classique a laissés de côté : le lien humain d&apos;une classe, la souplesse du numérique, et zéro euro à payer.
          </motion.p>
        </div>

        {/* Top Row: Image left + 3 Cards right — tighter spacing */}
        <div className="flex flex-col lg:flex-row gap-5 mb-5">

          {/* Left Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-[42%]"
          >
            <div className="relative w-full h-[480px] lg:h-full min-h-[420px] rounded-[2.5rem] overflow-hidden shadow-xl bg-navy group">
              <Image
                src="/images/boy-phone.jpg"
                alt="Élève sur téléphone"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />

              {/* Overlay badge */}
              <div className="absolute bottom-5 inset-x-5 md:bottom-6 md:inset-x-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-orange flex items-center justify-center shrink-0">
                    <Wifi className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base leading-tight">En direct, depuis chez toi</h4>
                    <p className="text-white/60 text-xs mt-0.5">4h de cours par semaine</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: 3 Cards — reduced gap and padding */}
          <div className="w-full lg:w-[58%] flex flex-col gap-3">
            {cards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className="bg-white px-7 py-6 rounded-[2rem] shadow-sm border border-navy/5 flex-1 flex items-center gap-5 transition-shadow hover:shadow-md"
              >
                <div className="shrink-0">
                  <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy mb-1">{card.title}</h3>
                  <p className="text-navy/60 leading-relaxed text-sm">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
