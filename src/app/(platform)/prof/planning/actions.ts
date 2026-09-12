"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createLiveSessionAction(formData: {
  subjectId: string;
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

    // 1. Génération d'un nom de salle unique, propre et sécurisé (session-uuid)
    const roomName = `session-${crypto.randomUUID().toLowerCase()}`;

    // 2. Insérer la séance dans live_sessions
    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from("live_sessions")
      .insert({
        subject_id: formData.subjectId,
        teacher_id: user.id,
        title: formData.title.trim(),
        start_time: formData.startTime,
        end_time: formData.endTime,
        room_name: roomName,
        status: "scheduled",
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      return { success: false, error: sessionError?.message || "Erreur création séance." };
    }

    // 3. Récupérer la classe de cette matière pour initialiser l'émargement des élèves
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

    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");
    revalidatePath("/prof");
    revalidatePath("/etudiant");

    return { success: true, data: newSession };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function updateSessionStatusAction(sessionId: string, status: "scheduled" | "live" | "ended") {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("live_sessions")
      .update({ status })
      .eq("id", sessionId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// Enregistrer la feuille d'émargement manuellement par le professeur
export async function saveAttendanceAction(formData: {
  sessionId: string;
  attendanceList: { studentId: string; present: boolean }[];
}) {
  try {
    const supabaseAdmin = createAdminClient();

    for (const item of formData.attendanceList) {
      const { data: existing } = await supabaseAdmin
        .from("attendance")
        .select("id")
        .eq("session_id", formData.sessionId)
        .eq("student_id", item.studentId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("attendance")
          .update({
            present: item.present,
            marked_at: item.present ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("attendance").insert({
          session_id: formData.sessionId,
          student_id: item.studentId,
          present: item.present,
          marked_at: item.present ? new Date().toISOString() : null,
        });
      }
    }

    revalidatePath("/prof/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/admin/planning");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// Inscription automatique de présence lorsqu'un élève rejoint le live
export async function markStudentAutoPresentAction(sessionId: string) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false };

    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id")
      .eq("session_id", sessionId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("attendance")
        .update({
          present: true,
          marked_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("attendance").insert({
        session_id: sessionId,
        student_id: user.id,
        present: true,
        marked_at: new Date().toISOString(),
      });
    }

    revalidatePath("/prof/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/admin/planning");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// Récupération en direct de l'état d'émargement pour le prof (avec tous les élèves de la classe)
export async function fetchLiveAttendanceAction(sessionId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Récupérer la séance et la classe associée
    const { data: session } = await supabaseAdmin
      .from("live_sessions")
      .select(`
        subject_id,
        subjects:subject_id (
          class_id
        )
      `)
      .eq("id", sessionId)
      .single();

    const classId = (session?.subjects as any)?.class_id;

    // 2. Récupérer tous les élèves inscrits dans cette classe
    let enrolledStudents: any[] = [];
    if (classId) {
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select(`
          student_id,
          profiles:student_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq("class_id", classId);

      enrolledStudents = enrollments || [];
    }

    // 3. Récupérer les présences enregistrées
    const { data: attendanceData } = await supabaseAdmin
      .from("attendance")
      .select("student_id, present, marked_at")
      .eq("session_id", sessionId);

    const attendanceMap: Record<string, boolean> = {};
    (attendanceData || []).forEach((a) => {
      attendanceMap[a.student_id] = a.present;
    });

    const result = enrolledStudents.map((e) => ({
      student_id: e.student_id,
      student: e.profiles,
      present: !!attendanceMap[e.student_id],
    }));

    return { success: true, data: result };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// Obtenir une URL signée sécurisée pour téléverser directement depuis le navigateur vers Supabase Storage (Bypasse la limite de 4.5MB Vercel)
export async function getReplayUploadUrlAction(sessionId: string, fileExt: string = "webm") {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié." };

    const supabaseAdmin = createAdminClient();

    // S'assurer que le bucket course-replays existe et est public
    await supabaseAdmin.storage
      .createBucket("course-replays", { public: true })
      .catch(() => {});

    const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "") || "webm";
    const fileName = `replay_${sessionId}_${Date.now()}.${cleanExt}`;

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("course-replays")
      .createSignedUploadUrl(fileName);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("course-replays")
      .getPublicUrl(fileName);

    return {
      success: true,
      fileName,
      path: signedData?.path || fileName,
      token: signedData?.token || null,
      signedUrl: signedData?.signedUrl || null,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur de préparation du téléversement." };
  }
}

// Associer un enregistrement / replay vidéo à une séance ou réunion
export async function attachReplayUrlAction(formData: {
  sessionId: string;
  replayUrl: string;
}) {
  try {
    const supabaseAdmin = createAdminClient();
    const cleanUrl = formData.replayUrl.trim();

    // 1. Tenter la mise à jour sur live_sessions
    const { data: sessionData } = await supabaseAdmin
      .from("live_sessions")
      .update({
        replay_url: cleanUrl,
        status: "ended",
      })
      .eq("id", formData.sessionId)
      .select("id, title, subject:subjects(name, class_id)")
      .maybeSingle();

    if (sessionData) {
      // Notifier les élèves de la classe que le replay est disponible
      try {
        const classId = (sessionData?.subject as any)?.class_id;
        if (classId) {
          const { data: enrollments } = await supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId);

          if (enrollments && enrollments.length > 0) {
            const notifRows = enrollments.map((e: any) => ({
              user_id: e.student_id,
              type: "live",
              title: "🎬 Nouveau Replay Vidéo Disponible",
              message: `Le replay du cours « ${sessionData?.title || "Séance"} » (${(sessionData?.subject as any)?.name || "Matière"}) est disponible dans votre espace.`,
              link_url: "/etudiant/planning",
              is_read: false,
            }));
            await supabaseAdmin.from("notifications").insert(notifRows);
          }
        }
      } catch (notifErr) {}
    } else {
      // 2. Si ce n'est pas une live_session, tenter la mise à jour sur admin_meetings
      await supabaseAdmin
        .from("admin_meetings")
        .update({
          replay_url: cleanUrl,
          status: "ended",
          end_time: new Date().toISOString(),
        })
        .eq("id", formData.sessionId);
    }

    revalidatePath("/admin/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");
    revalidatePath("/parent/planning");
    revalidatePath("/parent");
    revalidatePath("/prof");
    revalidatePath("/etudiant");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// Téléverser un fichier vidéo d'enregistrement vers Supabase Storage
export async function uploadReplayFileAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;

    if (!file || !sessionId) {
      return { success: false, error: "Fichier vidéo ou séance manquant." };
    }

    const supabaseAdmin = createAdminClient();

    const fileExt = file.name.split(".").pop() || "webm";
    const fileName = `replay_${sessionId}_${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("course-replays")
      .upload(fileName, buffer, {
        contentType: file.type || "video/webm",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("course-replays")
      .getPublicUrl(fileName);

    const replayUrl = publicUrlData.publicUrl;

    await supabaseAdmin
      .from("live_sessions")
      .update({
        replay_url: replayUrl,
        status: "ended",
      })
      .eq("id", sessionId);

    // Notifier les élèves de la classe que le replay est disponible
    try {
      const { data: sessionInfo } = await supabaseAdmin
        .from("live_sessions")
        .select("title, subject:subjects(name, class_id)")
        .eq("id", sessionId)
        .single();

      const classId = (sessionInfo?.subject as any)?.class_id;
      if (classId) {
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("student_id")
          .eq("class_id", classId);

        if (enrollments && enrollments.length > 0) {
          const notifRows = enrollments.map((e: any) => ({
            user_id: e.student_id,
            type: "live",
            title: "🎬 Nouveau Replay Vidéo Disponible",
            message: `Le replay vidéo « ${sessionInfo?.title || "Séance"} » (${(sessionInfo?.subject as any)?.name || "Matière"}) est disponible dans votre espace.`,
            link_url: "/etudiant/planning",
            is_read: false,
          }));
          await supabaseAdmin.from("app_notifications").insert(notifRows);
        }
      }
    } catch (notifErr) {}

    revalidatePath("/admin/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");
    revalidatePath("/prof");
    revalidatePath("/etudiant");

    return { success: true, replayUrl };
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur lors du téléversement du replay." };
  }
}

// Récupération temps réel des sessions pour l'élève (sans reload manuel)
export async function fetchStudentLiveSessionsAction() {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, data: [] };

    const supabaseAdmin = createAdminClient();

    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("class_id")
      .eq("student_id", user.id)
      .maybeSingle();

    if (!enrollment?.class_id) return { success: true, data: [] };

    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("class_id", enrollment.class_id);

    const subjectIds = (subjects || []).map((s) => s.id);
    if (subjectIds.length === 0) return { success: true, data: [] };

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
            name
          )
        ),
        profiles:teacher_id (
          id,
          first_name,
          last_name
        )
      `)
      .in("subject_id", subjectIds)
      .order("start_time", { ascending: false });

    return {
      success: true,
      data: (sessionsData || []).map((s: any) => ({
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
          class_id: "",
          is_mandatory: true,
          created_at: "",
          class_name: s.subjects?.classes?.name,
        },
        teacher: s.profiles,
      })),
    };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// Récupération temps réel des sessions pour le professeur (quand planifié par l'admin ou mis à jour)
export async function fetchTeacherLiveSessionsAction() {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) return { success: false, data: [] };

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
            name
          )
        )
      `)
      .eq("teacher_id", user.id)
      .order("start_time", { ascending: false });

    return {
      success: true,
      data: (sessionsData || []).map((s: any) => ({
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
          class_id: "",
          is_mandatory: true,
          created_at: "",
          class_name: s.subjects?.classes?.name,
        },
      })),
    };
  } catch (error) {
    return { success: false, data: [] };
  }
}
