"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, Check, AlertCircle, FlipHorizontal } from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Prendre une photo de votre copie",
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Démarrer la caméra
  const startCamera = async (mode: "user" | "environment") => {
    setIsStarting(true);
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn("Camera access fallback:", err);
      // Fallback sans facingMode strict
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr: any) {
        setCameraError(
          "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur."
        );
      }
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Basculer caméra avant / arrière
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Prendre la photo
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);

    // Mettre la caméra en pause
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Reprendre la photo
  const retakeSnapshot = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Valider et convertir en fichier File optimisé & compressé
  const confirmSnapshot = async () => {
    if (!capturedImage) return;

    // Convertir dataURL en Blob puis en File
    const byteString = atob(capturedImage.split(",")[1]);
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    const fileName = `Photo_Copie_${Date.now()}.jpg`;
    const rawFile = new File([blob], fileName, { type: "image/jpeg" });

    onCapture(rawFile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy">{title}</h3>
              <p className="text-xs text-navy/50">Cadrage de votre feuille de travail</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-navy/40 hover:text-navy p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Vidéo ou Aperçu Photo */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-navy/10 shadow-inner">
          {cameraError ? (
            <div className="p-6 text-center text-white space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs text-white/80">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Photo capturée"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viseur de cadrage */}
              <div className="absolute inset-4 border-2 border-white/40 border-dashed rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider bg-black/40 px-2.5 py-1 rounded-md">
                  Cadrez bien le texte de votre copie
                </span>
              </div>
            </>
          )}

          {/* Bouton de bascule caméra avant/arrière */}
          {!capturedImage && !cameraError && (
            <button
              onClick={toggleFacingMode}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all cursor-pointer"
              title="Changer de caméra"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {capturedImage ? (
            <>
              <button
                onClick={retakeSnapshot}
                className="px-4 py-3 rounded-xl border border-navy/10 text-xs font-bold text-navy hover:bg-navy/5 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reprendre</span>
              </button>

              <button
                onClick={confirmSnapshot}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Utiliser cette photo</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
              >
                Annuler
              </button>

              <button
                onClick={takeSnapshot}
                disabled={isStarting || !!cameraError}
                className="flex-1 bg-orange hover:bg-orange/90 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-orange/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Prendre la photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
