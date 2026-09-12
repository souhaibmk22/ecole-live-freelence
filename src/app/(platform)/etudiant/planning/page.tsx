import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EtudiantPlanningClientView from "./EtudiantPlanningClientView";
import { LiveSession, Profile, Role } from "@/lib/types";

export default async function EtudiantPlanningPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // 1. Récupérer le profil élève
  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .single();

  const studentProfile: Profile = {
    id: user?.id || "",
    role: (profileData?.role as Role) || "etudiant",
    first_name: profileData?.first_name || null,
    last_name: profileData?.last_name || null,
    avatar_url: profileData?.avatar_url || null,
    created_at: profileData?.created_at || "",
    updated_at: profileData?.updated_at || "",
    email: user?.email,
  };

  // 2. Récupérer la classe de l'élève
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("class_id")
    .eq("student_id", user?.id || "")
    .maybeSingle();

  let sessions: LiveSession[] = [];

  if (enrollment?.class_id) {
    // Récupérer les matières de cette classe
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("class_id", enrollment.class_id);

    const subjectIds = (subjects || []).map((s) => s.id);

    if (subjectIds.length > 0) {
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

      sessions = (sessionsData || []).map((s: any) => ({
        id: s.id,
        subject_id: s.subject_id,
        teacher_id: s.teacher_id,
        title: s.title,
        start_time: s.start_time,
        end_time: s.end_time,
        room_name: s.room_name,
        status: s.status,
        replay_url: s.replay_url || null,
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
      }));
    }
  }

  return (
    <EtudiantPlanningClientView
      student={studentProfile}
      initialSessions={sessions}
      hasEnrolledClass={!!enrollment?.class_id}
    />
  );
}
