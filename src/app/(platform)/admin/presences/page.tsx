import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PresencesClientView from "./PresencesClientView";
import { LiveSession } from "@/lib/types";

export default async function AdminPresencesPage() {
  const supabaseAdmin = createAdminClient();

  // 1. Récupérer toutes les sessions avec matières, classes, profs et présences détaillées
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
        : undefined,
      attendance: mergedAttendance,
    };
  });

  // 1. Récupérer toutes les classes, matières et enseignants enregistrés
  const [{ data: classesData }, { data: subjectsData }, { data: teachersData }] = await Promise.all([
    supabaseAdmin.from("classes").select("id, name, level, cycle").order("name"),
    supabaseAdmin.from("subjects").select("id, name").order("name"),
    supabaseAdmin.from("profiles").select("id, first_name, last_name").eq("role", "prof").order("first_name"),
  ]);

  return (
    <PresencesClientView
      initialSessions={sessions}
      allClasses={classesData || []}
      allSubjects={subjectsData || []}
      allTeachers={teachersData || []}
    />
  );
}
