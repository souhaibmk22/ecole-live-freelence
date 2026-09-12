import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EtudiantDashboardClientView from "./EtudiantDashboardClientView";

export const metadata = {
  title: "Tableau de Bord Élève | Mon École en Live",
  description: "Espace apprenant et classe virtuelle.",
};

export default async function EtudiantDashboard() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // Récupérer l'inscription de l'élève
  const { data: enrollmentData } = await supabaseAdmin
    .from("enrollments")
    .select(`
      class_id,
      classes:class_id (
        id,
        name,
        level,
        cycle
      )
    `)
    .eq("student_id", user?.id || "")
    .maybeSingle();

  const studentClass = enrollmentData?.classes as any;

  // Récupérer les matières de sa classe si inscrit
  let classSubjects: any[] = [];
  let pendingAssignmentsCount = 0;
  let upcomingLiveCount = 0;

  if (studentClass?.id) {
    const { data: subjectsData } = await supabaseAdmin
      .from("subjects")
      .select(`
        id,
        name,
        is_mandatory,
        teacher_subjects (
          teacher_id,
          profiles:teacher_id (
            first_name,
            last_name
          )
        )
      `)
      .eq("class_id", studentClass.id)
      .order("name", { ascending: true });

    classSubjects = subjectsData || [];

    // Compter les devoirs en attente
    const subjectIds = classSubjects.map((s) => s.id);
    if (subjectIds.length > 0) {
      const { data: assignments } = await supabaseAdmin
        .from("assignments")
        .select("id")
        .in("subject_id", subjectIds);

      const { data: submissions } = await supabaseAdmin
        .from("submissions")
        .select("assignment_id, status")
        .eq("student_id", user?.id || "");

      const submittedMap = new Set((submissions || []).map((s) => s.assignment_id));
      pendingAssignmentsCount = (assignments || []).filter((a) => !submittedMap.has(a.id)).length;
    }
  }

  return (
    <EtudiantDashboardClientView
      studentClass={studentClass}
      classSubjects={classSubjects}
      pendingAssignmentsCount={pendingAssignmentsCount}
      upcomingLiveCount={upcomingLiveCount}
    />
  );
}
