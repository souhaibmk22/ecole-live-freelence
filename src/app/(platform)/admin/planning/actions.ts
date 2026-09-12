"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { AdminMeeting, MeetingTargetAudience } from "@/lib/types";
import { createBulkNotifications } from "@/lib/notifications/actions";

export async function createLiveSessionByAdminAction(formData: {
  subjectId: string;
  teacherId: string;
  title: string;
  startTime: string;
  endTime: string;
}) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    // 1. Vérifier si l'utilisateur est admin ou super_admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return { success: false, error: "Action réservée aux administrateurs." };
    }

    // 2. Générer le nom de la salle propre et sécurisé (session-uuid)
    const roomName = `session-${crypto.randomUUID().toLowerCase()}`;

    // 3. Insérer la session
    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from("live_sessions")
      .insert({
        subject_id: formData.subjectId,
        teacher_id: formData.teacherId,
        title: formData.title.trim(),
        start_time: formData.startTime,
        end_time: formData.endTime,
        room_name: roomName,
        status: "scheduled",
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      return { success: false, error: sessionError?.message || "Erreur lors de la programmation de la séance." };
    }

    // 4. Initialiser la feuille d'émargement pour tous les élèves inscrits
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("class_id")
      .eq("id", formData.subjectId)
      .single();

    if (subject?.class_id) {
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("class_id", subject.class_id);

      if (enrollments && enrollments.length > 0) {
        const attendanceRows = enrollments.map((e) => ({
          session_id: newSession.id,
          student_id: e.student_id,
          present: false,
        }));

        await supabaseAdmin.from("attendance").insert(attendanceRows);
      }
    }

    revalidatePath("/admin/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");

    return { success: true, data: newSession };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// Fonction utilitaire pour extraire le chemin de fichier dans le bucket Storage
function extractStorageFileName(url: string, bucketName: string): string | null {
  if (!url) return null;
  const parts = url.split(`/${bucketName}/`);
  if (parts.length > 1) {
    return decodeURIComponent(parts[1].split("?")[0]);
  }
  return null;
}

// Supprimer définitivement une séance de cours ET son fichier vidéo dans Supabase Storage
export async function deleteLiveSessionAction(sessionId: string) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    // 1. Récupérer et supprimer le fichier vidéo physique de Supabase Storage pour libérer l'espace
    const { data: session } = await supabaseAdmin
      .from("live_sessions")
      .select("replay_url")
      .eq("id", sessionId)
      .single();

    if (session?.replay_url) {
      const fileName = extractStorageFileName(session.replay_url, "course-replays");
      if (fileName) {
        await supabaseAdmin.storage.from("course-replays").remove([fileName]);
      }
    }

    // 2. Supprimer les présences associées
    await supabaseAdmin.from("attendance").delete().eq("session_id", sessionId);

    // 3. Supprimer la séance
    const { error: delError } = await supabaseAdmin
      .from("live_sessions")
      .delete()
      .eq("id", sessionId);

    if (delError) {
      return { success: false, error: delError.message };
    }

    revalidatePath("/admin/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur lors de la suppression." };
  }
}

// Supprimer le replay d'une séance ET son fichier vidéo physique dans Supabase Storage (garder la séance)
export async function deleteReplayUrlAction(sessionId: string) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    // 1. Supprimer le fichier vidéo physique de Supabase Storage pour libérer l'espace
    const { data: session } = await supabaseAdmin
      .from("live_sessions")
      .select("replay_url")
      .eq("id", sessionId)
      .single();

    if (session?.replay_url) {
      const fileName = extractStorageFileName(session.replay_url, "course-replays");
      if (fileName) {
        await supabaseAdmin.storage.from("course-replays").remove([fileName]);
      }
    }

    // 2. Mettre à jour la base de données
    const { error } = await supabaseAdmin
      .from("live_sessions")
      .update({ replay_url: null })
      .eq("id", sessionId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur lors du retrait du replay." };
  }
}

