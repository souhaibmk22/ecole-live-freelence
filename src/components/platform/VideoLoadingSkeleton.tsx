import React from "react";
import { Video } from "lucide-react";

export default function VideoLoadingSkeleton({ title = "Chargement de la visioconférence..." }: { title?: string }) {
  return (
    <div className="w-full aspect-video min-h-[420px] rounded-3xl bg-[#132029] border border-white/5 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden animate-pulse shadow-xl">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full border-4 border-turquoise/20 border-t-turquoise animate-spin" />
        <Video className="w-7 h-7 text-turquoise absolute" />
      </div>
      <div className="text-center space-y-1 z-10">
        <div className="font-black text-sm text-white tracking-wide">{title}</div>
        <p className="text-xs text-white/50 max-w-xs">
          Préparation sécurisée du flux WebRTC et des périphériques...
        </p>
      </div>
    </div>
  );
}
