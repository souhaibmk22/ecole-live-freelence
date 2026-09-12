import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EtudiantDevoirsClientView from "./EtudiantDevoirsClientView";
import { fetchStudentAssignmentsAction } from "./actions";
import { Profile } from "@/lib/types";

export const metadata = {
  title: "Mes Devoirs & Évaluations | Mon École en Live",
  description: "Consultez vos devoirs et déposez vos travaux scolaires en ligne.",
};

export default async function EtudiantDevoirsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject } = await searchParams;
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

  if (!profile || profile.role !== "etudiant") {
    redirect("/login");
  }

  // Récupérer la classe et les matières de l'élève
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("class_id")
    .eq("student_id", user.id)
    .maybeSingle();

  let classSubjects: { id: string; name: string }[] = [];
  if (enrollment?.class_id) {
    const { data: subs } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("class_id", enrollment.class_id)
      .order("name");
    classSubjects = subs || [];
  }

  const res = await fetchStudentAssignmentsAction();

  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-navy/50">Chargement des devoirs...</div>}>
      <EtudiantDevoirsClientView
        student={profile as Profile}
        initialAssignments={res.data || []}
        hasClass={res.hasClass !== false}
        classSubjects={classSubjects}
        initialSubjectFilter={subject || "all"}
      />
    </Suspense>
  );
}