// Récupération temps réel de TOUTES les sessions pour la supervision admin
export async function fetchAdminAllLiveSessionsAction() {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: sessionsData } = await supabaseAdmin
      .from("live_sessions")
      .select(`
        id,
        subject_id,
        teacher_id,
        title,
        start_time,
        end_time,
        room_name,
        status,
        replay_url,
        created_at,
        subjects:subject_id (
          id,
          name,
          classes:class_id (
            id,
            name,
            level,
            cycle,
            enrollments (
              student_id,
              profiles:student_id (
                id,
                first_name,
                last_name,
                email
              )
            )
          )
        ),
        profiles:teacher_id (
          id,
          first_name,
          last_name,
          email
        ),
        attendance (
          id,
          student_id,
          present,
          marked_at
        )
      `)
      .order("start_time", { ascending: false });

    return {
      success: true,
      data: (sessionsData || []).map((s: any) => {
        const enrolledStudents = s.subjects?.classes?.enrollments || [];
        const attendanceMap = new Map((s.attendance || []).map((a: any) => [a.student_id, a]));

        const mergedAttendance = enrolledStudents.map((enr: any) => {
          const att: any = attendanceMap.get(enr.student_id);
          return {
            id: att?.id || enr.student_id,
            session_id: s.id,
            student_id: enr.student_id,
            present: att?.present || false,
            marked_at: att?.marked_at || null,
            student: enr.profiles
              ? {
                  ...enr.profiles,
                  email: enr.profiles.email || "",
                }
              : null,
          };
        });

        return {
          id: s.id,
          subject_id: s.subject_id,
          teacher_id: s.teacher_id,
          title: s.title,
          start_time: s.start_time,
          end_time: s.end_time,
          room_name: s.room_name,
          status: s.status,
          replay_url: s.replay_url,
          created_at: s.created_at,
          subject: {
            id: s.subjects?.id,
            name: s.subjects?.name,
            class_id: s.subjects?.classes?.id || "",
            is_mandatory: true,
            created_at: "",
            class_name: s.subjects?.classes?.name,
          },
          teacher: s.profiles
            ? {
                ...s.profiles,
                email: s.profiles.email || "",
              }
            : null,
          attendance: mergedAttendance,
        };
      }),
    };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// ==============================================================================
// GESTION DES RÉUNIONS INSTITUTIONNELLES & VISIOCONFÉRENCES (PARENTS, PROFS, DIRECTION)
// ==============================================================================

