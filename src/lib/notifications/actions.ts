"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNotification, NotificationType } from "@/lib/types";

// Récupérer les notifications de l'utilisateur connecté
export async function fetchMyNotificationsAction(): Promise<{
  success: boolean;
  data: AppNotification[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, data: [], unreadCount: 0, error: "Non connecté." };
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      // Si la table n'a pas encore été créée, renvoyer une liste vide sans planter
      return { success: true, data: [], unreadCount: 0 };
    }

    const notifications: AppNotification[] = (data || []).map((n: any) => ({
      id: n.id,
      user_id: n.user_id,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      link_url: n.link_url,
      is_read: !!n.is_read,
      created_at: n.created_at,
    }));

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return { success: true, data: notifications, unreadCount };
  } catch (error: any) {
    return { success: false, data: [], unreadCount: 0, error: error?.message };
  }
}

// Marquer une notification comme lue
export async function markNotificationReadAction(notificationId: string) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}

// Tout marquer comme lu
export async function markAllNotificationsReadAction() {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}

// Créer une notification interne pour un ou plusieurs utilisateurs
export async function createBulkNotifications(
  userIds: string[],
  payload: {
    type: NotificationType;
    title: string;
    message: string;
    link_url?: string;
  }
) {
  try {
    if (!userIds || userIds.length === 0) return { success: true };
    const supabaseAdmin = createAdminClient();

    const rows = userIds.map((userId) => ({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link_url: payload.link_url || null,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) console.error("Error creating bulk notifications:", error);
    return { success: !error };
  } catch (err) {
    console.error("createBulkNotifications error:", err);
    return { success: false };
  }
}
