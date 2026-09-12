"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Role } from "@/lib/types";
import { revalidatePath } from "next/cache";

// Générateur de mot de passe aléatoire temporaire (12 caractères : majuscules, minuscules, chiffres, symboles)
function generateTempPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + numbers + symbols;

  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Mélanger les caractères
  return pwd
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

export async function createUserAccount(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
}) {
  const supabaseServer = await createServerClient();

  // 1. Vérification de l'utilisateur connecté
  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Vous devez être connecté pour effectuer cette action." };
  }

  // 2. Vérification du rôle de l'appelant en base
  const { data: callerProfile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  const callerRole = (callerProfile?.role as Role) || "etudiant";

  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return { success: false, error: "Accès refusé. Privilèges administrateur requis." };
  }

  // Un simple admin ne peut pas créer d'admin ou de super_admin
  if (callerRole === "admin" && (formData.role === "admin" || formData.role === "super_admin")) {
    return {
      success: false,
      error: "Seul un Super Administrateur peut créer des comptes administrateurs.",
    };
  }

  // 3. Vérification de la clé de service
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err: any) {
    return {
      success: false,
      error:
        "La clé SUPABASE_SERVICE_ROLE_KEY n'est pas encore configurée dans les variables d'environnement (.env.local). Veuillez l'ajouter pour permettre la création de comptes.",
    };
  }

  const tempPassword = generateTempPassword(12);

  try {
    // 4. Création du compte utilisateur dans auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone?.trim() || null,
        role: formData.role,
      },
    });

    if (createError) {
      if (createError.message.includes("already registered") || createError.message.includes("unique")) {
        return { success: false, error: "Un compte avec cette adresse email existe déjà." };
      }
      return { success: false, error: createError.message };
    }

    if (!newUser.user) {
      return { success: false, error: "Échec de création du compte." };
    }

    // 5. Mise à jour explicite du profil dans public.profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        role: formData.role,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    // 6. Enregistrement dans audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "user_created",
      target_resource: newUser.user.id,
      details: {
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        created_by_role: callerRole,
      },
    });

    revalidatePath("/admin/utilisateurs");
    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      data: {
        id: newUser.user.id,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        tempPassword,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur inattendue est survenue." };
  }
}

export async function resetUserPassword(targetUserId: string) {
  const supabaseServer = await createServerClient();

  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Non authentifié." };
  }

  const { data: callerProfile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  const callerRole = (callerProfile?.role as Role) || "etudiant";
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return { success: false, error: "Privilèges insuffisants." };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err: any) {
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante." };
  }

  const newTempPassword = generateTempPassword(12);

  try {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newTempPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "password_reset",
      target_resource: targetUserId,
      details: { reset_by: currentUser.id },
    });

    return { success: true, tempPassword: newTempPassword };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la réinitialisation." };
  }
}

export async function deleteUserAccount(targetUserId: string) {
  const supabaseServer = await createServerClient();

  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Non authentifié." };
  }

  if (currentUser.id === targetUserId) {
    return { success: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const { data: callerProfile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  const callerRole = (callerProfile?.role as Role) || "etudiant";
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return { success: false, error: "Privilèges insuffisants." };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err: any) {
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante." };
  }

  try {
    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "user_deleted",
      target_resource: targetUserId,
      details: { deleted_by: currentUser.id },
    });

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/admin/utilisateurs");
    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la suppression." };
  }
}

