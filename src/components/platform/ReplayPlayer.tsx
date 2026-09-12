"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Check,
  Sparkles,
  Wifi,
  Gauge,
  X,
} from "lucide-react";

interface ReplayPlayerProps {
  src: string;
  title?: string;
}

type VideoQuality = "auto" | "1080p" | "720p" | "480p" | "360p";

const QUALITY_OPTIONS: { id: VideoQuality; label: string; badge?: string; desc: string }[] = [
  { id: "auto", label: "Automatique", badge: "Adaptatif", desc: "Ajuste selon votre débit internet" },
  { id: "1080p", label: "1080p HD", badge: "Fibre / 5G", desc: "Qualité maximale haute définition" },
  { id: "720p", label: "720p HD", badge: "Standard", desc: "Excellent compromis fluidité / netteté" },
  { id: "480p", label: "480p SD", badge: "Économie", desc: "Idéal pour 4G et connexions moyennes" },
  { id: "360p", label: "360p Basse", badge: "Faible connexion", desc: "Ultra-léger pour 3G / ADSL modeste" },
];

export default function ReplayPlayer({ src, title }: ReplayPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Menu Paramètres & Multi-Qualités YouTube-style
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>("auto");
  const [effectiveQuality, setEffectiveQuality] = useState<string>("720p");
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  // Correction du bug de durée infinie/inconnue des fichiers WebM MediaRecorder
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      } else {
        video.currentTime = 1e10;
        const handleTimeUpdate = () => {
          if (video.duration && isFinite(video.duration)) {
            setDuration(video.duration);
          } else {
            setDuration(video.currentTime);
          }
          video.currentTime = 0;
          video.removeEventListener("timeupdate", handleTimeUpdate);
        };
        video.addEventListener("timeupdate", handleTimeUpdate, { once: true });
      }
    };

    const handleDurationChange = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration && isFinite(video.duration) && video.duration > duration) {
        setDuration(video.duration);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src, duration]);

  // Simulation / Gestion du débit adaptatif si "auto"
  useEffect(() => {
    if (currentQuality === "auto") {
      // Détection automatique de connexion si supportée par le navigateur
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
        if (effectiveType === "2g" || effectiveType === "slow-2g") {
          setEffectiveQuality("360p");
        } else if (effectiveType === "3g") {
          setEffectiveQuality("480p");
        } else {
          setEffectiveQuality("720p HD");
        }
      } else {
        setEffectiveQuality("720p HD");
      }
    } else {
      setEffectiveQuality(currentQuality);
    }
  }, [currentQuality]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleJump = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration || 10000, video.currentTime + seconds));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 1;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const changeSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // Changement de qualité vidéo avec notification toast
  const handleChangeQuality = (quality: VideoQuality) => {
    const currentPos = videoRef.current?.currentTime || 0;
    const wasPlaying = !videoRef.current?.paused;

    setCurrentQuality(quality);
    const selectedOption = QUALITY_OPTIONS.find((q) => q.id === quality);
    setQualityToast(`Qualité réglée sur : ${selectedOption?.label || quality}`);

    // Sauvegarde de la position et reprise fluide
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentPos;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    }, 150);

    setTimeout(() => {
      setQualityToast(null);
    }, 2500);

    setSettingsOpen(false);
  };

  // Gestion universelle du Plein Écran (iOS Safari iPhone, Android, Mac, PC)
  const toggleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current;

    // A. Sur iPhone / Safari iOS : Le conteneur <div> ne supporte pas requestFullscreen, seul <video> supporte webkitEnterFullscreen
    const isIos =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    if (isIos && video && typeof (video as any).webkitEnterFullscreen === "function") {
      try {
        (video as any).webkitEnterFullscreen();
        return;
      } catch (e) {}
    }

    // B. Standard Fullscreen API (Android Chrome, Windows, Mac Chrome/Firefox/Safari)
    const doc: any = typeof document !== "undefined" ? document : {};
    const isDocFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isDocFs) {
      const enterFs =
        container?.requestFullscreen ||
        (container as any)?.webkitRequestFullscreen ||
        (container as any)?.mozRequestFullScreen ||
        (container as any)?.msRequestFullscreen ||
        (video as any)?.webkitEnterFullscreen ||
        (video as any)?.requestFullscreen;

      if (enterFs) {
        try {
          const res = enterFs.call(container || video);
          if (res && typeof res.catch === "function") {
            res.catch(() => {
              if (video && typeof (video as any).webkitEnterFullscreen === "function") {
                (video as any).webkitEnterFullscreen();
              }
            });
          }
        } catch (e) {
          if (video && typeof (video as any).webkitEnterFullscreen === "function") {
            (video as any).webkitEnterFullscreen();
          }
        }
      }

      // Verrouiller l'orientation paysage si supporté sur smartphone
      try {
        if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } catch (e) {}
      setIsFullscreen(true);
    } else {
      const exitFs =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exitFs) {
        try {
          exitFs.call(doc);
        } catch (e) {}
      }
      try {
        if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (e) {}
      setIsFullscreen(false);
    }
  };

  // Écouteurs de changement de plein écran (Standard + Webkit iOS)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc: any = document;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    const video = videoRef.current;
    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleWebkitBegin);
      video.addEventListener("webkitendfullscreen", handleWebkitEnd);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);

      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleWebkitBegin);
        video.removeEventListener("webkitendfullscreen", handleWebkitEnd);
      }
    };
  }, []);

  const lastTapRef = useRef<number>(0);
  const handleVideoClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap -> Plein écran immédiat
      toggleFullscreen();
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const totalSecs = Math.floor(timeInSeconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !settingsOpen) setShowControls(false);
    }, 3000);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !settingsOpen && setShowControls(false)}
      className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-black shadow-2xl group select-none aspect-video flex items-center justify-center border border-white/10 w-full"
    >
      <video
        ref={videoRef}
        src={src}
        onClick={handleVideoClick}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Toast de confirmation de qualité vidéo */}
      {qualityToast && (
        <div className="absolute top-4 right-4 z-40 bg-navy/90 border border-turquoise/40 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Gauge className="w-4 h-4 text-turquoise" />
          <span>{qualityToast}</span>
        </div>
      )}

      {/* Titre du cours en incrustation discrète en haut à gauche */}
      {title && (
        <div
          className={`absolute top-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent text-white text-[11px] sm:text-xs font-bold truncate transition-opacity duration-300 z-20 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {title}
        </div>
      )}

      {/* Bouton de Play central géant lorsqu'en pause */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-turquoise/90 hover:bg-turquoise text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 backdrop-blur-sm"
          title="Lire la vidéo"
        >
          <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white translate-x-0.5" />
        </button>
      )}

      {/* MENU PARAMÈTRES / SÉLECTEUR DE QUALITÉ YOUTUBE-STYLE */}
      {settingsOpen && (
        <div className="absolute bottom-16 right-2 sm:right-4 z-50 bg-[#121c24]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 shadow-2xl w-64 sm:w-72 text-white text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2 font-black text-sm text-white">
              <Gauge className="w-4 h-4 text-turquoise" />
              <span>Qualité Vidéo</span>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-white/40 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleChangeQuality(opt.id)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  currentQuality === opt.id
                    ? "bg-turquoise/20 text-turquoise border border-turquoise/30 font-bold"
                    : "hover:bg-white/10 text-white/80 hover:text-white"
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/50">{opt.desc}</div>
                </div>
                {currentQuality === opt.id && <Check className="w-4 h-4 text-turquoise" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barre de contrôles personnalisée */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-6 pb-2.5 px-3 sm:px-4 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying || settingsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber / Barre de progression */}
        <div className="relative mb-2 sm:mb-3 flex items-center group/scrubber cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full appearance-none outline-none accent-turquoise cursor-pointer transition-all"
            style={{
              background: `linear-gradient(to right, #119eb1 ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Ligne des contrôles */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-white">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer touch-manipulation"
              title={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
            </button>

            {/* Reculer 10s */}
            <button
              onClick={() => handleJump(-10)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer text-white/80 hover:text-white hidden sm:block"
              title="Reculer de 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Avancer 10s */}
            <button
              onClick={() => handleJump(10)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer text-white/80 hover:text-white hidden sm:block"
              title="Avancer de 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                title={isMuted ? "Activer le son" : "Couper le son"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded-lg appearance-none accent-turquoise cursor-pointer opacity-0 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>

            {/* Affichage du temps */}
            <div className="text-[10px] sm:text-xs font-mono font-bold bg-white/10 px-2 py-0.5 sm:py-1 rounded-lg border border-white/10 flex items-center gap-1">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-white/40">/</span>
              <span className="text-turquoise font-black">
                {duration > 0 ? formatTime(duration) : "--:--"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Vitesse de lecture (Visible sur écrans moyens/grands) */}
            <div className="hidden sm:flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10 text-[10px] font-bold font-mono">
              {[1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => changeSpeed(rate)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    playbackRate === rate
                      ? "bg-turquoise text-white shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Bouton Menu Qualité & Paramètres (YouTube-Style) */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                settingsOpen
                  ? "bg-turquoise text-white border-turquoise shadow-md"
                  : "bg-white/10 border-white/10 text-white/90 hover:bg-white/20 hover:text-white"
              }`}
              title="Paramètres de qualité vidéo"
            >
              <Settings className={`w-3.5 h-3.5 ${settingsOpen ? "animate-spin" : ""}`} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-turquoise bg-white/10 px-1 py-0.2 rounded hidden xs:inline">
                {currentQuality === "auto" ? `${effectiveQuality}` : currentQuality}
              </span>
            </button>

            {/* Plein écran (Optimisé Tactile iPhone & Android) */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-turquoise/90 hover:bg-turquoise text-white transition-all active:scale-95 shadow-md shadow-turquoise/20 cursor-pointer touch-manipulation flex items-center justify-center"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran horizontal"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
