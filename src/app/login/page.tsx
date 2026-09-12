"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, LogIn, ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_HOME, type Role } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Identifiants incorrects. Veuillez vérifier votre email et mot de passe.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Récupérer le profil pour connaître le rôle exact
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = (profile?.role as Role) || "etudiant";
        const target = redirectTo || ROLE_HOME[role] || "/etudiant";

        router.push(target);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur inattendue est survenue.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-navy/5 relative z-10"
    >
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.png"
            alt="Mon École en Live"
            width={200}
            height={70}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-black text-navy tracking-tight">
          Espace Plateforme
        </h1>
        <p className="text-sm text-navy/60 mt-1">
          Connectez-vous à votre espace d&apos;apprentissage ou de gestion
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed"
        >
          {error}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-2">
            Adresse Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-navy/40">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@exemple.fr"
              className="w-full pl-11 pr-4 py-3.5 bg-blue-vlight/50 border-2 border-navy/10 rounded-2xl text-navy text-sm font-medium focus:border-turquoise focus:bg-white outline-none transition-all placeholder:text-navy/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-2">
            Mot de Passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-navy/40">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-11 pr-12 py-3.5 bg-blue-vlight/50 border-2 border-navy/10 rounded-2xl text-navy text-sm font-medium focus:border-turquoise focus:bg-white outline-none transition-all placeholder:text-navy/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-navy/40 hover:text-navy transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange hover:bg-orange/90 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-orange/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connexion en cours...
            </span>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Se connecter
            </>
          )}
        </button>
      </form>

      {/* Security Footer Badge */}
      <div className="mt-8 pt-6 border-t border-navy/10 flex items-center justify-center gap-2 text-[11px] text-navy/50 font-medium">
        <ShieldCheck className="w-4 h-4 text-teal-dark" />
        <span>Accès sécurisé &amp; chiffrement SSL</span>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-blue-vlight flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12">
      {/* Background orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-turquoise/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Back to website button */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy/70 hover:text-navy transition-colors bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-navy/5 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-orange" />
          Retour au site vitrine
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl border border-navy/5 text-center text-navy/40 font-bold text-sm">
            Chargement...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
