import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfCoursClientView from "./ProfCoursClientView";
import { fetchTeacherMaterialsAction } from "./actions";
import { Profile, SubjectItem } from "@/lib/types";

export const metadata = {
  title: "Supports de Cours & Ressources | Mon École en Live",
  description: "Espace de publication des polycopiés, vidéos et liens pour les élèves.",
};

export default async function ProfCoursPage() {
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

  // Récupérer les matières assignées au professeur
  const subjectMap = new Map<string, SubjectItem>();

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
  const materialsRes = await fetchTeacherMaterialsAction();
  const initialMaterials = materialsRes.success ? materialsRes.data : [];

  return (
    <ProfCoursClientView
      teacher={profile as Profile}
      assignedSubjects={assignedSubjects}
      initialMaterials={initialMaterials}
    />
  );
}
