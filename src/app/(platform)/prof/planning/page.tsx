import { createClient as createServerClient } from "@/lib/supabase/server";
import ProfPlanningClientView from "./ProfPlanningClientView";
import { LiveSession, SubjectItem, Profile, Role } from "@/lib/types";
import { fetchUserMeetingsAction } from "@/app/(platform)/admin/planning/actions";

export default async function ProfPlanningPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 0. Récupérer les réunions institutionnelles pour ce professeur
  const meetingsRes = await fetchUserMeetingsAction();
  const initialMeetings = meetingsRes.success ? meetingsRes.data : [];

  // 1. Récupérer le profil du prof
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

  // 2. Récupérer les matières assignées à ce professeur
  const { data: teacherSubjectsData } = await supabase
    .from("teacher_subjects")
    .select(`
      subject_id,
      subjects:subject_id (
        id,
        name,
        class_id,
        is_mandatory,
        created_at,
        classes:class_id (
          id,
          name,
          level,
          cycle
        )
      )
    `)
    .eq("teacher_id", user?.id || "");

  const assignedSubjects: SubjectItem[] = (teacherSubjectsData || []).map((item: any) => ({
    id: item.subjects?.id,
    name: item.subjects?.name,
    class_id: item.subjects?.class_id,
    is_mandatory: item.subjects?.is_mandatory,
    created_at: item.subjects?.created_at,
    class_name: item.subjects?.classes?.name || "Classe",
  }));

  // 3. Récupérer les séances de cours de ce professeur
  const { data: sessionsData } = await supabase
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
      created_at,
      subjects:subject_id (
        id,
        name,
        classes:class_id (
          id,
          name
        )
      ),
      attendance (
        id,
        student_id,
        present,
        marked_at,
        profiles:student_id (
          id,
          first_name,
          last_name,
          role
        )
      )
    `)
    .eq("teacher_id", user?.id || "")
    .order("start_time", { ascending: false });

  const sessions: LiveSession[] = (sessionsData || []).map((s: any) => ({
    id: s.id,
    subject_id: s.subject_id,
    teacher_id: s.teacher_id,
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    room_name: s.room_name,
    status: s.status,
    created_at: s.created_at,
    subject: {
      id: s.subjects?.id,
      name: s.subjects?.name,
      class_id: "",
      is_mandatory: true,
      created_at: "",
      class_name: s.subjects?.classes?.name,
    },
    attendance: (s.attendance || []).map((a: any) => ({
      id: a.id,
      session_id: s.id,
      student_id: a.student_id,
      present: a.present,
      marked_at: a.marked_at,
      student: a.profiles,
    })),
  }));

  return (
    <ProfPlanningClientView
      teacher={teacherProfile}
      assignedSubjects={assignedSubjects}
      initialSessions={sessions}
      initialMeetings={initialMeetings}
    />
  );
}
