import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfCoursClientView from "../../prof/cours/ProfCoursClientView";
import { fetchTeacherMaterialsAction } from "../../prof/cours/actions";
import { Profile, SubjectItem } from "@/lib/types";

export const metadata = {
  title: "Supports & Cours Globaux | Mon École en Live",
  description: "Supervision et publication des supports de cours pour toutes les classes.",
};

export default async function AdminCoursPage() {
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

  // 1. Récupérer toutes les classes de l'établissement
  const { data: classesData } = await supabaseAdmin
    .from("classes")
    .select("id, name, level, cycle")
    .order("name", { ascending: true });

  const allClasses = (classesData || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  // 2. Pour l'admin : récupérer toutes les matières de toutes les classes
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

  const materialsRes = await fetchTeacherMaterialsAction();
  const initialMaterials = materialsRes.success ? materialsRes.data : [];

  return (
    <ProfCoursClientView
      teacher={profile as Profile}
      assignedSubjects={assignedSubjects}
      initialMaterials={initialMaterials}
      allClasses={allClasses}
    />
  );
}
