import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfDevoirsClientView from "./ProfDevoirsClientView";
import { fetchTeacherAssignmentsAction } from "./actions";
import { Profile, SubjectItem } from "@/lib/types";

export const metadata = {
  title: "Devoirs & Corrections | Mon École en Live",
  description: "Espace de gestion des devoirs, notation et suivi des copies d'élèves.",
};

export default async function ProfDevoirsPage() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabaseAdmin = createAdminClient();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !["prof", "admin", "super_admin"].includes(profile.role)) {
    redirect("/login");
  }

  // Récupérer les matières assignées au professeur (via teacher_subjects et teacher_id)
  const subjectMap = new Map<string, SubjectItem>();

  // A. Via table de liaison teacher_subjects
  const { data: teacherSubjectsData } = await supabaseAdmin
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
    .eq("teacher_id", user.id);

  (teacherSubjectsData || []).forEach((item: any) => {
    if (item.subjects?.id) {
      subjectMap.set(item.subjects.id, {
        id: item.subjects.id,
        name: item.subjects.name,
        class_id: item.subjects.class_id,
        is_mandatory: item.subjects.is_mandatory,
        created_at: item.subjects.created_at,
        class_name: item.subjects.classes?.name || "Classe",
      });
    }
  });

  // B. Via colonne directe subjects.teacher_id
  const { data: directSubjects } = await supabaseAdmin
    .from("subjects")
    .select("*, classes(id, name, level, cycle)")
    .eq("teacher_id", user.id);

  (directSubjects || []).forEach((s: any) => {
    if (s.id && !subjectMap.has(s.id)) {
      subjectMap.set(s.id, {
        id: s.id,
        name: s.name,
        class_id: s.class_id,
        is_mandatory: s.is_mandatory,
        created_at: s.created_at,
        class_name: s.classes?.name || "Classe",
      });
    }
  });

  // C. Si Admin / Super Admin, récupérer toutes les matières de l'école
  if (["admin", "super_admin"].includes(profile.role) && subjectMap.size === 0) {
    const { data: allSubjects } = await supabaseAdmin
      .from("subjects")
      .select("*, classes(id, name, level, cycle)");

    (allSubjects || []).forEach((s: any) => {
      subjectMap.set(s.id, {
        id: s.id,
        name: s.name,
        class_id: s.class_id,
        is_mandatory: s.is_mandatory,
        created_at: s.created_at,
        class_name: s.classes?.name || "Classe",
      });
    });
  }

  const assignedSubjects = Array.from(subjectMap.values());

  // Récupérer les devoirs initiaux
  const assignmentsRes = await fetchTeacherAssignmentsAction();
  const initialAssignments = assignmentsRes.success ? assignmentsRes.data : [];

  return (
    <ProfDevoirsClientView
      teacher={profile as Profile}
      assignedSubjects={assignedSubjects}
      initialAssignments={initialAssignments}
    />
  );
}
