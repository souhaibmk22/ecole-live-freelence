"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Role, MANDATORY_SUBJECTS, OPTIONAL_SUBJECTS } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function verifyAdminRole() {
  const supabaseServer = await createServerClient();
  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  if (!currentUser) {
    throw new Error("Non authentifié.");
  }

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  const role = (profile?.role as Role) || "etudiant";
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("Privilèges administrateur requis.");
  }

  return { currentUser, role };
}

export async function createClassAction(formData: {
  name: string;
  level: string;
  cycle: string;
  populate19Subjects?: boolean;
}) {
  try {
    const { currentUser, role } = await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    // 1. Créer la classe
    const { data: newClass, error: classError } = await supabaseAdmin
      .from("classes")
      .insert({
        name: formData.name.trim(),
        level: formData.level.trim() || "10-11 ans",
        cycle: formData.cycle.trim() || "Cycle Découverte",
      })
      .select()
      .single();

    if (classError || !newClass) {
      return { success: false, error: classError?.message || "Erreur lors de la création de la classe." };
    }

    // 2. Pré-remplir automatiquement les 19 matières officielles si demandé
    if (formData.populate19Subjects) {
      const subjectsToInsert = [
        ...MANDATORY_SUBJECTS.map((name) => ({
          class_id: newClass.id,
          name,
          is_mandatory: true,
        })),
        ...OPTIONAL_SUBJECTS.map((name) => ({
          class_id: newClass.id,
          name,
          is_mandatory: false,
        })),
      ];

      await supabaseAdmin.from("subjects").insert(subjectsToInsert);
    }

    // 3. Log d'audit
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "class_created",
      target_resource: newClass.id,
      details: {
        name: newClass.name,
        level: newClass.level,
        cycle: newClass.cycle,
        populated_subjects: formData.populate19Subjects,
      },
    });

    revalidatePath("/admin/classes");
    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return { success: true, data: newClass };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function deleteClassAction(classId: string) {
  try {
    const { currentUser } = await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "class_deleted",
      target_resource: classId,
    });

    const { error } = await supabaseAdmin.from("classes").delete().eq("id", classId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/classes");
    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function updateClassAction(formData: {
  classId: string;
  name: string;
  level: string;
  cycle: string;
}) {
  try {
    const { currentUser } = await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    const { data: updatedClass, error: updateError } = await supabaseAdmin
      .from("classes")
      .update({
        name: formData.name.trim(),
        level: formData.level.trim(),
        cycle: formData.cycle.trim(),
      })
      .eq("id", formData.classId)
      .select()
      .single();

    if (updateError || !updatedClass) {
      return { success: false, error: updateError?.message || "Erreur lors de la modification de la classe." };
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "class_updated",
      target_resource: formData.classId,
      details: {
        name: updatedClass.name,
        level: updatedClass.level,
        cycle: updatedClass.cycle,
      },
    });

    revalidatePath("/admin/classes");
    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return { success: true, data: updatedClass };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function createSubjectAction(formData: {
  classId: string;
  name: string;
  isMandatory: boolean;
}) {
  try {
    await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    const { data: newSubject, error } = await supabaseAdmin
      .from("subjects")
      .insert({
        class_id: formData.classId,
        name: formData.name.trim(),
        is_mandatory: formData.isMandatory,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/classes");
    return { success: true, data: newSubject };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function deleteSubjectAction(subjectId: string) {
  try {
    await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin.from("subjects").delete().eq("id", subjectId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function populateMissing19SubjectsAction(classId: string) {
  try {
    const { currentUser } = await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    // 1. Récupérer les matières existantes de cette classe
    const { data: existingSubjects } = await supabaseAdmin
      .from("subjects")
      .select("name")
      .eq("class_id", classId);

    const existingNames = new Set(
      (existingSubjects || []).map((s) => s.name.toLowerCase().trim())
    );

    // 2. Déterminer les matières manquantes
    const mandatoryToAdd = MANDATORY_SUBJECTS.filter(
      (name) => !existingNames.has(name.toLowerCase().trim())
    ).map((name) => ({
      class_id: classId,
      name,
      is_mandatory: true,
    }));

    const optionalToAdd = OPTIONAL_SUBJECTS.filter(
      (name) => !existingNames.has(name.toLowerCase().trim())
    ).map((name) => ({
      class_id: classId,
      name,
      is_mandatory: false,
    }));

    const toInsert = [...mandatoryToAdd, ...optionalToAdd];

    if (toInsert.length > 0) {
      const { data: inserted, error } = await supabaseAdmin
        .from("subjects")
        .insert(toInsert)
        .select();

      if (error) return { success: false, error: error.message };

      revalidatePath("/admin/classes");
      return { success: true, count: inserted?.length || 0, data: inserted || [] };
    }

    return { success: true, count: 0, data: [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function assignTeacherAction(formData: {
  subjectId: string;
  teacherId: string;
}) {
  try {
    await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    // Supprimer l'ancienne assignation pour cette matière si existante
    await supabaseAdmin.from("teacher_subjects").delete().eq("subject_id", formData.subjectId);

    // Ajouter la nouvelle assignation si teacherId est fourni
    if (formData.teacherId) {
      const { error } = await supabaseAdmin.from("teacher_subjects").insert({
        subject_id: formData.subjectId,
        teacher_id: formData.teacherId,
      });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function enrollStudentAction(formData: {
  classId: string;
  studentId: string;
  forceTransfer?: boolean;
}) {
  try {
    const { currentUser } = await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    // 1. Vérifier si l'élève est déjà inscrit dans une classe
    const { data: existingEnrollments } = await supabaseAdmin
      .from("enrollments")
      .select("class_id, classes(id, name)")
      .eq("student_id", formData.studentId);

    if (existingEnrollments && existingEnrollments.length > 0) {
      const alreadyInTarget = existingEnrollments.some((e) => e.class_id === formData.classId);
      if (alreadyInTarget) {
        return { success: false, error: "Cet élève est déjà inscrit dans cette classe." };
      }

      // Si l'élève est dans une autre classe et qu'on n'a pas confirmé le transfert
      if (!formData.forceTransfer) {
        const otherClass = existingEnrollments[0];
        const otherClassName = (otherClass.classes as any)?.name || "une autre classe";
        return {
          success: false,
          requiresTransfer: true,
          previousClassId: otherClass.class_id,
          currentClassName: otherClassName,
          error: `Cet élève est déjà inscrit dans la classe "${otherClassName}". Un élève ne peut appartenir qu'à une seule classe à la fois.`,
        };
      }

      // 2. Si le transfert est confirmé : retirer l'élève de toutes ses anciennes classes
      await supabaseAdmin
        .from("enrollments")
        .delete()
        .eq("student_id", formData.studentId);
    }

    // 3. Inscrire l'élève dans la nouvelle classe
    const { error: insertError } = await supabaseAdmin.from("enrollments").insert({
      class_id: formData.classId,
      student_id: formData.studentId,
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Log d'audit
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "student_enrolled",
      target_resource: formData.studentId,
      details: {
        class_id: formData.classId,
        transferred: !!formData.forceTransfer,
      },
    });

    revalidatePath("/admin/classes");
    revalidatePath("/admin");
    return { success: true, transferred: !!formData.forceTransfer };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

export async function unenrollStudentAction(formData: {
  classId: string;
  studentId: string;
}) {
  try {
    await verifyAdminRole();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("enrollments")
      .delete()
      .eq("class_id", formData.classId)
      .eq("student_id", formData.studentId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}
