"use client";

import {
  FileText,
  Image as ImageIcon,
  Play,
  File,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import { detectFileType } from "./UniversalDocumentViewerModal";

interface AttachmentActionCardProps {
  url: string;
  fileName?: string;
  label?: string; // e.g. "Sujet du devoir", "Copie de l'élève", "Corrigé officiel", "Document de cours"
  onView: (url: string, fileName?: string, title?: string) => void;
  compact?: boolean;
}

export default function AttachmentActionCard({
  url,
  fileName = "Document",
  label,
  onView,
  compact = false,
}: AttachmentActionCardProps) {
  if (!url) return null;

  const fileType = detectFileType(url, fileName);

  const getIcon = () => {
    switch (fileType) {
      case "image":
        return <ImageIcon className="w-4 h-4 text-orange" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "video":
        return <Play className="w-4 h-4 text-purple-600 fill-purple-600" />;
      case "doc":
        return <File className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-turquoise" />;
    }
  };

  const getTypeBadge = () => {
    switch (fileType) {
      case "image":
        return "IMAGE";
      case "pdf":
        return "PDF";
      case "video":
        return "VIDÉO";
      case "doc":
        return "DOC";
      default:
        return "FICHIER";
    }
  };

  if (compact) {
    return (
      <div className="bg-blue-vlight/40 border border-navy/5 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-white border border-navy/5 flex items-center justify-center shrink-0 shadow-2xs">
            {getIcon()}
          </div>
          <div className="min-w-0">
            {label && <span className="text-[10px] font-bold text-navy/50 block truncate">{label}</span>}
            <span className="font-bold text-navy truncate block">{fileName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onView(url, fileName, label)}
            className="p-1.5 px-2.5 bg-turquoise/15 hover:bg-turquoise text-teal-dark hover:text-white rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
            title="Consulter directement sur le site"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Voir</span>
          </button>
          <a
            href={url}
            download={fileName}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-navy/5 hover:bg-navy/10 text-navy rounded-xl transition-colors flex items-center justify-center cursor-pointer"
            title="Télécharger"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-vlight/40 via-white to-blue-vlight/30 border border-navy/10 rounded-2xl p-3 sm:p-3.5 space-y-2.5 transition-all hover:border-turquoise/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white border border-navy/10 flex items-center justify-center shrink-0 shadow-xs">
            {getIcon()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-navy/5 text-navy/70">
                {getTypeBadge()}
              </span>
              {label && (
                <span className="text-[10px] font-bold text-teal-dark truncate">
                  {label}
                </span>
              )}
            </div>
            <h5 className="font-bold text-navy text-xs truncate max-w-[210px] sm:max-w-xs mt-0.5">
              {fileName}
            </h5>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-navy/5">
        <button
          type="button"
          onClick={() => onView(url, fileName, label)}
          className="w-full py-2 px-3 rounded-xl bg-turquoise/15 hover:bg-turquoise text-teal-dark hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Voir en direct</span>
        </button>

        <a
          href={url}
          download={fileName}
          target="_blank"
          rel="noreferrer"
          className="w-full py-2 px-3 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-navy/60" />
          <span>Télécharger</span>
        </a>
      </div>
    </div>
  );
}
