"use client";

import { motion } from "framer-motion";
import { HeartHandshake, Compass, Home, Sprout, Rocket } from "lucide-react";

const cards = [
  {
    title: "Enfants en phobie scolaire",
    desc: "Un cadre rassurant et bienveillant, sans stress ni jugement, pour renouer doucement avec le plaisir d'apprendre.",
    icon: HeartHandshake,
    iconColor: "text-turquoise",
    hoverClasses: "group-hover:bg-turquoise group-hover:text-white group-hover:shadow-lg group-hover:shadow-turquoise/20",
  },
  {
    title: "Élèves en décrochage scolaire",
    desc: "Une porte de retour vers les apprentissages, sans stigmatisation ni parcours du combattant.",
    icon: Compass,
    iconColor: "text-orange",
    hoverClasses: "group-hover:bg-orange group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange/20",
  },
  {
    title: "Familles en IEF",
    desc: "Un complément pédagogique structuré et vivant pour les familles en instruction en famille.",
    icon: Home,
    iconColor: "text-teal-dark",
    hoverClasses: "group-hover:bg-teal-dark group-hover:text-white group-hover:shadow-lg group-hover:shadow-teal-dark/20",
  },
  {
    title: "Adultes en insertion & intégration",
    desc: "Apprentissage des bases, du français et du droit pour faciliter l'intégration et le retour à l'emploi (migrants, reconversion, etc.).",
    icon: Sprout,
    iconColor: "text-teal-dark",
    hoverClasses: "group-hover:bg-teal-dark group-hover:text-white group-hover:shadow-lg group-hover:shadow-teal-dark/20",
  },
  {
    title: "Jeunes adultes",
    desc: "Reprendre les bases, passer un examen, se préparer à une formation avec flexibilité.",
    icon: Rocket,
    iconColor: "text-turquoise",
    hoverClasses: "group-hover:bg-turquoise group-hover:text-white group-hover:shadow-lg group-hover:shadow-turquoise/20",
  },
];

export default function PourQui() {
  return (
    <section id="pour-qui" className="py-24 px-6 md:px-12 bg-blue-vlight relative overflow-hidden">
      {/* Giant Background Number */}
      <div className="absolute top-0 left-0 md:-left-10 pointer-events-none select-none">
        <span className="text-[300px] md:text-[400px] font-black text-transparent leading-none" style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}>
          02
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-end gap-12 lg:gap-24 mb-20">
          <div className="w-full lg:w-1/2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
                <span className="text-orange font-bold text-xs md:text-sm uppercase tracking-widest">02</span>
                <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
                <span className="text-teal-dark font-bold text-xs md:text-sm uppercase tracking-[0.15em]">POUR QUI ?</span>
              </span>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-navy tracking-tight leading-[1.1]"
            >
              Pensée pour celles et ceux<br/>
              <span className="text-turquoise">que l'école a oubliés.</span>
            </motion.h2>
          </div>

          <div className="w-full lg:w-1/2 lg:pb-4">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-navy/70 leading-relaxed max-w-md"
            >
              Quel que soit ton parcours, ton âge ou ta situation : si tu veux apprendre, il y a une place pour toi.
            </motion.p>
          </div>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-white p-5 md:p-6 rounded-[2rem] border border-navy/5 flex flex-col group transition-transform duration-300 hover:-translate-y-2 overflow-hidden shadow-sm hover:shadow-xl"
              >
                <div className={`mb-5 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${card.iconColor} ${card.hoverClasses}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-navy mb-4 group-hover:text-navy transition-colors">{card.title}</h3>
                <p className="text-navy/70 leading-relaxed text-[15px]">{card.desc}</p>
                
                {/* Animated Bottom Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-turquoise to-orange transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
