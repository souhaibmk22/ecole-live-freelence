"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vérifier l'authentification de l'élève
async function verifyStudentAuth() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    throw new Error("Non authentifié.");
  }

  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "etudiant") {
    throw new Error("Accès réservé aux élèves.");
  }

  return { currentUser: profile, studentId: user.id };
}

export interface SubjectGradeSummary {
  subjectId: string;
  subjectName: string;
  average: number;
  evaluationsCount: number;
  grades: {
    assignmentId: string;
    title: string;
    grade: number;
    maxPoints: number;
    gradedAt: string;
    feedback: string | null;
    teacherName: string;
  }[];
}

export interface StudentGradesReport {
  overallAverage: number | null;
  totalEvaluations: number;
  highestGrade: number | null;
  lowestGrade: number | null;
  subjectsSummary: SubjectGradeSummary[];
}

export async function fetchStudentGradesSummaryAction(): Promise<{
  success: boolean;
  error?: string;
  data?: StudentGradesReport;
}> {
  try {
    const { studentId } = await verifyStudentAuth();
    const supabaseAdmin = createAdminClient();

    // Récupérer toutes les soumissions notées de l'élève
    const { data: gradedSubmissions, error } = await supabaseAdmin
      .from("submissions")
      .select(`
        id,
        grade,
        feedback,
        graded_at,
        assignment:assignments(
          id,
          title,
          max_points,
          subject:subjects(id, name),
          teacher:profiles(id, first_name, last_name)
        )
      `)
      .eq("student_id", studentId)
      .not("grade", "is", null)
      .order("graded_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!gradedSubmissions || gradedSubmissions.length === 0) {
      return {
        success: true,
        data: {
          overallAverage: null,
          totalEvaluations: 0,
          highestGrade: null,
          lowestGrade: null,
          subjectsSummary: [],
        },
      };
    }

    // Regrouper par matière
    const subjectMap: Record<string, SubjectGradeSummary> = {};
    let totalScoreSum = 0;
    let totalMaxSum = 0;
    let highest: number | null = null;
    let lowest: number | null = null;

    for (const sub of (gradedSubmissions as any[])) {
      const assign = sub.assignment;
      if (!assign) continue;

      const subject = assign.subject;
      const subId = subject?.id || "unknown";
      const subName = subject?.name || "Matière Générale";
      const maxPts = assign.max_points || 20;
      const gradeOn20 = (sub.grade / maxPts) * 20;

      totalScoreSum += gradeOn20;
      totalMaxSum += 20;

      if (highest === null || gradeOn20 > highest) highest = gradeOn20;
      if (lowest === null || gradeOn20 < lowest) lowest = gradeOn20;

      if (!subjectMap[subId]) {
        subjectMap[subId] = {
          subjectId: subId,
          subjectName: subName,
          average: 0,
          evaluationsCount: 0,
          grades: [],
        };
      }

      const teacher = assign.teacher;
      const teacherName = teacher
        ? `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim()
        : "Professeur";

      subjectMap[subId].grades.push({
        assignmentId: assign.id,
        title: assign.title,
        grade: sub.grade,
        maxPoints: maxPts,
        gradedAt: sub.graded_at,
        feedback: sub.feedback,
        teacherName,
      });
    }

    // Calcul des moyennes par matière
    const subjectsSummary = Object.values(subjectMap).map((item) => {
      const sum = item.grades.reduce((acc, g) => acc + (g.grade / g.maxPoints) * 20, 0);
      const avg = item.grades.length > 0 ? Number((sum / item.grades.length).toFixed(2)) : 0;
      return {
        ...item,
        average: avg,
        evaluationsCount: item.grades.length,
      };
    });

    const overallAverage =
      gradedSubmissions.length > 0
        ? Number((totalScoreSum / gradedSubmissions.length).toFixed(2))
        : null;

    return {
      success: true,
      data: {
        overallAverage,
        totalEvaluations: gradedSubmissions.length,
        highestGrade: typeof highest === "number" ? Number(highest.toFixed(2)) : null,
        lowestGrade: typeof lowest === "number" ? Number(lowest.toFixed(2)) : null,
        subjectsSummary,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}
