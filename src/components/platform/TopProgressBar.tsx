"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Dès que l'URL change (navigation terminée), compléter la barre et la masquer
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercepter tous les clics sur les liens internes pour afficher immédiatement le feedback de chargement
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/#") &&
        href !== pathname &&
        !target.hasAttribute("download") &&
        target.getAttribute("target") !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        setLoading(true);
        setProgress(25);

        // Progression animée fluide pendant le chargement serveur
        setTimeout(() => setProgress((prev) => (prev < 65 ? 65 : prev)), 80);
        setTimeout(() => setProgress((prev) => (prev < 88 ? 88 : prev)), 250);
      }
    };

    const handleCustomStart = () => {
      setLoading(true);
      setProgress(30);
      setTimeout(() => setProgress((prev) => (prev < 70 ? 70 : prev)), 100);
    };

    const handleCustomEnd = () => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("page:loading_start", handleCustomStart);
    window.addEventListener("page:loading_end", handleCustomEnd);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("page:loading_start", handleCustomStart);
      window.removeEventListener("page:loading_end", handleCustomEnd);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-200"
      style={{ opacity: loading ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* Barre de progression avec éclat lumineux et gradient premium */}
      <div
        className="h-1 bg-gradient-to-r from-orange via-amber-400 to-turquoise shadow-[0_0_12px_rgba(249,115,22,0.8)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
        }}
      />
      {/* Effet d'étincelle à l'extrémité de la barre */}
      {loading && (
        <div
          className="absolute top-0 h-1 w-24 bg-white/60 blur-xs transition-all duration-300 -translate-y-0.5 pointer-events-none"
          style={{ left: `calc(${progress}% - 96px)` }}
        />
      )}
    </div>
  );
}
