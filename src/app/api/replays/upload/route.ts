import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "Fichier vidéo ou identifiant de séance manquant." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // S'assurer que le bucket course-replays existe
    await supabaseAdmin.storage
      .createBucket("course-replays", { public: true })
      .catch(() => {});

    const fileExt = file.name.split(".").pop() || "webm";
    const cleanFileName = `replay_${sessionId}_${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("course-replays")
      .upload(cleanFileName, buffer, {
        contentType: file.type || "video/webm",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("course-replays")
      .getPublicUrl(cleanFileName);

    const replayUrl = publicUrlData.publicUrl;

    // 1. Tenter la mise à jour sur live_sessions
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("live_sessions")
      .update({
        replay_url: replayUrl,
        status: "ended",
      })
      .eq("id", sessionId)
      .select("id, title, subject:subjects(name, class_id)")
      .maybeSingle();

    if (updatedSession) {
      // Notifier les élèves de la classe
      try {
        const classId = (updatedSession?.subject as any)?.class_id;
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
              message: `Le replay du cours « ${updatedSession?.title || "Séance"} » (${(updatedSession?.subject as any)?.name || "Matière"}) est maintenant disponible dans votre espace.`,
              link_url: "/etudiant/planning",
              is_read: false,
            }));
            await supabaseAdmin.from("notifications").insert(notifRows);
          }
        }
      } catch (notifErr) {}
    } else {
      // 2. Si non trouvé dans live_sessions, mettre à jour admin_meetings
      await supabaseAdmin
        .from("admin_meetings")
        .update({
          replay_url: replayUrl,
          status: "ended",
          end_time: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    revalidatePath("/prof/planning");
    revalidatePath("/etudiant/planning");
    revalidatePath("/parent/planning");
    revalidatePath("/parent");
    revalidatePath("/admin/planning");
    revalidatePath("/admin/presences");
    revalidatePath("/prof");
    revalidatePath("/etudiant");

    return NextResponse.json({ success: true, replayUrl });
  } catch (error: any) {
    console.error("API upload replay error:", error);
    return NextResponse.json(
      { error: error?.message || "Une erreur est survenue lors de l'envoi." },
      { status: 500 }
    );
  }
}
