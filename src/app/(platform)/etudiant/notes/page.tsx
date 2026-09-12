import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EtudiantNotesClientView from "./EtudiantNotesClientView";
import { fetchStudentGradesSummaryAction } from "./actions";
import { Profile } from "@/lib/types";

export const metadata = {
  title: "Mes Notes & Moyennes | Mon École en Live",
  description: "Consultez votre relevé de notes, moyennes par matière et appréciations.",
};

export default async function EtudiantNotesPage() {
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

  const res = await fetchStudentGradesSummaryAction();
  const report = res.data || {
    overallAverage: null,
    totalEvaluations: 0,
    highestGrade: null,
    lowestGrade: null,
    subjectsSummary: [],
  };

  return (
    <EtudiantNotesClientView
      student={profile as Profile}
      report={report}
    />
  );
}
