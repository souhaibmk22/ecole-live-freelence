"use client";

import { motion } from "framer-motion";
import { Mail, Phone, Send } from "lucide-react";

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
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Contact() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert([{ email }]);
      
    setLoading(false);
    
    if (dbError) {
      console.error("Supabase error:", dbError);
      if (dbError.code === "23505") {
        setError("Cet e-mail est déjà sur la liste d'attente !");
      } else {
        setError("Une erreur s'est produite. Veuillez réessayer.");
      }
    } else {
      setSent(true);
    }
  };

  return (
    <section id="contact" className="py-24 px-6 md:px-12 bg-blue-vlight relative overflow-hidden">
      {/* Giant Background Number */}
      <div className="absolute top-0 left-[-20px] md:left-0 pointer-events-none select-none z-0">
        <span
          className="text-[280px] md:text-[420px] font-black text-transparent leading-none"
          style={{ WebkitTextStroke: "1px rgba(54, 74, 94, 0.2)" }}
        >
          08
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Badge + Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3"
        >
          <span className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-navy/5 shadow-sm">
            <span className="text-orange font-bold text-xs uppercase tracking-widest">08</span>
            <span className="w-1.5 h-1.5 rounded-full bg-turquoise"></span>
            <span className="text-teal-dark font-bold text-xs uppercase tracking-[0.15em]">CONTACT</span>
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-[1.15] mb-14"
        >
          Sois le premier informé{" "}
          <span className="text-turquoise">du<br className="hidden md:block" /> lancement.</span>
        </motion.h2>

        {/* Main card container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row rounded-[2rem] overflow-hidden shadow-lg"
        >
          {/* Left — dark navy info panel */}
          <div className="w-full md:w-[45%] bg-[#2c3e50] p-8 md:p-10 flex flex-col justify-between">
            <div>
              <p className="text-white/70 text-sm leading-relaxed mb-8">
                Rentrée officielle :{" "}
                <span className="text-white font-bold">lundi 4 janvier 2027</span>. Laisse-nous ton email et on te prévient dès l&apos;ouverture des inscriptions du cycle découverte (à partir de 10-11 ans).
              </p>

              <div className="space-y-4">
                {/* Email */}
                <motion.a
                  href="mailto:contact@ignisnovus.org"
                  whileHover="hovered"
                  className="flex items-center gap-4 group"
                >
                  <motion.div
                    variants={{ hovered: { backgroundColor: "#f97316", color: "#ffffff" } }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 transition-colors duration-300"
                  >
                    <Mail className="w-4 h-4" />
                  </motion.div>
                  <motion.span
                    variants={{ hovered: { color: "#f97316" } }}
                    className="text-white/70 text-sm font-medium transition-colors duration-300"
                  >
                    contact@ignisnovus.org
                  </motion.span>
                </motion.a>

                {/* Phone */}
                <motion.a
                  href="tel:+33749121204"
                  whileHover="hovered"
                  className="flex items-center gap-4 group"
                >
                  <motion.div
                    variants={{ hovered: { backgroundColor: "#f97316", color: "#ffffff" } }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 transition-colors duration-300"
                  >
                    <Phone className="w-4 h-4" />
                  </motion.div>
                  <motion.span
                    variants={{ hovered: { color: "#f97316" } }}
                    className="text-white/70 text-sm font-medium transition-colors duration-300"
                  >
                    07 49 12 12 04
                  </motion.span>
                </motion.a>

                {/* Social */}
                <div className="flex items-center gap-3 pt-1">
                  <motion.a
                    href="https://instagram.com/monecoleenlive"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, backgroundColor: "#f97316" }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </motion.a>
                  <motion.a
                    href="https://facebook.com/monecoleenlive"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, backgroundColor: "#f97316" }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </motion.a>
                  <span className="text-white/40 text-xs ml-1">@monecoleenlive</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="w-full md:w-[55%] bg-white p-8 md:p-10 flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-navy mb-2">Liste d&apos;attente</h3>
            <p className="text-navy/55 text-sm leading-relaxed mb-7">
              Une seule chose à faire : laisser ton email. Promis, pas de spam — juste l&apos;essentiel au moment du lancement.
            </p>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-teal-dark font-bold text-lg">Tu es sur la liste !</p>
                <p className="text-navy/50 text-sm mt-2">On te prévient dès l&apos;ouverture des inscriptions.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.fr"
                  className="w-full border-2 border-navy/10 focus:border-turquoise outline-none rounded-full px-6 py-3.5 text-navy text-sm placeholder:text-navy/30 transition-colors duration-200"
                />
                {error && <p className="text-red-500 text-xs font-semibold px-2">{error}</p>}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  type="submit"
                  className="w-full bg-orange hover:bg-orange/90 disabled:opacity-50 text-white font-bold rounded-full px-6 py-3.5 text-sm flex items-center justify-center gap-2 transition-colors duration-200 shadow-md shadow-orange/20"
                >
                  {loading ? "Enregistrement..." : (
                    <>Me tenir informé·e <Send className="w-4 h-4" /></>
                  )}
                </motion.button>
                <p className="text-navy/35 text-xs text-center">
                  Tes données restent entre nous — uniquement pour t&apos;informer du lancement.
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
