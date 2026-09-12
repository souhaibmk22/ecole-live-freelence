"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
  FileText,
  Play,
  Sparkles,
  ExternalLink,
  Eye,
  File,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
} from "lucide-react";

export interface DocumentViewerItem {
  url: string;
  type?: "image" | "video" | "pdf" | "audio" | "doc" | "other";
  title?: string;
  fileName?: string;
  subtitle?: string;
}

interface UniversalDocumentViewerModalProps {
  document: DocumentViewerItem | null;
  onClose: () => void;
}

export function detectFileType(url: string, fileName?: string): "image" | "video" | "pdf" | "audio" | "doc" | "other" {
  if (!url) return "other";
  const cleanUrl = url.toLowerCase();
  const cleanName = (fileName || "").toLowerCase();

  if (/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(cleanUrl) || /\.(jpe?g|png|webp|gif|svg)$/i.test(cleanName)) {
    return "image";
  }
  if (/\.pdf(\?.*)?$/i.test(cleanUrl) || /\.pdf$/i.test(cleanName)) {
    return "pdf";
  }
  if (/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(cleanUrl) || /\.(mp4|webm|mov|m4v|ogg)$/i.test(cleanName)) {
    return "video";
  }
  if (/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(cleanUrl) || /\.(mp3|wav|m4a|aac|ogg)$/i.test(cleanName)) {
    return "audio";
  }
  if (/\.(docx?|pptx?|xlsx?|txt|csv|odt|rtf)(\?.*)?$/i.test(cleanUrl) || /\.(docx?|pptx?|xlsx?|txt|csv|odt|rtf)$/i.test(cleanName)) {
    return "doc";
  }
  return "other";
}

export default function UniversalDocumentViewerModal({
  document: docItem,
  onClose,
}: UniversalDocumentViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docLoading, setDocLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fileType = docItem ? docItem.type || detectFileType(docItem.url, docItem.fileName) : "other";

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setDocLoading(true);
  }, [docItem?.url]);

  useEffect(() => {
    if (!docItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === "-") {
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === "0") {
        setZoom(1);
        setRotation(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [docItem, onClose]);

  if (!docItem) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!window.document.fullscreenElement) {
      modalRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      window.document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isImage = fileType === "image";
  const isVideo = fileType === "video";
  const isPdf = fileType === "pdf";
  const isAudio = fileType === "audio";
  const isDoc = fileType === "doc";

  const displayName = docItem.fileName || docItem.title || "Document";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[100] bg-navy/90 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 1. Barre Supérieure / Header Flottant */}
      <div className="w-full max-w-6xl flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-white z-20 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-turquoise/20 border border-turquoise/30 flex items-center justify-center text-turquoise shrink-0">
            {isImage && <ImageIcon className="w-5 h-5" />}
            {isPdf && <FileText className="w-5 h-5" />}
            {isVideo && <Play className="w-5 h-5 fill-turquoise" />}
            {isAudio && <Sparkles className="w-5 h-5" />}
            {isDoc && <File className="w-5 h-5" />}
            {!isImage && !isPdf && !isVideo && !isAudio && !isDoc && <FileText className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
              {displayName}
            </h4>
            {docItem.subtitle && (
              <p className="text-[10px] text-white/60 truncate">
                {docItem.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Boutons d'Action Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom pour les images */}
          {isImage && (
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                title="Zoom arrière (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-[11px] font-mono font-bold text-white/80 hover:text-white rounded-lg hover:bg-white/15"
                title="Réinitialiser la taille (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                title="Zoom avant (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer ml-1 border-l border-white/10 pl-2"
                title="Pivoter de 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Téléchargement Direct */}
          <a
            href={docItem.url}
            download={displayName}
            target="_blank"
            rel="noreferrer"
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-turquoise hover:bg-turquoise/90 text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-md shadow-turquoise/20 cursor-pointer"
            title="Télécharger le fichier sur votre appareil"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Télécharger</span>
          </a>

          {/* Plein Écran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors hidden sm:flex cursor-pointer"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-colors cursor-pointer"
            title="Fermer (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Zone Principale d'Affichage du Document */}
      <div
        className="w-full max-w-6xl flex-1 my-2 sm:my-3 flex items-center justify-center overflow-hidden relative rounded-2xl sm:rounded-3xl"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* A. IMAGE */}
        {isImage && (
          <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
            <img
              src={docItem.url}
              alt={displayName}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
              }}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl drop-shadow-2xl select-none cursor-zoom-in"
              onClick={(e) => {
                e.stopPropagation();
                if (zoom === 1) setZoom(1.75);
                else setZoom(1);
              }}
            />
          </div>
        )}

        {/* B. PDF */}
        {isPdf && (
          <div className="w-full h-[75vh] max-w-5xl bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 relative">
            <iframe
              src={`${docItem.url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full flex-1 border-0"
              title="Visionneuse PDF"
              onLoad={() => setDocLoading(false)}
            />
            {/* Barre d'action mobile si le PDF natif d'un smartphone a du mal */}
            <div className="sm:hidden p-2.5 bg-navy text-white text-[11px] flex items-center justify-between border-t border-white/10">
              <span className="truncate text-white/70">Aperçu PDF interactif</span>
              <a
                href={docItem.url}
                target="_blank"
                rel="noreferrer"
                className="text-turquoise font-bold flex items-center gap-1 shrink-0"
              >
                <span>Plein écran natif</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* C. VIDÉO */}
        {isVideo && (
          <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/10">
            <video
              ref={videoRef}
              src={docItem.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* D. AUDIO */}
        {isAudio && (
          <div className="w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl shadow-2xl text-center space-y-6 text-white">
            <div className="w-16 h-16 rounded-2xl bg-turquoise/20 text-turquoise mx-auto flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black">{displayName}</h3>
              <p className="text-xs text-white/60">Écoute directe en ligne</p>
            </div>
            <audio src={docItem.url} controls autoPlay className="w-full rounded-xl" />
          </div>
        )}

        {/* E. DOCUMENT OFFICE (Word, PPT, Excel, etc.) */}
        {isDoc && (
          <div className="w-full h-[75vh] max-w-5xl bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 relative">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(docItem.url)}&embedded=true`}
              className="w-full flex-1 border-0"
              title="Aperçu Document"
              onLoad={() => setDocLoading(false)}
            />
          </div>
        )}

        {/* F. AUTRE FICHIER */}
        {!isImage && !isPdf && !isVideo && !isAudio && !isDoc && (
          <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl shadow-2xl text-center space-y-6 text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/10 mx-auto flex items-center justify-center">
              <FileText className="w-8 h-8 text-turquoise" />
            </div>
            <div>
              <h3 className="text-lg font-black">{displayName}</h3>
              <p className="text-xs text-white/60">Format de fichier prêt au téléchargement</p>
            </div>
            <a
              href={docItem.url}
              download={displayName}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs shadow-lg shadow-turquoise/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Télécharger et ouvrir le fichier
            </a>
          </div>
        )}
      </div>

      {/* 3. Footer / Raccourcis et Actions Mobiles */}
      <div className="w-full max-w-6xl flex items-center justify-between text-white/70 text-[11px] px-3 py-1 flex-wrap gap-2">
        <div className="hidden sm:flex items-center gap-3">
          <span>💡 Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Échap</kbd> pour fermer</span>
          {isImage && <span>• Cliquez sur l&apos;image pour zoomer</span>}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <a
            href={docItem.url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-turquoise transition-colors flex items-center gap-1 font-bold text-xs text-white/90"
          >
            <span>Ouvrir dans un nouvel onglet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
