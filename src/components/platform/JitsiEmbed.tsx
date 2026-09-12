"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  Maximize2,
  Minimize2,
  ExternalLink,
  Circle,
  Square,
  Sparkles,
  PhoneOff,
  CheckCircle2,
  Loader2,
  RotateCw,
  Video,
  X,
} from "lucide-react";
import { getReplayUploadUrlAction, attachReplayUrlAction } from "@/app/(platform)/prof/planning/actions";
import { getJaasJwtTokenAction } from "@/lib/jaas";
import { createClient } from "@/lib/supabase/client";

export interface JitsiEmbedHandle {
  stopRecording: () => Promise<string | null>;
  isRecording: () => boolean;
}

interface JitsiEmbedProps {
  roomName: string;
  displayName: string;
  sessionId?: string;
  onLeave?: () => void;
  title?: string;
  isTeacher?: boolean;
  showLeaveButton?: boolean;
}

const JitsiEmbed = forwardRef<JitsiEmbedHandle, JitsiEmbedProps>(function JitsiEmbed(
  {
    roomName,
    displayName,
    sessionId,
    onLeave,
    title,
    isTeacher = false,
    showLeaveButton = false,
  },
  ref
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Serveur Jitsi standard
  const serverDomain = "meet.jit.si";

  // Enregistreur vidéo & publication replay
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saveToLocalPc, setSaveToLocalPc] = useState(false);
  const [autoUploadingReplay, setAutoUploadingReplay] = useState(false);
  const [autoUploadSuccess, setAutoUploadSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Auto-dismiss loading overlay after 1.8s so it never stays stuck
  useEffect(() => {
    setIframeLoaded(false);
    const timer = setTimeout(() => {
      setIframeLoaded(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [iframeKey, roomName]);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nettoyage complet lors du démontage
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  // Protection anti-fermeture accidentelle d'onglet pendant l'enregistrement du cours
  useEffect(() => {
    if (!isRecording) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Un cours est en cours d'enregistrement. Si vous quittez maintenant, l'enregistrement sera perdu.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording]);

  const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, "_");
  const encodedDisplayName = encodeURIComponent(displayName || "Participant");

  // Paramètres d'interface natifs pour une visio haute performance et économe en bande passante
  const jitsiConfigParams = [
    `userInfo.displayName="${encodedDisplayName}"`,
    "config.prejoinConfig.enabled=false",
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "config.disableDeepLinking=true",
    "config.requireDisplayName=false",
    "config.enableWelcomePage=false",
    "config.enableClosePage=false",
    "config.channelLastN=8",
    "config.disableSimulcast=false",
    "interfaceConfig.SHOW_JITSI_WATERMARK=false",
    "interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false",
    "interfaceConfig.SHOW_BRAND_WATERMARK=false",
    "interfaceConfig.HIDE_DEEP_LINKING_LOGO=true",
  ].join("&");

  const directRoomUrl = `https://${serverDomain}/${cleanRoomName}#${jitsiConfigParams}`;

  const [recordError, setRecordError] = useState<string | null>(null);

  // 1. Démarrer l'enregistrement de l'écran avec mixage audio du microphone PC
  const startRecording = async () => {
    setRecordError(null);
    try {
      recordedChunksRef.current = [];

      // A. Capture de l'écran / fenêtre du professeur (avec repli gracieux)
      let screenStream: MediaStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
          } as any,
          audio: true,
        });
      } catch (displayErr: any) {
        // Fallback sans audio d'écran si macOS/navigateur refuse le son système
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        } catch (finalDisplayErr: any) {
          if (finalDisplayErr.name === "NotAllowedError") {
            setRecordError("Partage d'écran non autorisé ou annulé. Cliquez sur « Enregistrer » et choisissez l'onglet ou l'écran du cours.");
          } else {
            setRecordError(`Impossible de capturer l'écran : ${finalDisplayErr.message}`);
          }
          setIsRecording(false);
          return;
        }
      }

      streamRef.current = screenStream;

      // B. Capture du microphone physique de l'ordinateur
      let userMicStream: MediaStream | null = null;
      try {
        userMicStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = userMicStream;
      } catch (micErr) {
        console.warn("Microphone direct non accessible, enregistrement sans micro:", micErr);
      }

      // C. Source Audio Propre & Anti-Écho (Microphone PC avec annulation de bruit)
      let finalAudioTracks: MediaStreamTrack[] = [];

      if (userMicStream && userMicStream.getAudioTracks().length > 0) {
        // Source 1 : Microphone physique avec annulation d'écho matérielle
        finalAudioTracks = userMicStream.getAudioTracks();
      } else if (screenStream.getAudioTracks().length > 0) {
        // Source 2 (Fallback) : Audio de l'écran
        finalAudioTracks = screenStream.getAudioTracks();
      }

      // D. Création du flux final combiné (Vidéo + Audio)
      const combinedTracks = [
        ...screenStream.getVideoTracks(),
        ...finalAudioTracks,
      ];
      const combinedStream = new MediaStream(combinedTracks);

      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // E. Négociation automatique du format supporté par le navigateur
      let mime = "";
      const supportedMimes = finalAudioTracks.length > 0
        ? [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=h264,opus",
            "video/webm",
            "video/mp4",
          ]
        : [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
            "video/mp4",
          ];

      for (const candidate of supportedMimes) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          mime = candidate;
          break;
        }
      }

      const mediaRecorder = mime
        ? new MediaRecorder(combinedStream, { mimeType: mime })
        : new MediaRecorder(combinedStream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Erreur lors du démarrage de l'enregistrement:", err);
      setRecordError(`Erreur: ${err?.message || "Impossible de démarrer l'enregistrement."}`);
      setIsRecording(false);
    }
  };

  // 2. Arrêt et téléversement SYNCHRONE sécurisé vers Supabase
  const stopRecording = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        setIsRecording(false);
        resolve(null);
        return;
      }

      // Arrêt des flux micro et écran
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }

      // Écoute synchrone de l'arrêt du recorder
      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        if (recordedChunksRef.current.length === 0) {
          resolve(null);
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });

        // A. Sauvegarde locale sur le PC si l'enseignant l'a cochée
        if (saveToLocalPc) {
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            const cleanTitle = (title || "Cours").replace(/[^a-zA-Z0-9]/g, "_");
            a.download = `Enregistrement_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 100);
          } catch (e) {}
        }

        // B. Téléversement DIRECT vers Supabase Storage (Bypasse Vercel 4.5MB limit)
        if (sessionId && blob.size > 0) {
          setAutoUploadingReplay(true);
          try {
            const urlRes = await getReplayUploadUrlAction(sessionId, "webm");
            if (!urlRes.success || !urlRes.publicUrl) {
              throw new Error(urlRes.error || "Impossible d'initialiser l'envoi");
            }

            const supabase = createClient();
            let uploadError: any = null;

            if (urlRes.token && urlRes.path) {
              const { error } = await supabase.storage
                .from("course-replays")
                .uploadToSignedUrl(urlRes.path, urlRes.token, blob, {
                  contentType: "video/webm",
                  upsert: true,
                });
              uploadError = error;
            } else {
              const { error } = await supabase.storage
                .from("course-replays")
                .upload(urlRes.fileName, blob, {
                  contentType: "video/webm",
                  upsert: true,
                });
              uploadError = error;
            }

            if (uploadError) {
              // Fallback upload direct
              const { error: directErr } = await supabase.storage
                .from("course-replays")
                .upload(urlRes.fileName, blob, {
                  contentType: "video/webm",
                  upsert: true,
                });
              if (directErr) {
                console.error("Storage upload error:", uploadError || directErr);
                setRecordError(`Échec d'envoi vers le stockage : ${(uploadError || directErr).message}`);
                resolve(null);
                return;
              }
            }

            // Associer l'URL dans la base de données et notifier les élèves
            const attachRes = await attachReplayUrlAction({
              sessionId,
              replayUrl: urlRes.publicUrl,
            });

            if (attachRes.success) {
              setAutoUploadSuccess(true);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("live:replay_uploaded", {
                    detail: { sessionId, replayUrl: urlRes.publicUrl },
                  })
                );
              }
              resolve(urlRes.publicUrl);
            } else {
              setRecordError(`Échec d'enregistrement: ${attachRes.error || "Erreur"}`);
              resolve(null);
            }
          } catch (err: any) {
            console.error("Direct storage upload error:", err);
            setRecordError(`Erreur d'envoi: ${err?.message || "Erreur réseau"}`);
            resolve(null);
          } finally {
            setAutoUploadingReplay(false);
          }
        } else {
          resolve(null);
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        setIsRecording(false);
        resolve(null);
      }
    });
  };

  useImperativeHandle(ref, () => ({
    stopRecording,
    isRecording: () => isRecording,
  }));

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleOpenExternal = () => {
    window.open(directRoomUrl, "_blank", "noopener,noreferrer");
  };

  const handleLeaveCall = async () => {
    if (isRecording) {
      await stopRecording();
    }
    if (onLeave) onLeave();
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden shadow-2xl border border-navy/10 bg-[#182833] flex flex-col transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
          : "w-full h-[620px]"
      }`}
    >
      {/* Barre d'en-tête du direct */}
      <div className="bg-[#101d26] px-4 py-3 border-b border-white/10 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-black tracking-wider uppercase">
              {isTeacher ? "Session Enseignant" : "Classe Virtuelle"}
            </span>
          </div>

          <div className="hidden sm:block w-px h-4 bg-white/20" />

          <div className="text-white/80 text-xs font-medium truncate">
            {title || `Salle : ${cleanRoomName}`}
          </div>
        </div>

        {/* Actions & Contrôles */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications de statut Replay */}
          {autoUploadingReplay && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange/20 border border-orange/30 text-orange text-[11px] font-bold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Envoi Replay...</span>
            </div>
          )}

          {autoUploadSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/20 border border-turquoise/30 text-turquoise text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Replay publié !</span>
            </div>
          )}

          {/* Bouton d'enregistrement du cours pour l'enseignant */}
          {isTeacher && (
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={autoUploadingReplay}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                  title="Enregistrer l'écran et votre micro pour le replay"
                >
                  <Circle className="w-3.5 h-3.5 fill-white animate-pulse" />
                  <span className="hidden md:inline">Enregistrer le direct</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>REC {formatTimer(recordingSeconds)}</span>
                  </div>

                  <button
                    onClick={() => stopRecording()}
                    disabled={autoUploadingReplay}
                    className="px-3.5 py-1.5 rounded-xl bg-turquoise hover:bg-turquoise/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/20 transition-all cursor-pointer disabled:opacity-50"
                    title="Arrêter et publier le replay"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>{autoUploadingReplay ? "Envoi..." : "Arrêter & Sauvegarder"}</span>
                  </button>
                </div>
              )}

              {/* Option téléchargement sur PC */}
              {!isRecording && (
                <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToLocalPc}
                      onChange={(e) => setSaveToLocalPc(e.target.checked)}
                      className="rounded accent-turquoise w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="hidden sm:inline">Télécharger sur PC</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Bouton Recharger le flux */}
          <button
            onClick={() => {
              setIframeLoaded(false);
              setIframeKey((k) => k + 1);
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Recharger le direct en cas d'écran noir"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Plein écran externe */}
          <button
            onClick={handleOpenExternal}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="w-3.5 h-3.5 text-orange" />
            <span className="hidden sm:inline">Plein écran</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {showLeaveButton && onLeave && (
            <button
              onClick={handleLeaveCall}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              {isTeacher ? "Terminer" : "Quitter"}
            </button>
          )}
        </div>
      </div>

      {/* Bannière explicative si l'utilisateur a annulé le sélecteur de partage */}
      {recordError && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-amber-200 text-xs animate-in fade-in">
          <span>{recordError}</span>
          <button
            onClick={() => setRecordError(null)}
            className="text-amber-200 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lecteur Iframe Natif Haute Performance & Stable */}
      <div className="flex-1 w-full min-h-[500px] aspect-video bg-[#182833] relative overflow-hidden">
        {/* Overlay de chargement rassurant pendant la négociation WebRTC */}
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#132029] text-white p-6 space-y-4 animate-in fade-in">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-turquoise/20 border-t-turquoise animate-spin" />
              <Video className="w-6 h-6 text-turquoise absolute" />
            </div>
            <div className="text-center space-y-1">
              <div className="font-black text-sm text-white">Connexion à la visioconférence...</div>
              <p className="text-xs text-white/50 max-w-xs leading-relaxed">
                Initialisation du flux caméra, micro et connexion au direct.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setIframeLoaded(false);
                  setIframeKey((k) => k + 1);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Recharger</span>
              </button>
              <button
                onClick={handleOpenExternal}
                className="px-3.5 py-2 rounded-xl bg-orange hover:bg-orange/90 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir en plein écran</span>
              </button>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={directRoomUrl}
          onLoad={() => setIframeLoaded(true)}
          allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; fullscreen *; screen-wake-lock *; encrypted-media *; speaker *; allow-top-navigation-by-user-activation; allow-same-origin; allow-scripts; allow-forms; allow-popups"
          allowFullScreen={true}
          className="w-full h-full border-0"
          title={title || "Visioconférence Jitsi"}
        />
      </div>
    </div>
  );
});

export default JitsiEmbed;
