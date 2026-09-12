import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "orange" | "turquoise" | "navy" | "purple";
  badge?: string;
}

const colorStyles = {
  orange: {
    bg: "bg-orange/10",
    text: "text-orange",
    border: "border-orange/20",
  },
  turquoise: {
    bg: "bg-turquoise/10",
    text: "text-turquoise",
    border: "border-turquoise/20",
  },
  navy: {
    bg: "bg-navy/10",
    text: "text-navy",
    border: "border-navy/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600",
    border: "border-purple-500/20",
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "navy",
  badge,
}: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <span className="text-xs font-bold text-navy/50 uppercase tracking-wider block truncate">
            {title}
          </span>
          <div className="text-3xl font-black text-navy mt-1 tracking-tight">
            {value}
          </div>
        </div>
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${styles.bg} ${styles.text} border ${styles.border} transition-transform group-hover:scale-105`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-navy/5">
        {subtitle && <p className="text-xs text-navy/60 font-medium">{subtitle}</p>}
        {badge && (
          <span className="text-[10px] font-black uppercase tracking-wider bg-navy/5 text-navy/70 px-2.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
