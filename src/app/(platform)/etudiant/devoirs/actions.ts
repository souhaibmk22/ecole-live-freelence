"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Assignment, Submission } from "@/lib/types";

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

// 1. Récupérer tous les devoirs de la classe de l'élève avec son statut de rendu
export async function fetchStudentAssignmentsAction() {
  try {
    const { studentId } = await verifyStudentAuth();
    const supabaseAdmin = createAdminClient();

    // A. Récupérer la classe de l'élève
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("class_id, classes(id, name, level, cycle)")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!enrollment?.class_id) {
      return { success: true, hasClass: false, data: [] };
    }

    // B. Récupérer toutes les matières de cette classe
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("class_id", enrollment.class_id)
      .order("name", { ascending: true });

    if (!subjects || subjects.length === 0) {
      return { success: true, hasClass: true, data: [], subjects: [] };
    }

    const subjectIds = subjects.map((s) => s.id);

    // C. Récupérer tous les devoirs pour ces matières
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        subject:subjects(id, name, class_id),
        teacher:profiles(id, first_name, last_name)
      `)
      .in("subject_id", subjectIds)
      .order("due_date", { ascending: true });

    if (assignError) {
      return { success: false, error: assignError.message, data: [] };
    }

    // D. Récupérer les soumissions de cet élève
    const { data: submissions } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("student_id", studentId);

    const submissionMap = new Map((submissions || []).map((s) => [s.assignment_id, s]));

    // E. Assemblage
    const result = (assignments || []).map((a: any) => {
      const mySub = submissionMap.get(a.id);
      return {
        ...a,
        max_points: a.max_points || 20,
        class_name: (enrollment.classes as any)?.name || "Ma Classe",
        solution_published: !!a.solution_published,
        solution_url: a.solution_published ? a.solution_url : null,
        solution_name: a.solution_published ? a.solution_name : null,
        solution_text: a.solution_published ? a.solution_text : null,
        mySubmission: mySub
          ? {
              id: mySub.id,
              assignment_id: mySub.assignment_id,
              student_id: mySub.student_id,
              file_url: mySub.file_url,
              file_name: mySub.file_name,
              file_size: mySub.file_size,
              student_comment: mySub.student_comment,
              submitted_at: mySub.submitted_at,
              grade: mySub.grade,
              feedback: mySub.feedback,
              graded_at: mySub.graded_at,
              status: mySub.status,
            }
          : null,
      };
    });

    return { success: true, hasClass: true, data: result, subjects: subjects || [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue.", data: [], subjects: [] };
  }
}

// 2. Déposer ou modifier sa copie pour un devoir
export async function submitAssignmentAction(formData: {
  assignmentId: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  studentComment?: string;
}) {
  try {
    const { studentId } = await verifyStudentAuth();
    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
      .from("submissions")
      .select("id, status")
      .eq("assignment_id", formData.assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existing) {
      // Mettre à jour si pas encore noté
      const { error } = await supabaseAdmin
        .from("submissions")
        .update({
          file_url: formData.fileUrl,
          file_name: formData.fileName,
          file_size: formData.fileSize || 0,
          student_comment: formData.studentComment?.trim() || null,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      // Nouvelle soumission
      const { error } = await supabaseAdmin.from("submissions").insert({
        assignment_id: formData.assignmentId,
        student_id: studentId,
        file_url: formData.fileUrl,
        file_name: formData.fileName,
        file_size: formData.fileSize || 0,
        student_comment: formData.studentComment?.trim() || null,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      });

      if (error) return { success: false, error: error.message };
    }

    // Notifier le professeur
    const { data: assignInfo } = await supabaseAdmin
      .from("assignments")
      .select("title, teacher_id, subject:subjects(name)")
      .eq("id", formData.assignmentId)
      .single();

    const { data: studentProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", studentId)
      .single();

    if (assignInfo?.teacher_id) {
      const studentName = `${studentProfile?.first_name || ""} ${studentProfile?.last_name || ""}`.trim() || "Un élève";
      const subjectName = (assignInfo as any)?.subject?.name || "Matière";

      await supabaseAdmin.from("notifications").insert({
        user_id: assignInfo.teacher_id,
        type: "assignment",
        title: `📥 Copie reçue : ${studentName}`,
        message: `Dépôt effectué pour le devoir « ${assignInfo.title} » en ${subjectName}.`,
        link_url: `/prof/devoirs`,
        is_read: false,
      });
    }

    revalidatePath("/etudiant/devoirs");
    revalidatePath("/etudiant/notes");
    revalidatePath("/prof/devoirs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}
