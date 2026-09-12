import { createClient as createServerClient } from "@/lib/supabase/server";
import { fetchUserMeetingsAction } from "@/app/(platform)/admin/planning/actions";
import ProfDashboardClientView from "./ProfDashboardClientView";
import { Profile, Role } from "@/lib/types";

export default async function ProfDashboard() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Profil du professeur
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .single();

  const teacherProfile: Profile = {
    id: user?.id || "",
    role: (profileData?.role as Role) || "prof",
    first_name: profileData?.first_name || null,
    last_name: profileData?.last_name || null,
    avatar_url: profileData?.avatar_url || null,
    created_at: profileData?.created_at || "",
    updated_at: profileData?.updated_at || "",
    email: user?.email,
  };

  // 2. Réunions institutionnelles pour ce professeur
  const meetingsRes = await fetchUserMeetingsAction();
  const initialMeetings = meetingsRes.success ? meetingsRes.data : [];

  // 3. Récupérer les matières assignées à ce professeur
  const { data: assignedSubjectsData } = await supabase
    .from("teacher_subjects")
    .select(`
      subject_id,
      subjects:subject_id (
        id,
        name,
        is_mandatory,
        classes:class_id (
          id,
          name,
          level,
          cycle
        )
      )
    `)
    .eq("teacher_id", user?.id || "");

  // 4. Nombre de cours en direct planifiés
  const { count: directsCount } = await supabase
    .from("live_sessions")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user?.id || "")
    .in("status", ["scheduled", "live"]);

  // 5. Nombre de devoirs
  const subIds = (assignedSubjectsData || []).map((item: any) => item.subject_id).filter(Boolean);
  let devoirsCount = 0;
  if (subIds.length > 0) {
    const { count } = await supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .in("subject_id", subIds);
    devoirsCount = count || 0;
  }

  return (
    <ProfDashboardClientView
      teacher={teacherProfile}
      assignedSubjects={assignedSubjectsData || []}
      initialMeetings={initialMeetings}
      directsCount={directsCount || 0}
      devoirsCount={devoirsCount}
    />
  );
}