// 1. Créer et programmer une réunion administrative
export async function createAdminMeetingAction(formData: {
  title: string;
  description?: string;
  targetAudience: MeetingTargetAudience;
  classId?: string;
  startTime: string;
  endTime?: string;
  customUserIds?: string[];
}) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin", "prof"].includes(profile.role)) {
      return { success: false, error: "Action non autorisée." };
    }

    // Salle JaaS dédiée propre (meeting-uuid)
    const roomName = `meeting-${crypto.randomUUID().toLowerCase()}`;

    const { data: newMeeting, error: meetingErr } = await supabaseAdmin
      .from("admin_meetings")
      .insert({
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        created_by: user.id,
        target_audience: formData.targetAudience,
        class_id: formData.classId || null,
        room_name: roomName,
        start_time: formData.startTime,
        end_time: formData.endTime || null,
        status: "scheduled",
      })
      .select()
      .single();

    if (meetingErr || !newMeeting) {
      return { success: false, error: meetingErr?.message || "Erreur lors de la création de la réunion." };
    }

    // Gestion des participants spécifiques si applicable
    if (formData.customUserIds && formData.customUserIds.length > 0) {
      const partRows = formData.customUserIds.map((uid) => ({
        meeting_id: newMeeting.id,
        user_id: uid,
      }));
      await supabaseAdmin.from("admin_meeting_participants").insert(partRows);
    }

    // Diffusion de notifications automatiques vers l'audience cible
    try {
      let recipientIds: string[] = [];

      if (formData.targetAudience === "all_parents") {
        const { data: parents } = await supabaseAdmin.from("profiles").select("id").eq("role", "parent");
        recipientIds = (parents || []).map((p) => p.id);
      } else if (formData.targetAudience === "class_parents" && formData.classId) {
        const { data: enrollments } = await supabaseAdmin.from("enrollments").select("student_id").eq("class_id", formData.classId);
        const sIds = (enrollments || []).map((e) => e.student_id);
        if (sIds.length > 0) {
          const { data: ps } = await supabaseAdmin.from("parent_students").select("parent_id").in("student_id", sIds);
          recipientIds = (ps || []).map((p) => p.parent_id);
        }
      } else if (formData.targetAudience === "all_teachers") {
        const { data: teachers } = await supabaseAdmin.from("profiles").select("id").eq("role", "prof");
        recipientIds = (teachers || []).map((t) => t.id);
      } else if (formData.targetAudience === "class_teachers" && formData.classId) {
        const { data: subs } = await supabaseAdmin.from("subjects").select("id").eq("class_id", formData.classId);
        const subIds = (subs || []).map((s) => s.id);
        if (subIds.length > 0) {
          const { data: ts } = await supabaseAdmin.from("teacher_subjects").select("teacher_id").in("subject_id", subIds);
          recipientIds = (ts || []).map((t) => t.teacher_id).filter(Boolean);
        }
      } else if (formData.customUserIds) {
        recipientIds = formData.customUserIds;
      }

      if (recipientIds.length > 0) {
        const isTeacherAudience = formData.targetAudience === "all_teachers" || formData.targetAudience === "class_teachers";
        const isDirectionAudience = formData.targetAudience === "direction_only";
        const targetLinkUrl = isTeacherAudience ? "/prof/planning" : isDirectionAudience ? "/admin/planning" : "/parent/planning";

        await createBulkNotifications(recipientIds, {
          type: "announcement",
          title: `🎥 Nouvelle Visioconférence : ${formData.title.trim()}`,
          message: `Vous êtes invité(e) à une réunion institutionnelle prévue le ${new Date(formData.startTime).toLocaleDateString("fr-FR")} à ${new Date(formData.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
          link_url: targetLinkUrl,
        });
      }
    } catch (notifErr) {
      console.warn("Notifications meeting warning:", notifErr);
    }

    revalidatePath("/admin/planning");
    revalidatePath("/parent/planning");
    revalidatePath("/parent");
    revalidatePath("/prof/planning");
    revalidatePath("/super-admin");

    return { success: true, data: newMeeting };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

// 2. Récupérer toutes les réunions (Vue Administrateur)
export async function fetchAdminMeetingsAction(): Promise<{
  success: boolean;
  data: AdminMeeting[];
  error?: string;
}> {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: meetings, error } = await supabaseAdmin
      .from("admin_meetings")
      .select(`
        *,
        creator:profiles!created_by(id, first_name, last_name, role, avatar_url),
        class:classes(id, name)
      `)
      .order("start_time", { ascending: false });

    if (error) {
      return { success: true, data: [] };
    }

    return { success: true, data: (meetings || []) as AdminMeeting[] };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message };
  }
}

// 3. Récupérer les réunions pertinentes pour l'utilisateur connecté (Parents, Profs, Direction)
export async function fetchUserMeetingsAction(): Promise<{
  success: boolean;
  data: AdminMeeting[];
  error?: string;
}> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: true, data: [] };

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) return { success: true, data: [] };

    // A. Si Direction : voit toutes les réunions
    if (["admin", "super_admin"].includes(profile.role)) {
      return fetchAdminMeetingsAction();
    }

    // B. Récupérer les classes associées à l'utilisateur
    let userClassIds: string[] = [];

    if (profile.role === "parent") {
      const { data: ps } = await supabaseAdmin.from("parent_students").select("student_id").eq("parent_id", user.id);
      const studentIds = (ps || []).map((p) => p.student_id);
      if (studentIds.length > 0) {
        const { data: enr } = await supabaseAdmin.from("enrollments").select("class_id").in("student_id", studentIds);
        userClassIds = (enr || []).map((e) => e.class_id).filter(Boolean);
      }
    } else if (profile.role === "prof") {
      const { data: ts } = await supabaseAdmin.from("teacher_subjects").select("subject:subjects(class_id)").eq("teacher_id", user.id);
      userClassIds = (ts || []).map((t: any) => t.subject?.class_id).filter(Boolean);
    }

    // C. Récupérer les invitations personnalisées
    const { data: customInvites } = await supabaseAdmin
      .from("admin_meeting_participants")
      .select("meeting_id")
      .eq("user_id", user.id);
    const customMeetingIds = (customInvites || []).map((ci) => ci.meeting_id);

    // D. Récupérer les réunions
    const { data: allMeetings, error } = await supabaseAdmin
      .from("admin_meetings")
      .select(`
        *,
        creator:profiles!created_by(id, first_name, last_name, role, avatar_url),
        class:classes(id, name)
      `)
      .order("start_time", { ascending: false });

    if (error || !allMeetings) return { success: true, data: [] };

    const filtered = allMeetings.filter((m: any) => {
      // Invitation directe
      if (customMeetingIds.includes(m.id)) return true;

      // Parents
      if (profile.role === "parent") {
        if (m.target_audience === "all_parents") return true;
        if (m.target_audience === "class_parents" && m.class_id && userClassIds.includes(m.class_id)) return true;
        return false;
      }

      // Professeurs
      if (profile.role === "prof") {
        if (m.target_audience === "all_teachers") return true;
        if (m.target_audience === "class_teachers" && m.class_id && userClassIds.includes(m.class_id)) return true;
        return false;
      }

      return false;
    });

    return { success: true, data: filtered as AdminMeeting[] };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message };
  }
}

// 4. Mettre à jour le statut d'une réunion (Lancer en direct / Clôturer)
export async function updateAdminMeetingStatusAction(
  meetingId: string,
  status: "scheduled" | "live" | "ended"
) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("admin_meetings")
      .update({
        status,
        ...(status === "ended" ? { end_time: new Date().toISOString() } : {}),
      })
      .eq("id", meetingId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/planning");
    revalidatePath("/parent/planning");
    revalidatePath("/parent");
    revalidatePath("/prof/planning");
    revalidatePath("/super-admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

// 5. Supprimer une réunion
export async function deleteAdminMeetingAction(meetingId: string) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("admin_meetings")
      .delete()
      .eq("id", meetingId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/planning");
    revalidatePath("/parent/planning");
    revalidatePath("/parent");
    revalidatePath("/prof/planning");
    revalidatePath("/super-admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

// 6. Mettre à jour manuellement le replay d'une réunion
export async function updateMeetingReplayUrlAction(
  meetingId: string,
  replayUrl: string
) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();
    const cleanUrl = replayUrl.trim();

    const { error } = await supabaseAdmin
      .from("admin_meetings")
      .update({
        replay_url: cleanUrl || null,
        status: cleanUrl ? "ended" : undefined,
      })
      .eq("id", meetingId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/planning");
    revalidatePath("/parent/planning");
    revalidatePath("/parent");
    revalidatePath("/prof/planning");
    revalidatePath("/super-admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}
