import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfDevoirsClientView from "../../prof/devoirs/ProfDevoirsClientView";
import { fetchTeacherAssignmentsAction } from "../../prof/devoirs/actions";
import { Profile, SubjectItem } from "@/lib/types";

export const metadata = {
  title: "Devoirs & Évaluations Globaux | Mon École en Live",
  description: "Supervision de tous les devoirs et copies des élèves de l'école.",
};

export default async function AdminDevoirsPage() {
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

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/login");
  }

  // 1. Récupérer toutes les classes de l'école
  const { data: classesData } = await supabaseAdmin
    .from("classes")
    .select("id, name, level, cycle")
    .order("name", { ascending: true });

  const allClasses = (classesData || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  // 2. Pour l'admin : récupérer toutes les matières de l'école
  const { data: allSubjects } = await supabaseAdmin
    .from("subjects")
    .select("*, classes(id, name, level, cycle)")
    .order("name", { ascending: true });

  const assignedSubjects: SubjectItem[] = (allSubjects || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    class_id: s.class_id,
    is_mandatory: s.is_mandatory,
    created_at: s.created_at,
    class_name: s.classes?.name || "Classe",
  }));

  const assignmentsRes = await fetchTeacherAssignmentsAction();
  const initialAssignments = assignmentsRes.success ? assignmentsRes.data : [];

  return (
    <ProfDevoirsClientView
      teacher={profile as Profile}
      assignedSubjects={assignedSubjects}
      initialAssignments={initialAssignments}
      allClasses={allClasses}
    />
  );
}
