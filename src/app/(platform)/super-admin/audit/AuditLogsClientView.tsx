"use client";

import { useState } from "react";
import { ShieldAlert, User, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { AuditLog } from "@/lib/types";
import { getAuditLogsPageAction } from "./actions";

interface AuditLogsClientViewProps {
  initialLogs: AuditLog[];
  initialActorsMap: Record<string, string>;
  initialNextCursor: string | null;
}

export default function AuditLogsClientView({
  initialLogs,
  initialActorsMap,
  initialNextCursor,
}: AuditLogsClientViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [actorsMap, setActorsMap] = useState<Record<string, string>>(initialActorsMap);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    const res = await getAuditLogsPageAction(nextCursor, 20);
    if (res.success && res.data) {
      setLogs((prev) => [...prev, ...res.data]);
      setActorsMap((prev) => ({ ...prev, ...res.actorsMap }));
      setNextCursor(res.nextCursor);
    }
    setLoadingMore(false);
  };

  const filteredLogs = logs.filter((l) => {
    if (selectedActionFilter === "all") return true;
    return l.action === selectedActionFilter;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "user_created":
        return "bg-green-100 text-green-800 border-green-200";
      case "user_deleted":
        return "bg-red-100 text-red-800 border-red-200";
      case "password_reset":
        return "bg-orange/10 text-orange border-orange/20";
      default:
        return "bg-navy/5 text-navy border-navy/10";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Journal de Sécurité (Audit Trail)
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Logs d&apos;Audit &amp; Activités Sensibles
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Traçabilité complète des créations de comptes, réinitialisations de mots de passe et suppressions.
          </p>
        </div>

        <Link
          href="/super-admin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-navy/10 text-xs font-bold text-navy hover:bg-navy/5 transition-colors self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4 text-orange" />
          Retour au tableau de bord
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedActionFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedActionFilter === "all"
              ? "bg-navy text-white shadow-sm"
              : "bg-white text-navy/70 hover:bg-navy/5 border border-navy/10"
          }`}
        >
          Tous les événements ({logs.length})
        </button>
        <button
          onClick={() => setSelectedActionFilter("user_created")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedActionFilter === "user_created"
              ? "bg-green-600 text-white shadow-sm"
              : "bg-white text-navy/70 hover:bg-navy/5 border border-navy/10"
          }`}
        >
          Créations de comptes
        </button>
        <button
          onClick={() => setSelectedActionFilter("user_deleted")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedActionFilter === "user_deleted"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white text-navy/70 hover:bg-navy/5 border border-navy/10"
          }`}
        >
          Suppressions
        </button>
        <button
          onClick={() => setSelectedActionFilter("password_reset")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedActionFilter === "password_reset"
              ? "bg-orange text-white shadow-sm"
              : "bg-white text-navy/70 hover:bg-navy/5 border border-navy/10"
          }`}
        >
          Réinitialisations MDP
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-navy/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-vlight/60 border-b border-navy/5 text-[11px] font-black uppercase tracking-wider text-navy/50">
                <th className="py-4 px-6">Date &amp; Heure</th>
                <th className="py-4 px-6">Opérateur (Acteur)</th>
                <th className="py-4 px-6">Action Réalisée</th>
                <th className="py-4 px-6">Détails &amp; Cible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5 text-xs font-medium text-navy">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-navy/40 text-sm">
                    Aucun événement de sécurité enregistré pour cette sélection.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-vlight/30 transition-colors">
                    <td className="py-4 px-6 text-navy/50 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-bold text-navy">
                        <User className="w-3.5 h-3.5 text-navy/40" />
                        <span>{log.actor_id ? actorsMap[log.actor_id] || log.actor_id : "Système"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <code className="font-mono text-[11px] bg-blue-vlight px-2 py-1 rounded text-navy/70">
                        {JSON.stringify(log.details)}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bouton Charger Plus / Keyset Cursor Pagination */}
        {nextCursor && (
          <div className="p-4 border-t border-navy/5 bg-blue-vlight/30 flex items-center justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-navy hover:bg-navy/90 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement de l&apos;historique...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Charger les événements précédents</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
