"use client";

import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { Menu, X, ArrowRight, User } from "lucide-react";
import Button from "../ui/Button";

const NAV_LINKS = [
  { label: "Le concept", href: "#concept" },
  { label: "Pour qui ?", href: "#pour-qui" },
  { label: "Comment ça marche", href: "#comment-ca-marche" },
  { label: "Cycle découverte", href: "#cycle-decouverte" },
  { label: "Calendrier", href: "#calendrier" },
  { label: "FAQ", href: "#faq" },
  { label: "IGNIS NOVUS", href: "#ignis-novus" },
];

export default function Navbar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
      setMobileMenuOpen(false);
    } else {
      setHidden(false);
    }
    setScrolled(latest > 30);
  });

  return (
    <motion.header
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl shadow-sm border-b border-navy/5 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Logo Mon École en Live */}
        <div className="flex items-center flex-shrink-0">
          <a href="#" className="cursor-pointer group flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Mon École en Live"
              width={200}
              height={70}
              priority
              className="h-10 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </a>
        </div>

        {/* Navigation Desktop : Alignement parfait sans retours à la ligne avec animations hover */}
        <nav
          onMouseLeave={() => setHoveredIdx(null)}
          className="hidden xl:flex items-center gap-1 bg-navy/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-navy/5"
        >
          {NAV_LINKS.map((link, idx) => (
            <a
              key={link.href}
              href={link.href}
              onMouseEnter={() => setHoveredIdx(idx)}
              className="relative px-3.5 py-1.5 text-xs font-bold text-navy hover:text-teal-dark whitespace-nowrap transition-colors duration-200 z-10 select-none"
            >
              {hoveredIdx === idx && (
                <motion.div
                  layoutId="navbar-hover-pill"
                  className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              {link.label}
            </a>
          ))}
        </nav>

        {/* Navigation Desktop Moyen (1024px - 1280px) */}
        <nav className="hidden lg:flex xl:hidden items-center gap-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-bold text-navy hover:text-turquoise whitespace-nowrap transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Boutons d'Action Droite */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <a
            href="/login"
            className="text-navy font-bold hover:text-teal-dark transition-all text-xs font-mono px-3.5 py-2 rounded-full hover:bg-navy/5 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-turquoise" />
            <span>Connexion</span>
          </a>

          <a href="#contact" className="group">
            <button className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-md shadow-orange/25 hover:shadow-lg hover:shadow-orange/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
              <span>Liste d&apos;attente</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </a>
        </div>

        {/* Bouton Menu Mobile */}
        <div className="flex items-center lg:hidden gap-2">
          <a
            href="/login"
            className="text-navy text-xs font-bold px-3 py-1.5 rounded-full bg-navy/5 hover:bg-navy/10 transition-colors"
          >
            Connexion
          </a>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-navy hover:bg-navy/5 transition-colors cursor-pointer"
            aria-label="Menu de navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu Déroulant Mobile avec Animation Fluide */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-navy/10 px-6 py-5 shadow-xl overflow-hidden"
          >
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-navy font-bold text-sm py-2 hover:text-turquoise transition-colors border-b border-navy/5 flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <span className="text-navy/30 text-xs">➔</span>
                </a>
              ))}

              <div className="pt-3 flex flex-col gap-2.5">
                <a
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-2xl bg-navy/5 text-navy font-bold text-sm hover:bg-navy/10 transition-colors"
                >
                  Accéder à la plateforme
                </a>
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-2xl bg-orange text-white font-bold text-sm shadow-md shadow-orange/20"
                >
                  Rejoindre la liste d&apos;attente ➔
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