export async function fetchUserProfileDetailsAction(targetUserId: string) {
  const supabaseServer = await createServerClient();

  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Non authentifié." };
  }

  const { data: callerProfile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  const callerRole = (callerProfile?.role as Role) || "etudiant";
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return { success: false, error: "Privilèges insuffisants." };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err: any) {
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante." };
  }

  try {
    // 1. Récupérer le profil
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (profileErr || !targetProfile) {
      return { success: false, error: "Profil introuvable." };
    }

    // Récupérer l'email via auth.admin
    let email = "";
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      email = authUser.user?.email || "";
    } catch (e) {}

    const role = targetProfile.role as Role;

    // 2. Si c'est un ÉTUDIANT
    if (role === "etudiant") {
      // A. Classe inscrite
      const { data: enrollment } = await supabaseAdmin
        .from("enrollments")
        .select("class_id, classes(id, name, level, cycle)")
        .eq("student_id", targetUserId)
        .maybeSingle();

      const enrolledClass = enrollment?.classes as any || null;

      // B. Présences de l'élève
      const { data: attendances } = await supabaseAdmin
        .from("attendance")
        .select("session_id, present, marked_at, live_sessions(id, title, start_time, end_time, status, replay_url, subject_id, teacher_id, subjects(name, classes(name)))")
        .eq("student_id", targetUserId);

      // C. Toutes les séances délivrées pour sa classe
      let sessionsHistory: any[] = [];
      let totalDelivered = 0;
      let attendedCount = 0;
      let absentCount = 0;

      if (enrolledClass?.id) {
        const { data: classSubjects } = await supabaseAdmin
          .from("subjects")
          .select("id")
          .eq("class_id", enrolledClass.id);

        const subjectIds = (classSubjects || []).map((s) => s.id);

        if (subjectIds.length > 0) {
          const { data: classSessions } = await supabaseAdmin
            .from("live_sessions")
            .select("id, title, start_time, end_time, status, replay_url, teacher_id, subjects(name, class_id, classes(name))")
            .in("subject_id", subjectIds)
            .order("start_time", { ascending: false });

          // Récupérer les noms des profs
          const teacherIds = Array.from(new Set((classSessions || []).map((s) => s.teacher_id).filter(Boolean)));
          let teacherNamesMap: Record<string, string> = {};
          if (teacherIds.length > 0) {
            const { data: teachersData } = await supabaseAdmin
              .from("profiles")
              .select("id, first_name, last_name")
              .in("id", teacherIds);
            (teachersData || []).forEach((t) => {
              teacherNamesMap[t.id] = `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Professeur";
            });
          }

          const attendanceMap: Record<string, { present: boolean; marked_at?: string }> = {};
          (attendances || []).forEach((a) => {
            attendanceMap[a.session_id] = { present: a.present, marked_at: a.marked_at };
          });

          (classSessions || []).forEach((sess) => {
            const att = attendanceMap[sess.id];
            const isPresent = !!att?.present;
            if (sess.status === "ended" || sess.status === "live") {
              totalDelivered++;
              if (isPresent) attendedCount++;
              else absentCount++;
            }

            sessionsHistory.push({
              sessionId: sess.id,
              title: sess.title,
              subjectName: (sess.subjects as any)?.name || "Matière",
              className: (sess.subjects as any)?.classes?.name || enrolledClass.name,
              teacherName: teacherNamesMap[sess.teacher_id] || "Professeur",
              startTime: sess.start_time,
              sessionStatus: sess.status,
              present: isPresent,
              markedAt: att?.marked_at,
              replayUrl: sess.replay_url,
            });
          });
        }
      }

      // C. Devoirs et notes de l'élève
      let gradesList: any[] = [];
      let overallStudentAverage: number | null = null;

      try {
        const { data: studentSubmissions } = await supabaseAdmin
          .from("submissions")
          .select(`
            id,
            grade,
            feedback,
            graded_at,
            submitted_at,
            file_name,
            file_url,
            assignment:assignments(
              id,
              title,
              max_points,
              due_date,
              subject:subjects(name),
              teacher:profiles(first_name, last_name)
            )
          `)
          .eq("student_id", targetUserId)
          .order("submitted_at", { ascending: false });

        if (studentSubmissions) {
          let scoreSum = 0;
          let gradedCount = 0;

          gradesList = studentSubmissions.map((sub: any) => {
            const maxPts = sub.assignment?.max_points || 20;
            if (sub.grade !== null && sub.grade !== undefined) {
              scoreSum += (sub.grade / maxPts) * 20;
              gradedCount++;
            }

            return {
              id: sub.id,
              assignmentTitle: sub.assignment?.title || "Devoir",
              subjectName: sub.assignment?.subject?.name || "Matière",
              teacherName: sub.assignment?.teacher
                ? `${sub.assignment.teacher.first_name || ""} ${sub.assignment.teacher.last_name || ""}`.trim()
                : "Professeur",
              grade: sub.grade,
              maxPoints: maxPts,
              feedback: sub.feedback,
              gradedAt: sub.graded_at,
              submittedAt: sub.submitted_at,
              fileName: sub.file_name,
              fileUrl: sub.file_url,
            };
          });

          if (gradedCount > 0) {
            overallStudentAverage = Number((scoreSum / gradedCount).toFixed(2));
          }
        }
      } catch (e) {}

      const presenceRate =
        totalDelivered > 0 ? Math.round((attendedCount / totalDelivered) * 100) : 100;

      return {
        success: true,
        data: {
          profile: {
            id: targetProfile.id,
            first_name: targetProfile.first_name,
            last_name: targetProfile.last_name,
            email,
            role,
            created_at: targetProfile.created_at,
          },
          etudiantData: {
            enrolledClass,
            stats: {
              totalDeliveredSessions: totalDelivered,
              attendedSessions: attendedCount,
              absentSessions: absentCount,
              presenceRate,
              overallAverage: overallStudentAverage,
              totalGraded: gradesList.filter((g) => g.grade !== null).length,
            },
            sessionsHistory,
            gradesList,
          },
        },
      };
    }

    // 3. Si c'est un PROFESSEUR
    if (role === "prof") {
      // A. Matières assignées avec leur classe
      const { data: subjectsData } = await supabaseAdmin
        .from("subjects")
        .select("id, name, is_mandatory, class_id, classes(id, name, cycle, level)")
        .eq("teacher_id", targetUserId);

      const assignedSubjects = (subjectsData || []).map((s) => ({
        id: s.id,
        name: s.name,
        className: (s.classes as any)?.name || "Classe",
        isMandatory: s.is_mandatory,
      }));

      // B. Séances créées par ce prof
      const { data: teacherSessions } = await supabaseAdmin
        .from("live_sessions")
        .select("id, title, start_time, end_time, status, replay_url, subject_id, subjects(name, classes(name))")
        .eq("teacher_id", targetUserId)
        .order("start_time", { ascending: false });

      // C. Statistiques d'émargement sur ses séances
      const sessionIds = (teacherSessions || []).map((s) => s.id);
      let sessionAttendanceMap: Record<string, { present: number; total: number }> = {};

      if (sessionIds.length > 0) {
        const { data: allAttendance } = await supabaseAdmin
          .from("attendance")
          .select("session_id, present")
          .in("session_id", sessionIds);

        (allAttendance || []).forEach((a) => {
          if (!sessionAttendanceMap[a.session_id]) {
            sessionAttendanceMap[a.session_id] = { present: 0, total: 0 };
          }
          sessionAttendanceMap[a.session_id].total++;
          if (a.present) sessionAttendanceMap[a.session_id].present++;
        });
      }

      let totalCreated = (teacherSessions || []).length;
      let totalDelivered = 0;
      let totalReplays = 0;
      let sumRates = 0;
      let ratedSessionsCount = 0;

      const sessionsHistory = (teacherSessions || []).map((sess) => {
        const att = sessionAttendanceMap[sess.id] || { present: 0, total: 0 };
        const rate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;

        if (sess.status === "ended" || sess.status === "live") {
          totalDelivered++;
          if (att.total > 0) {
            sumRates += rate;
            ratedSessionsCount++;
          }
        }
        if (sess.replay_url) totalReplays++;

        return {
          sessionId: sess.id,
          title: sess.title,
          subjectName: (sess.subjects as any)?.name || "Matière",
          className: (sess.subjects as any)?.classes?.name || "Classe",
          startTime: sess.start_time,
          sessionStatus: sess.status,
          presentCount: att.present,
          totalStudentsCount: att.total,
          rate,
          replayUrl: sess.replay_url,
        };
      });

      const averageAttendanceRate =
        ratedSessionsCount > 0 ? Math.round(sumRates / ratedSessionsCount) : 100;

      return {
        success: true,
        data: {
          profile: {
            id: targetProfile.id,
            first_name: targetProfile.first_name,
            last_name: targetProfile.last_name,
            email,
            role,
            created_at: targetProfile.created_at,
          },
          profData: {
            assignedSubjects,
            stats: {
              totalSessionsCreated: totalCreated,
              totalDeliveredSessions: totalDelivered,
              totalReplaysCount: totalReplays,
              averageAttendanceRate,
            },
            sessionsHistory,
          },
        },
      };
    }

    // 4. Profil Parent
    if (role === "parent") {
      const { data: parentStudents } = await supabaseAdmin
        .from("parent_students")
        .select(`
          id,
          student_id,
          created_at,
          profiles:student_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq("parent_id", targetUserId);

      // Récupérer les classes des enfants
      const studentIds = (parentStudents || []).map((ps: any) => ps.student_id);
      let enrollmentsMap: Record<string, string> = {};

      if (studentIds.length > 0) {
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("student_id, classes:class_id ( name )")
          .in("student_id", studentIds);

        (enrollments || []).forEach((e: any) => {
          enrollmentsMap[e.student_id] = e.classes?.name || "Classe non assignée";
        });
      }

      const linkedStudents = (parentStudents || []).map((ps: any) => ({
        id: ps.student_id,
        first_name: ps.profiles?.first_name,
        last_name: ps.profiles?.last_name,
        avatar_url: ps.profiles?.avatar_url,
        class_name: enrollmentsMap[ps.student_id] || "Non assigné",
      }));

      return {
        success: true,
        data: {
          profile: {
            id: targetProfile.id,
            first_name: targetProfile.first_name,
            last_name: targetProfile.last_name,
            email,
            phone: targetProfile.phone || "",
            role,
            created_at: targetProfile.created_at,
          },
          parentData: {
            linkedStudents,
          },
        },
      };
    }

    // 5. Autre rôle (Admin ou Super Admin)
    const { data: adminLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, target_resource, details, created_at")
      .eq("actor_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(25);

    return {
      success: true,
      data: {
        profile: {
          id: targetProfile.id,
          first_name: targetProfile.first_name,
          last_name: targetProfile.last_name,
          email,
          phone: targetProfile.phone || "",
          role,
          created_at: targetProfile.created_at,
        },
        adminData: {
          totalActions: (adminLogs || []).length,
          logs: adminLogs || [],
        },
      },
    };
  } catch (err: any) {
    console.error("fetchUserProfileDetailsAction error:", err);
    return { success: false, error: err?.message || "Erreur lors du chargement des détails." };
  }
}

// Récupérer la liste complète des élèves avec leur classe pour le sélecteur multi-choix
export async function fetchAllStudentsWithClassesAction() {
  try {
    let supabase: any = await createServerClient();
    let hasAdmin = false;
    try {
      supabase = createAdminClient();
      hasAdmin = true;
    } catch (e) {
      console.warn("createAdminClient not available, falling back to server client:", e);
    }

    // 1. Récupérer les profils des étudiants avec leur email
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, phone, email")
      .eq("role", "etudiant")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("fetchAllStudentsWithClassesAction profiles error:", error);
    }

    // 2. Récupérer les inscriptions de classes
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(`
        student_id,
        classes:class_id (
          id,
          name
        )
      `);

    const classMap: Record<string, string> = {};
    (enrollments || []).forEach((e: any) => {
      classMap[e.student_id] = e.classes?.name || "Classe non assignée";
    });

    const formatted = (students || []).map((s: any) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email || "",
      phone: s.phone || "",
      class_name: classMap[s.id] || "Élève",
    }));

    return { success: true, students: formatted };
  } catch (err: any) {
    console.error("fetchAllStudentsWithClassesAction error:", err);
    return { success: false, error: err?.message || "Erreur lors du chargement des élèves." };
  }
}

// Création d'un compte parent avec association d'un ou plusieurs élèves et numéro de téléphone
export async function createParentAccountWithStudentsAction(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  studentIds: string[];
}) {
  const supabaseServer = await createServerClient();
  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Vous devez être connecté pour effectuer cette action." };
  }

  // 1. Créer le compte utilisateur via Supabase Admin
  const tempPassword = generateTempPassword(12);
  const supabaseAdmin = createAdminClient();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone: formData.phone?.trim() || null,
      role: "parent",
    },
  });

  if (authError || !authData?.user) {
    console.error("createParentAccount auth error:", authError);
    if (authError?.message?.includes("already been registered") || authError?.message?.includes("unique")) {
      return { success: false, error: "Cet email est déjà utilisé par un autre compte." };
    }
    return { success: false, error: authError?.message || "Erreur lors de la création du compte parent." };
  }

  const newParentId = authData.user.id;

  // 2. Mettre à jour le profil
  await supabaseAdmin.from("profiles").upsert({
    id: newParentId,
    first_name: formData.firstName.trim(),
    last_name: formData.lastName.trim(),
    phone: formData.phone?.trim() || null,
    role: "parent",
    updated_at: new Date().toISOString(),
  });

  // 3. Associer les enfants sélectionnés
  if (formData.studentIds && formData.studentIds.length > 0) {
    const relationsToInsert = formData.studentIds.map((studentId) => ({
      parent_id: newParentId,
      student_id: studentId,
      relationship_type: "parent",
      created_at: new Date().toISOString(),
    }));

    const { error: relError } = await supabaseAdmin
      .from("parent_students")
      .insert(relationsToInsert);

    if (relError) {
      console.warn("parent_students insert warning:", relError);
    }
  }

  // 4. Logger l'audit
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: currentUser.id,
    action: "create_parent_account",
    target_resource: `parent:${newParentId}`,
    details: {
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      students_count: formData.studentIds.length,
      student_ids: formData.studentIds,
    },
  });

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/super-admin/audit");

  return {
    success: true,
    user: {
      id: newParentId,
      email: formData.email,
      role: "parent" as Role,
      tempPassword,
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
    },
  };
}

