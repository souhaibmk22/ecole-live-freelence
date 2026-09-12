import { createClient as createServerClient } from "@/lib/supabase/server";
import ClassesClientView from "./ClassesClientView";
import { Profile, Role, ClassItem, SubjectItem, EnrollmentItem } from "@/lib/types";

export default async function ClassesPage() {
  const supabase = await createServerClient();

  // 1. Récupérer toutes les classes
  const { data: classesData } = await supabase
    .from("classes")
    .select("*")
    .order("name", { ascending: true });

  // 2. Récupérer toutes les matières
  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("*")
    .order("name", { ascending: true });

  // 3. Récupérer les assignations professeurs
  const { data: teacherSubjectsData } = await supabase
    .from("teacher_subjects")
    .select("subject_id, teacher_id");

  // 4. Récupérer toutes les inscriptions
  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select("id, class_id, student_id, created_at");

  // 5. Récupérer les profils (profs & élèves)
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*");

  const profilesMap: Record<string, Profile> = {};
  const teachersList: Profile[] = [];
  const studentsList: Profile[] = [];

  (profilesData || []).forEach((p) => {
    const prof: Profile = {
      id: p.id,
      role: p.role as Role,
      first_name: p.first_name,
      last_name: p.last_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
    profilesMap[p.id] = prof;
    if (p.role === "prof") teachersList.push(prof);
    if (p.role === "etudiant") studentsList.push(prof);
  });

  const teacherBySubjectId: Record<string, Profile> = {};
  (teacherSubjectsData || []).forEach((ts) => {
    if (profilesMap[ts.teacher_id]) {
      teacherBySubjectId[ts.subject_id] = profilesMap[ts.teacher_id];
    }
  });

  // Mapper les matières avec les enseignants
  const subjects: SubjectItem[] = (subjectsData || []).map((s) => ({
    id: s.id,
    name: s.name,
    class_id: s.class_id,
    is_mandatory: s.is_mandatory,
    created_at: s.created_at,
    teacher: teacherBySubjectId[s.id] || null,
  }));

  // Mapper les inscriptions avec les élèves
  const enrollments: EnrollmentItem[] = (enrollmentsData || []).map((e) => ({
    id: e.id,
    class_id: e.class_id,
    student_id: e.student_id,
    created_at: e.created_at,
    student: profilesMap[e.student_id] || null,
  }));

  // Calculer les compteurs par classe
  const classes: ClassItem[] = (classesData || []).map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    cycle: c.cycle,
    created_at: c.created_at,
    subjects_count: subjects.filter((s) => s.class_id === c.id).length,
    students_count: enrollments.filter((e) => e.class_id === c.id).length,
  }));

  return (
    <ClassesClientView
      initialClasses={classes}
      initialSubjects={subjects}
      initialEnrollments={enrollments}
      availableTeachers={teachersList}
      availableStudents={studentsList}
    />
  );
}
