"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Assignment, Submission } from "@/lib/types";

// Vérifier l'authentification et le rôle enseignant
async function verifyTeacherRole() {
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

  if (!profile || !["prof", "admin", "super_admin"].includes(profile.role)) {
    throw new Error("Accès non autorisé.");
  }

  return { currentUser: profile, userId: user.id };
}

// 1. Récupérer tous les devoirs du professeur avec statistiques
export async function fetchTeacherAssignmentsAction() {
  try {
    const { userId, currentUser } = await verifyTeacherRole();
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from("assignments")
      .select(`
        *,
        subject:subjects(id, name, class_id, classes(id, name, level, cycle)),
        teacher:profiles(id, first_name, last_name),
        submissions(id, student_id, grade, status)
      `)
      .order("created_at", { ascending: false });

    // Si rôle professeur standard, filtrer par teacher_id
    if (currentUser.role === "prof") {
      query = query.eq("teacher_id", userId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      // Si la table n'existe pas encore ou erreur
      return { success: false, error: error.message, data: [] };
    }

    const formattedAssignments: Assignment[] = (assignments || []).map((a: any) => {
      const subs = a.submissions || [];
      const gradedCount = subs.filter((s: any) => s.grade !== null && s.grade !== undefined).length;
      const className = a.subject?.classes?.name || "Classe";

      return {
        id: a.id,
        subject_id: a.subject_id,
        teacher_id: a.teacher_id,
        title: a.title,
        description: a.description,
        due_date: a.due_date,
        attachment_url: a.attachment_url,
        attachment_name: a.attachment_name,
        max_points: a.max_points || 20,
        created_at: a.created_at,
        solution_url: a.solution_url || null,
        solution_name: a.solution_name || null,
        solution_text: a.solution_text || null,
        solution_published: !!a.solution_published,
        subject: a.subject
          ? {
              id: a.subject.id,
              name: a.subject.name,
              class_id: a.subject.class_id,
              is_mandatory: true,
              created_at: a.created_at,
              class_name: className,
            }
          : null,
        teacher: a.teacher,
        submissions_count: subs.length,
        graded_count: gradedCount,
        class_name: className,
      };
    });

    return { success: true, data: formattedAssignments };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue.", data: [] };
  }
}

// 2. Créer un nouveau devoir
export async function createAssignmentAction(formData: {
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  attachmentUrl?: string;
  attachmentName?: string;
  maxPoints?: number;
}) {
  try {
    const { userId } = await verifyTeacherRole();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert({
        subject_id: formData.subjectId,
        teacher_id: userId,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        due_date: formData.dueDate,
        attachment_url: formData.attachmentUrl || null,
        attachment_name: formData.attachmentName || null,
        max_points: formData.maxPoints || 20,
      })
      .select(`
        *,
        subject:subjects(id, name, class_id)
      `)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Déclencher les notifications automatiques aux élèves de la classe
    if (data?.subject?.class_id) {
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("class_id", data.subject.class_id);

      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      if (studentIds.length > 0) {
        const formattedDate = new Date(formData.dueDate).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        });
        await supabaseAdmin.from("notifications").insert(
          studentIds.map((sid) => ({
            user_id: sid,
            type: "assignment",
            title: `📝 Nouveau Devoir : ${data.subject.name}`,
            message: `« ${formData.title.trim()} » à rendre pour le ${formattedDate}.`,
            link_url: `/etudiant/devoirs?subject=${formData.subjectId}`,
            is_read: false,
          }))
        );
      }
    }

    revalidatePath("/prof/devoirs");
    revalidatePath("/etudiant/devoirs");
    revalidatePath("/etudiant/notes");
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 3. Supprimer un devoir
export async function deleteAssignmentAction(assignmentId: string) {
  try {
    await verifyTeacherRole();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/prof/devoirs");
    revalidatePath("/etudiant/devoirs");
    revalidatePath("/etudiant/notes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 4. Récupérer toutes les soumissions et élèves inscrits pour un devoir donné
export async function fetchAssignmentSubmissionsAction(assignmentId: string) {
  try {
    await verifyTeacherRole();
    const supabaseAdmin = createAdminClient();

    // A. Récupérer le devoir et sa classe associée
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        subject:subjects(id, name, class_id, classes(id, name))
      `)
      .eq("id", assignmentId)
      .single();

    if (assignError || !assignment) {
      return { success: false, error: "Devoir introuvable.", data: [], students: [] };
    }

    const classId = assignment.subject?.class_id;

    // B. Récupérer tous les élèves inscrits dans cette classe
    let enrolledStudents: any[] = [];
    if (classId) {
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("student:profiles(id, first_name, last_name)")
        .eq("class_id", classId);

      if (enrollments) {
        enrolledStudents = enrollments.map((e: any) => e.student).filter(Boolean);
      }
    }

    // C. Récupérer les soumissions existantes
    const { data: submissions, error: subsError } = await supabaseAdmin
      .from("submissions")
      .select(`
        *,
        student:profiles(id, first_name, last_name)
      `)
      .eq("assignment_id", assignmentId);

    if (subsError) {
      return { success: false, error: subsError.message, data: [], students: enrolledStudents };
    }

    return {
      success: true,
      assignment,
      submissions: submissions || [],
      students: enrolledStudents,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 5. Noter et corriger la copie d'un élève
export async function gradeSubmissionAction(formData: {
  assignmentId: string;
  studentId: string;
  grade: number;
  feedback?: string;
}) {
  try {
    await verifyTeacherRole();
    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("assignment_id", formData.assignmentId)
      .eq("student_id", formData.studentId)
      .maybeSingle();

    if (existing) {
      // Mettre à jour la note
      const { error } = await supabaseAdmin
        .from("submissions")
        .update({
          grade: formData.grade,
          feedback: formData.feedback?.trim() || null,
          graded_at: new Date().toISOString(),
          status: "graded",
        })
        .eq("id", existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      // Si l'élève n'avait pas déposé de fichier numérique mais que le prof veut saisir une note d'oral/sur table
      const { error } = await supabaseAdmin.from("submissions").insert({
        assignment_id: formData.assignmentId,
        student_id: formData.studentId,
        file_url: "",
        file_name: "Note saisie directement par l'enseignant",
        grade: formData.grade,
        feedback: formData.feedback?.trim() || null,
        graded_at: new Date().toISOString(),
        status: "graded",
      });

      if (error) return { success: false, error: error.message };
    }

    // Notifier l'élève de sa note
    const { data: assignInfo } = await supabaseAdmin
      .from("assignments")
      .select("title, subject:subjects(name)")
      .eq("id", formData.assignmentId)
      .single();

    const subjectName = (assignInfo as any)?.subject?.name || "Matière";
    const assignTitle = assignInfo?.title || "Devoir";

    await supabaseAdmin.from("notifications").insert({
      user_id: formData.studentId,
      type: "grade",
      title: `🏆 Note reçue : ${formData.grade}/20 en ${subjectName}`,
      message: `Votre copie pour « ${assignTitle} » a été évaluée.${formData.feedback ? ` Appréciation : ${formData.feedback}` : ""}`,
      link_url: `/etudiant/notes`,
      is_read: false,
    });

    revalidatePath("/prof/devoirs");
    revalidatePath("/etudiant/devoirs");
    revalidatePath("/etudiant/notes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 6. Enregistrer ou modifier le corrigé / solution officielle du devoir
export async function saveAssignmentSolutionAction(formData: {
  assignmentId: string;
  solutionUrl?: string;
  solutionName?: string;
  solutionText?: string;
  solutionPublished: boolean;
}) {
  try {
    await verifyTeacherRole();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("assignments")
      .update({
        solution_url: formData.solutionUrl || null,
        solution_name: formData.solutionName || null,
        solution_text: formData.solutionText?.trim() || null,
        solution_published: formData.solutionPublished,
      })
      .eq("id", formData.assignmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Si le corrigé est publié, alerter les élèves de la classe
    if (formData.solutionPublished) {
      const { data: assignData } = await supabaseAdmin
        .from("assignments")
        .select("title, subject_id, subject:subjects(name, class_id)")
        .eq("id", formData.assignmentId)
        .single();

      if (assignData) {
        const subjectObj = (assignData as any)?.subject;
        if (subjectObj?.class_id) {
          const { data: enrollments } = await supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("class_id", subjectObj.class_id);

          const studentIds = (enrollments || []).map((e: any) => e.student_id);
          if (studentIds.length > 0) {
            await supabaseAdmin.from("notifications").insert(
              studentIds.map((sid) => ({
                user_id: sid,
                type: "solution",
                title: `💡 Corrigé disponible : ${subjectObj.name || "Matière"}`,
                message: `Le professeur a mis en ligne la solution officielle pour « ${assignData.title} ».`,
                link_url: `/etudiant/devoirs?subject=${assignData.subject_id}`,
                is_read: false,
              }))
            );
          }
        }
      }
    }

    revalidatePath("/prof/devoirs");
    revalidatePath("/etudiant/devoirs");
    revalidatePath("/admin/devoirs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

