"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

const faqs = [
  {
    q: "C'est vraiment 100% gratuit ?",
    a: "Oui, et pour toujours. Mon École en Live est portée par l'association loi 1901 IGNIS NOVUS : aucuns frais d'inscription, aucun abonnement, aucun coût caché. L'accès à l'éducation ne doit jamais dépendre d'un portefeuille.",
  },
  {
    q: "Qui peut rejoindre l'école ?",
    a: "Tout le monde : élèves en phobie scolaire ou en décrochage, familles en instruction en famille (IEF), jeunes adultes et adultes en insertion ou reconversion. Le cycle découverte qui ouvre le bal en janvier 2027 accueille les élèves dès 10-11 ans.",
  },
  {
    q: "Et si mon enfant rate un cours en direct ?",
    a: "Aucun stress : chaque cours est filmé et les replays sont illimités. Ton enfant peut même rattraper le cours d'un autre créneau que le sien, quand il est prêt.",
  },
  {
    q: "Combien d'élèves par classe ?",
    a: "10 élèves maximum par groupe. C'est notre promesse : chaque enfant peut parler, poser ses questions et être vraiment suivi, jamais noyé dans la masse.",
  },
  {
    q: "Quel matériel faut-il ?",
    a: "Un ordinateur ou une tablette, une connexion internet, et un casque si possible. C'est tout — aucun manuel à acheter, aucun logiciel payant.",
  },
  {
    q: "Comment les parents sont-ils informés ?",
    a: "Notes, exercices corrigés et échanges réguliers avec l'équipe pédagogique : tu suis les progrès de ton enfant en toute transparence, tout au long de l'année.",
  },
  {
    q: "Quand commencent les cours ?",
    a: "La rentrée du cycle découverte (dès 10-11 ans) a lieu le lundi 4 janvier 2027. Inscris-toi à la liste d'attente pour être prévenu·e dès l'ouverture des inscriptions.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="py-24 px-6 md:px-12 bg-blue-vlight relative overflow-hidden">
      {/* Giant Background Number */}
      <div className="absolute top-0 left-[-20px] md:left-0 pointer-events-none select-none z-0">
        <span
          className="text-[280px] md:text-[420px] font-black text-transparent leading-none"
          style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}
        >
          07
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row gap-16 lg:gap-24">

        {/* Left Column */}
        <div className="w-full lg:w-[38%] lg:sticky top-32 h-fit">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
              <span className="text-orange font-bold text-xs uppercase tracking-widest">07</span>
              <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
              <span className="text-teal-dark font-bold text-xs uppercase tracking-[0.15em]">FAQ</span>
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-[1.15] mb-6"
          >
            Les questions que{" "}
            <span className="text-turquoise">toutes les familles</span>{" "}
            <span className="text-orange">se posent.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm text-navy/55 leading-relaxed mb-10"
          >
            Gratuité, replays, matériel, suivi… tout ce qu&apos;il faut savoir avant de sauter le pas, sans langue de bois.
          </motion.p>

          <motion.a
            href="https://wa.me/33600000000"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center gap-3 bg-white border border-navy/10 text-navy font-semibold text-sm px-5 py-3 rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <MessageCircle className="w-4 h-4 text-turquoise" />
            Une autre question ? Écris-nous
          </motion.a>
        </div>

        {/* Right Column — FAQ Items */}
        <div className="w-full lg:w-[62%] flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-[1.5rem] border-2 overflow-hidden transition-colors duration-300 shadow-sm
                  ${isOpen ? "border-orange shadow-orange/10" : "border-navy/5 hover:border-turquoise/30"}`}
              >
                {/* Question row */}
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-7 py-5 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-orange font-black text-xs tracking-widest shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-navy font-bold text-base group-hover:text-turquoise transition-colors duration-200">
                      {faq.q}
                    </span>
                  </div>

                  {/* +/× icon */}
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-4 transition-colors duration-300
                      ${isOpen ? "bg-orange text-white" : "bg-blue-vlight text-turquoise"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div className="px-7 pb-6">
                        {/* animated top divider line */}
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="h-[2px] bg-gradient-to-r from-orange to-turquoise rounded-full mb-5"
                          style={{ originX: 0 }}
                        />
                        <p className="text-navy/65 leading-relaxed text-sm pl-9">
                          {faq.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
