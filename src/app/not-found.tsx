import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-vlight text-navy px-4 py-16 text-center relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-turquoise/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-orange/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-navy/5 shadow-xl space-y-6 relative z-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-turquoise/20 to-orange/20 flex items-center justify-center mx-auto text-orange shadow-inner">
          <Compass className="w-10 h-10 animate-spin-slow text-orange" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-orange bg-orange/10 px-3 py-1 rounded-full">
            Erreur 404
          </span>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Page introuvable
          </h1>
          <p className="text-sm text-navy/60 leading-relaxed">
            Oups ! La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange hover:bg-orange/90 text-white font-bold text-sm shadow-lg shadow-orange/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-vlight hover:bg-navy/5 text-navy font-bold text-sm border border-navy/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-orange" />
            Connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
