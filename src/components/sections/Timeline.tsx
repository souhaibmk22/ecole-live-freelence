"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Button from "../ui/Button";
import { UserPlus, MonitorPlay, PenTool, LineChart } from "lucide-react";

const steps = [
  {
    title: "Inscription",
    desc: "Rejoins la liste d'attente : on te prévient dès l'ouverture des inscriptions de la cohorte pilote.",
    icon: UserPlus,
    iconColor: "text-turquoise",
    borderColor: "border-turquoise/30",
  },
  {
    title: "Cours en direct",
    desc: "Connecte-toi à ta classe en ligne : 4h par semaine, en petit groupe de 10 élèves maximum.",
    icon: MonitorPlay,
    iconColor: "text-turquoise",
    borderColor: "border-turquoise/30",
  },
  {
    title: "Exercices en ligne",
    desc: "Devoirs, exercices interactifs et quiz ludiques entre les cours, aussi depuis ton téléphone. Et si tu rates un créneau : les replays sont illimités.",
    icon: PenTool,
    iconColor: "text-turquoise",
    borderColor: "border-turquoise/30",
  },
  {
    title: "Suivi & notes",
    desc: "Un vrai suivi pédagogique, des notes, et des échanges réguliers avec les élèves et les familles.",
    icon: LineChart,
    iconColor: "text-turquoise",
    borderColor: "border-turquoise/30",
  }
];

export default function Timeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end center"],
  });

  return (
    <section id="comment-ca-marche" className="py-24 px-6 md:px-12 bg-blue-vlight relative overflow-hidden" ref={sectionRef}>
      {/* Giant Background Number — positioned near the Inscription card */}
      <div className="absolute top-0 right-[-60px] md:right-[-30px] lg:right-[0px] pointer-events-none select-none z-0">
        <span className="text-[280px] md:text-[400px] font-black text-transparent leading-none" style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}>
          03
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row gap-16 lg:gap-24">
        
        {/* Left Column: Content */}
        <div className="w-full lg:w-[40%] flex flex-col lg:sticky top-32 h-fit">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
              <span className="text-orange font-bold text-xs md:text-sm uppercase tracking-widest">03</span>
              <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
              <span className="text-teal-dark font-bold text-xs md:text-sm uppercase tracking-[0.15em]">COMMENT ÇA MARCHE</span>
            </span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-extrabold text-navy tracking-tight leading-[1.1] mb-8"
          >
            Quatre étapes, <span className="text-orange">et la <br className="hidden lg:block" /> classe commence.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base text-navy/70 leading-relaxed mb-10 max-w-md"
          >
            De l'inscription au suivi personnalisé, tout est pensé pour être simple — pour les élèves comme pour les familles.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <a href="#contact">
              <Button size="lg" className="bg-turquoise hover:bg-turquoise/90 text-white rounded-full px-7 py-3.5 shadow-md shadow-turquoise/10 font-medium text-base">
                Être informé du lancement <span className="ml-1 text-lg">→</span>
              </Button>
            </a>
          </motion.div>

          {/* Small Image */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="group relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border-[6px] border-white"
          >
            <Image 
              src="/images/boy-laptop2.jpg" 
              alt="Élève en cours en ligne" 
              fill 
              sizes="(max-width: 768px) 100vw, 450px"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </motion.div>
        </div>

        {/* Right Column: Steps Line */}
        <div className="w-full lg:w-[60%] relative pl-12 md:pl-20 py-10" ref={timelineRef}>
          
          {/* Animated Wavy Line Base (The Serpent) */}
          <div className="absolute left-[12px] md:left-[28px] top-6 bottom-6 w-6 z-0">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 10 100">
              <defs>
                <linearGradient id="snakeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#23828c" /> {/* teal-dark */}
                  <stop offset="100%" stopColor="#f97316" /> {/* orange */}
                </linearGradient>
                <clipPath id="snakeClip">
                  <motion.rect 
                    x="-10" 
                    y="0" 
                    width="30" 
                    height="100" 
                    style={{ scaleY: scrollYProgress, originY: 0 }} 
                  />
                </clipPath>
              </defs>
              <path 
                d="M5,0 Q10,12 5,25 T5,50 T5,75 T5,100" 
                stroke="rgba(54,74,94,0.15)" 
                strokeWidth="2" 
                fill="none" 
                vectorEffect="non-scaling-stroke" 
              />
              <path 
                d="M5,0 Q10,12 5,25 T5,50 T5,75 T5,100" 
                stroke="url(#snakeGradient)"
                strokeWidth="3" 
                strokeLinecap="round"
                fill="none" 
                vectorEffect="non-scaling-stroke" 
                clipPath="url(#snakeClip)"
              />
            </svg>
          </div>

          <div className="space-y-5 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: 0.1 + (index * 0.1) }}
                  className="relative flex items-center group"
                >
                  {/* Bubble on Line — animates with card on hover */}
                  <div
                    className="absolute -left-[52px] md:-left-[68px] w-14 h-14 rounded-full bg-white border-2 shadow-sm flex items-center justify-center z-20
                      transition-all duration-300
                      border-turquoise/30 group-hover:border-orange group-hover:-translate-y-2"
                  >
                    <Icon className="w-6 h-6 text-turquoise group-hover:text-orange transition-colors duration-300" />
                  </div>

                  {/* Card */}
                  <div
                    className="w-full bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border-2 border-navy/5
                      transition-all duration-300
                      group-hover:-translate-y-2 group-hover:border-orange group-hover:shadow-md"
                  >
                    <div className="text-orange font-black text-[10px] uppercase tracking-widest mb-3">
                      Étape {index + 1}
                    </div>
                    <h3 className="text-2xl font-bold text-navy mb-4 transition-colors duration-300 group-hover:text-orange">{step.title}</h3>
                    <p className="text-navy/70 leading-relaxed text-[15px]">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
