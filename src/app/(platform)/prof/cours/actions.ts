"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { CourseMaterial, MaterialType } from "@/lib/types";

// Vérifier l'authentification enseignant ou admin
async function verifyTeacherOrAdmin() {
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

// 1. Récupérer tous les supports de cours
export async function fetchTeacherMaterialsAction() {
  try {
    const { userId, currentUser } = await verifyTeacherOrAdmin();
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from("course_materials")
      .select(`
        *,
        subject:subjects(id, name, class_id, classes(id, name, level, cycle)),
        author:profiles(id, first_name, last_name)
      `)
      .order("created_at", { ascending: false });

    if (currentUser.role === "prof") {
      query = query.eq("author_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const formatted: CourseMaterial[] = (data || []).map((m: any) => ({
      id: m.id,
      subject_id: m.subject_id,
      author_id: m.author_id,
      title: m.title,
      description: m.description,
      material_type: m.material_type as MaterialType,
      file_url: m.file_url,
      file_name: m.file_name,
      file_size: m.file_size,
      external_url: m.external_url,
      created_at: m.created_at,
      subject: m.subject
        ? {
            id: m.subject.id,
            name: m.subject.name,
            class_id: m.subject.class_id,
            is_mandatory: true,
            created_at: m.created_at,
            class_name: m.subject.classes?.name || "Classe",
          }
        : null,
      author: m.author,
      class_name: m.subject?.classes?.name || "Classe",
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue.", data: [] };
  }
}

// 2. Créer un nouveau support de cours
export async function createMaterialAction(formData: {
  subjectId: string;
  title: string;
  description?: string;
  materialType: MaterialType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  externalUrl?: string;
}) {
  try {
    const { userId } = await verifyTeacherOrAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("course_materials")
      .insert({
        subject_id: formData.subjectId,
        author_id: userId,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        material_type: formData.materialType,
        file_url: formData.fileUrl || null,
        file_name: formData.fileName || null,
        file_size: formData.fileSize || null,
        external_url: formData.externalUrl?.trim() || null,
      })
      .select(`
        *,
        subject:subjects(id, name, class_id)
      `)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Notifier les élèves de la classe
    const subjectObj = (data as any)?.subject;
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
            type: "material",
            title: `📚 Nouveau Cours : ${subjectObj.name || "Matière"}`,
            message: `Un nouveau support a été publié : « ${formData.title.trim()} ».`,
            link_url: `/etudiant/cours?subject=${formData.subjectId}`,
            is_read: false,
          }))
        );
      }
    }

    revalidatePath("/prof/cours");
    revalidatePath("/etudiant/cours");
    revalidatePath("/admin/cours");
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 3. Supprimer un support de cours
export async function deleteMaterialAction(materialId: string) {
  try {
    await verifyTeacherOrAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("course_materials")
      .delete()
      .eq("id", materialId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/prof/cours");
    revalidatePath("/etudiant/cours");
    revalidatePath("/admin/cours");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}
