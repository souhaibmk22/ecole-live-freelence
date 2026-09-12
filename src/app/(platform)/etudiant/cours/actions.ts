"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CourseMaterial, MaterialType } from "@/lib/types";

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

// Récupérer tous les supports de cours de la classe de l'élève
export async function fetchStudentMaterialsAction() {
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

    // B. Récupérer les matières de cette classe
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("class_id", enrollment.class_id);

    if (!subjects || subjects.length === 0) {
      return { success: true, hasClass: true, data: [] };
    }

    const subjectIds = subjects.map((s) => s.id);

    // C. Récupérer tous les supports de cours pour ces matières
    const { data: materials, error } = await supabaseAdmin
      .from("course_materials")
      .select(`
        *,
        subject:subjects(id, name),
        author:profiles(id, first_name, last_name)
      `)
      .in("subject_id", subjectIds)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const formatted: CourseMaterial[] = (materials || []).map((m: any) => ({
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
      subject: m.subject,
      author: m.author,
      class_name: (enrollment.classes as any)?.name || "Ma Classe",
    }));

    return { success: true, hasClass: true, data: formatted, subjects: subjects || [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue.", data: [], subjects: [] };
  }
}
