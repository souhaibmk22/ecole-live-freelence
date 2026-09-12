"use client";

import { motion } from "framer-motion";
import { ArrowUp, Flame } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import Image from "next/image";

const exploreLinks = [
  { label: "Le concept", href: "#concept" },
  { label: "Pour qui ?", href: "#pour-qui" },
  { label: "Comment ça marche", href: "#comment-ca-marche" },
  { label: "Cycle découverte", href: "#cycle-decouverte" },
];

const associationLinks = [
  { label: "IGNIS NOVUS", href: "https://web.ignisnovus.org", external: true },
  { label: "Contact", href: "#contact" },
  { label: "Mentions légales", href: "#" },
];

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="bg-[#2c3e50] text-white relative overflow-hidden">
      {/* Top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-turquoise via-orange to-turquoise" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 items-start">

          {/* Logo & About */}
          <div>
            <div className="mb-5">
              <Image
                src="/logo.png"
                alt="Mon École en Live"
                width={160}
                height={60}
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-5 max-w-xs">
              Mon École en Live est un pôle de l&apos;association loi 1901{" "}
              <span className="text-white font-semibold">IGNIS NOVUS</span>, aux côtés d&apos;IGNIS MAG et d&apos;IGNIS SHOW.{" "}
              Une école en ligne gratuite, humaine et ouverte à tous.
            </p>
            <motion.a
              href="https://web.ignisnovus.org"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ x: 3 }}
              className="inline-flex items-center gap-2 text-orange font-semibold text-sm hover:text-orange/80 transition-colors"
            >
              <Flame className="w-4 h-4" />
              web.ignisnovus.org
            </motion.a>
          </div>

          {/* Explorer */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-5">EXPLORER</h4>
            <ul className="space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <motion.a
                    href={link.href}
                    whileHover={{ x: 4, color: "#37B6BA" }}
                    className="text-white/60 text-sm hover:text-turquoise transition-colors duration-200"
                  >
                    {link.label}
                  </motion.a>
                </li>
              ))}
            </ul>
          </div>

          {/* L'Association */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-5">L&apos;ASSOCIATION</h4>
            <ul className="space-y-3">
              {associationLinks.map((link) => (
                <li key={link.label}>
                  <motion.a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    whileHover={{ x: 4, color: "#37B6BA" }}
                    className="text-white/60 text-sm hover:text-turquoise transition-colors duration-200"
                  >
                    {link.label}
                  </motion.a>
                </li>
              ))}
            </ul>
          </div>

          {/* Suivre + Scroll top */}
          <div className="flex flex-col gap-8">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-5">SUIVRE</h4>
              <div className="flex items-center gap-3">
                <motion.a
                  href="https://instagram.com/monecoleenlive"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.15, backgroundColor: "#f97316" }}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="w-4 h-4" />
                </motion.a>
                <motion.a
                  href="https://facebook.com/monecoleenlive"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.15, backgroundColor: "#f97316" }}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="w-4 h-4" />
                </motion.a>
              </div>
            </div>

            {/* Scroll to top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1, backgroundColor: "#ea7a20" }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-orange flex items-center justify-center text-white shadow-md shadow-orange/30 transition-colors duration-200 self-start"
              aria-label="Retour en haut"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} IGNIS NOVUS — Association loi 1901. Tous droits réservés.
          </p>
          <p className="text-orange font-bold text-xs tracking-wider">
            APPRENDRE AUJOURD&apos;HUI, RÉUSSIR DEMAIN.
          </p>
          <p className="text-white/30 text-xs">
            Fait avec{" "}
            <span className="text-orange">♥</span>{" "}
            <span className="text-turquoise">pour celles et ceux qui veulent apprendre.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
