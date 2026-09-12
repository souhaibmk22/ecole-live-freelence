import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminPlanningClientView from "./AdminPlanningClientView";
import { LiveSession, ClassItem, Profile, SubjectItem } from "@/lib/types";
import { fetchAdminMeetingsAction } from "./actions";

export default async function AdminPlanningPage() {
  const supabaseServer = await createServerClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("id", user?.id || "")
    .single();

  // Récupérer les réunions institutionnelles
  const meetingsRes = await fetchAdminMeetingsAction();
  const initialMeetings = meetingsRes.success ? meetingsRes.data : [];

  // 1. Récupérer toutes les classes
  const { data: classesData } = await supabaseAdmin
    .from("classes")
    .select("id, name, level, cycle")
    .order("name", { ascending: true });

  const classes: ClassItem[] = (classesData || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    cycle: c.cycle,
    created_at: "",
  }));

  // 2. Récupérer tous les professeurs
  const { data: teachersData } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, role, email")
    .eq("role", "prof")
    .order("first_name", { ascending: true });

  const teachers: Profile[] = (teachersData || []).map((t: any) => ({
    id: t.id,
    first_name: t.first_name,
    last_name: t.last_name,
    email: t.email || "",
    role: t.role,
    is_temp_password: false,
    created_at: "",
    avatar_url: null,
    updated_at: "",
  }));

  // 3. Récupérer toutes les matières avec leurs classes et profs assignés
  const { data: subjectsData } = await supabaseAdmin
    .from("subjects")
    .select(`
      id,
      name,
      class_id,
      is_mandatory,
      classes:class_id (
        id,
        name
      ),
      teacher_subjects (
        teacher_id,
        profiles:teacher_id (
          id,
          first_name,
          last_name
        )
      )
    `)
    .order("name", { ascending: true });

  const subjects: SubjectItem[] = (subjectsData || []).map((s: any) => {
    const assignedTeacher = s.teacher_subjects?.[0]?.profiles;
    return {
      id: s.id,
      name: s.name,
      class_id: s.class_id,
      is_mandatory: s.is_mandatory,
      created_at: "",
      class_name: s.classes?.name,
      teacher_name: assignedTeacher
        ? `${assignedTeacher.first_name || ""} ${assignedTeacher.last_name || ""}`.trim()
        : undefined,
      teacher_id: s.teacher_subjects?.[0]?.teacher_id,
    };
  });

  // 4. Récupérer toutes les séances avec matières, classes, enrollments et présences
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

  const sessions: LiveSession[] = (sessionsData || []).map((s: any) => {
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
  });

  return (
    <AdminPlanningClientView
      admin={
        {
          ...(profile || {}),
          email: user?.email || "",
        } as Profile
      }
      initialSessions={sessions}
      initialMeetings={initialMeetings}
      classes={classes}
      allSubjects={subjects}
      allTeachers={teachers}
    />
  );
}
