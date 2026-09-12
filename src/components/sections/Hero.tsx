"use client";

import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import Image from "next/image";
import { Play, Circle, Users, Heart, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const slides = [
  { src: "/images/hero-girl-hand.jpg",       alt: "Élève participative en direct" },
  { src: "/images/hero-boy-laptop.jpg",      alt: "Élève autonome sur ordinateur en direct" },
  { src: "/images/hero-online-group.jpg",    alt: "Groupe d'apprentissage en ligne" },
  { src: "/images/hero-student-tablet.jpg",  alt: "Élève attentive sur tablette en cours en ligne" },
];

export default function Hero() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Countdown
  useEffect(() => {
    setMounted(true);
    const targetDate = new Date("2027-01-04T08:00:00").getTime();
    const update = () => {
      const diff = targetDate - Date.now();
      if (diff > 0) setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-slide every 4s
  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, []);
  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [next]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", scale: 1.08, opacity: 0 }),
    center: { x: 0, scale: 1, opacity: 1, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", scale: 0.95, opacity: 0, transition: { duration: 0.5 } }),
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-14 lg:pb-20 overflow-hidden bg-blue-vlight">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

        {/* Left Column */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
          className="w-full lg:w-1/2 flex flex-col items-start text-left"
        >
          {/* Tag */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="mb-5">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-teal-dark bg-white border border-teal-dark/10 px-4 py-2 rounded-full shadow-sm">
              <Heart className="w-3.5 h-3.5 text-orange" /> APPRENDRE AUJOURD&apos;HUI, RÉUSSIR DEMAIN.
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-navy mb-6"
          >
            <span className="uppercase">Une école</span><br />
            <span className="text-orange uppercase">qui s&apos;adapte</span><br />
            <span className="text-turquoise text-5xl md:text-6xl font-medium" style={{ fontFamily: "'Caveat', 'Dancing Script', cursive", fontStyle: "italic", textTransform: "lowercase" }}>à chaque élève</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="text-base md:text-lg text-navy/65 mb-8 max-w-lg leading-relaxed"
          >
            Mon École en Live est une école 100% en ligne et gratuite : des cours en direct, filmés, en petits groupes, avec replays illimités et un vrai suivi humain. Depuis ton ordinateur, ta tablette ou ton téléphone — pour chaque élève, à son rythme.
          </motion.p>

          {/* Countdown */}
          {mounted && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="w-full max-w-sm mb-8"
            >
              <h3 className="text-[10px] font-black uppercase tracking-widest text-turquoise mb-3">Plus que quelques dodos avant la rentrée</h3>
              <div className="flex items-center gap-3">
                {[
                  { val: timeLeft.days, label: "Jours" },
                  { val: timeLeft.hours, label: "Heures" },
                  { val: timeLeft.minutes, label: "Min" },
                  { val: timeLeft.seconds, label: "Sec" },
                ].map(({ val, label }) => (
                  <div key={label} className="flex flex-col items-center justify-center bg-white rounded-xl w-16 h-[68px] shadow-sm border border-navy/5">
                    <span className="text-2xl font-black text-navy">{String(val).padStart(2, "0")}</span>
                    <span className="text-[9px] font-bold text-navy/40 uppercase mt-0.5">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="flex flex-wrap items-center gap-3"
          >
            <a href="#contact">
              <Button size="lg" className="bg-orange hover:bg-orange/90 text-white shadow-lg shadow-orange/20">
                Rejoindre la liste d&apos;attente ➔
              </Button>
            </a>
            <a href="#concept">
              <Button size="lg" variant="secondary" className="border-2 border-turquoise text-turquoise bg-white hover:bg-turquoise/5">
                Découvrir le concept
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Right Column: Slider */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
          className="w-full lg:w-1/2 relative flex items-center justify-center mt-10 lg:mt-0"
        >
          {/* Slider frame */}
          <div className="relative w-full max-w-[640px] aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-[6px] border-white bg-white">
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                <Image
                  src={slides[current].src}
                  alt={slides[current].alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority={current === 0}
                />
              </motion.div>
            </AnimatePresence>

            {/* Arrows */}
            <button
              onClick={() => { setDirection(-1); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-navy hover:bg-white transition-colors shadow z-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setDirection(1); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-navy hover:bg-white transition-colors shadow z-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-orange" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          </div>

          {/* Floating Badges */}
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[8%] left-2 md:-left-4 bg-white px-4 py-2.5 rounded-full shadow-lg border border-navy/5 flex items-center gap-2 z-20"
          >
            <Play className="w-4 h-4 text-orange fill-orange/20" />
            <span className="font-bold text-navy text-xs">Replays illimités</span>
          </motion.div>

          <motion.div
            animate={{ y: [5, -5, 5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[4%] right-2 md:-right-4 bg-white px-4 py-2.5 rounded-full shadow-lg border border-navy/5 flex items-center gap-2 z-20"
          >
            <Circle className="w-2.5 h-2.5 text-orange fill-orange" />
            <span className="font-bold text-navy text-xs">Cours en direct</span>
          </motion.div>

          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[8%] left-2 md:-left-4 bg-white px-4 py-3 rounded-2xl shadow-lg border border-navy/5 flex items-center gap-2 z-20 max-w-[220px]"
          >
            <Circle className="w-2.5 h-2.5 text-orange fill-orange shrink-0" />
            <span className="font-bold text-navy text-xs leading-tight">Cycle découverte (dès 10-11 ans) — rentrée le Lundi 4 janvier 2027</span>
          </motion.div>

          <motion.div
            animate={{ y: [3, -3, 3] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[12%] right-2 md:-right-4 bg-white px-4 py-2.5 rounded-full shadow-lg border border-navy/5 flex items-center gap-2 z-20"
          >
            <Users className="w-4 h-4 text-turquoise" />
            <span className="font-bold text-navy text-xs">10 élèves max / groupe</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20">
        <span className="text-[9px] font-bold tracking-[0.2em] text-turquoise uppercase">Défiler</span>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-px h-5 bg-gradient-to-b from-orange/20 to-orange" />
          <ChevronDown className="w-3 h-3 text-orange -mt-0.5" />
        </motion.div>
      </div>
    </section>
  );
}