// Mise à jour complète du profil utilisateur (Nom, Prénom, Email, Téléphone, Classe pour Élèves, Enfants pour Parents)
export async function updateUserProfileAdminAction(formData: {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  studentIds?: string[];
  classId?: string;
}) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user: currentUser },
    } = await supabaseServer.auth.getUser();

    if (!currentUser) return { success: false, error: "Non autorisé." };

    const { data: callerProfile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    const callerRole = (callerProfile?.role as Role) || "etudiant";
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return { success: false, error: "Privilèges administrateur requis." };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Mettre à jour public.profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formData.userId);

    if (profileError) throw profileError;

    // 2. Mettre à jour auth.users (email et métadonnées)
    const authUpdates: any = {
      user_metadata: {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone?.trim() || null,
      },
    };

    if (formData.email) {
      authUpdates.email = formData.email.trim().toLowerCase();
    }

    await supabaseAdmin.auth.admin.updateUserById(formData.userId, authUpdates);

    // 3. Si c'est un étudiant et que classId est spécifié, mettre à jour son inscription (enrollment)
    if (formData.classId !== undefined) {
      if (formData.classId) {
        const { data: existingEnrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("student_id", formData.userId)
          .maybeSingle();

        if (existingEnrollment) {
          await supabaseAdmin
            .from("enrollments")
            .update({ class_id: formData.classId })
            .eq("id", existingEnrollment.id);
        } else {
          await supabaseAdmin.from("enrollments").insert({
            student_id: formData.userId,
            class_id: formData.classId,
          });
        }
      } else {
        // Retirer de toute classe (désassigner)
        await supabaseAdmin
          .from("enrollments")
          .delete()
          .eq("student_id", formData.userId);
      }
    }

    // 4. Si c'est un parent et que des studentIds sont fournis, synchroniser parent_students
    if (formData.studentIds !== undefined) {
      await supabaseAdmin
        .from("parent_students")
        .delete()
        .eq("parent_id", formData.userId);

      if (formData.studentIds.length > 0) {
        const relations = formData.studentIds.map((sId) => ({
          parent_id: formData.userId,
          student_id: sId,
          relationship_type: "parent",
          created_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from("parent_students").insert(relations);
      }
    }

    // 5. Audit
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: currentUser.id,
      action: "update_user_profile",
      target_resource: `user:${formData.userId}`,
      details: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        classId: formData.classId,
        studentIds: formData.studentIds,
      },
    });

    revalidatePath("/admin/utilisateurs");
    revalidatePath("/admin/classes");
    revalidatePath("/super-admin/audit");

    return { success: true };
  } catch (err: any) {
    console.error("updateUserProfileAdminAction error:", err);
    return { success: false, error: err?.message || "Erreur lors de la mise à jour." };
  }
}

// Récupérer les élèves liés à un parent
export async function fetchParentLinkedStudentsAction(parentId: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    if (error) throw error;
    const studentIds = (data || []).map((d) => d.student_id);
    return { success: true, studentIds };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur récupération enfants liés." };
  }
}

// Mettre à jour les élèves liés à un parent
export async function updateParentLinkedStudentsAction(parentId: string, studentIds: string[]) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user: currentUser },
    } = await supabaseServer.auth.getUser();

    if (!currentUser) return { success: false, error: "Non autorisé." };

    const supabaseAdmin = createAdminClient();

    // 1. Supprimer les anciennes associations
    await supabaseAdmin
      .from("parent_students")
      .delete()
      .eq("parent_id", parentId);

    // 2. Insérer les nouvelles associations
    if (studentIds.length > 0) {
      const inserts = studentIds.map((sId) => ({
        parent_id: parentId,
        student_id: sId,
        relationship_type: "parent",
        created_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from("parent_students").insert(inserts);
    }

    revalidatePath("/admin/utilisateurs");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur mise à jour des liaisons." };
  }
}


