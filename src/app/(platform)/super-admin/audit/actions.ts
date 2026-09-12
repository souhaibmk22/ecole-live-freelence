"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { AuditLog } from "@/lib/types";

export async function getAuditLogsPageAction(cursor: string | null = null, limit: number = 20) {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("audit_logs")
      .select(`
        id,
        actor_id,
        action,
        target_resource,
        details,
        ip_address,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: logsData, error } = await query;
    if (error) throw error;

    const actorIds = Array.from(
      new Set((logsData || []).map((l) => l.actor_id).filter(Boolean))
    ) as string[];

    let actorsMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .in("id", actorIds);

      (profiles || []).forEach((p) => {
        actorsMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.id;
      });
    }

    const logs: AuditLog[] = (logsData || []).map((l) => ({
      id: l.id,
      actor_id: l.actor_id,
      action: l.action,
      target_resource: l.target_resource,
      details: l.details || {},
      ip_address: l.ip_address,
      created_at: l.created_at,
    }));

    const nextCursor = logs.length === limit ? logs[logs.length - 1].created_at : null;

    return {
      success: true,
      data: logs,
      actorsMap,
      nextCursor,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erreur lors de la récupération des logs d'audit.",
      data: [],
      actorsMap: {},
      nextCursor: null,
    };
  }
}
