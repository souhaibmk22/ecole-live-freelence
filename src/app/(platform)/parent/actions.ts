"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ParentChildInfo, LiveSession } from "@/lib/types";

// 1. Récupération groupée ultra-rapide des enfants du parent et de leurs données de synthèse (1 seule requête)
export async function fetchParentChildrenOverviewAction(): Promise<{
  success: boolean;
  children: ParentChildInfo[];
  parentProfile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
  };
  error?: string;
}> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, children: [], error: "Non connecté." };
    }

    const supabaseAdmin = createAdminClient();

    // Profil parent
    const { data: parentProf } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("id", user.id)
      .single();

    // Récupérer les relations parent-enfants
    const { data: parentStudents, error: psError } = await supabaseAdmin
      .from("parent_students")
      .select(`
        student_id,
        profiles:student_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("parent_id", user.id);

    if (psError) {
      console.warn("fetchParentChildrenOverviewAction error:", psError);
    }

    const studentIds = (parentStudents || []).map((ps: any) => ps.student_id);

    if (studentIds.length === 0) {
      return {
        success: true,
        children: [],
        parentProfile: {
          id: user.id,
          first_name: parentProf?.first_name || null,
          last_name: parentProf?.last_name || null,
          email: user.email,
        },
      };
    }

    // Récupérer les classes des enfants
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select(`
        student_id,
        class_id,
        classes:class_id (
          id,
          name
        )
      `)
      .in("student_id", studentIds);

    const classMap: Record<string, { id: string; name: string }> = {};
    (enrollments || []).forEach((e: any) => {
      classMap[e.student_id] = {
        id: e.class_id,
        name: e.classes?.name || "Non assigné",
      };
    });

    // Récupérer les présences de chaque enfant
    const { data: attendanceData } = await supabaseAdmin
      .from("attendance")
      .select("student_id, present")
      .in("student_id", studentIds);

    const attendanceStats: Record<string, { total: number; present: number }> = {};
    (attendanceData || []).forEach((a: any) => {
      if (!attendanceStats[a.student_id]) {
        attendanceStats[a.student_id] = { total: 0, present: 0 };
      }
      attendanceStats[a.student_id].total += 1;
      if (a.present) attendanceStats[a.student_id].present += 1;
    });

    // Récupérer les notes de chaque enfant
    const { data: submissionsData } = await supabaseAdmin
      .from("submissions")
      .select("student_id, grade, status")
      .in("student_id", studentIds);

    const gradeStats: Record<string, { sum: number; count: number; pending: number }> = {};
    (submissionsData || []).forEach((s: any) => {
      if (!gradeStats[s.student_id]) {
        gradeStats[s.student_id] = { sum: 0, count: 0, pending: 0 };
      }
      if (typeof s.grade === "number") {
        gradeStats[s.student_id].sum += s.grade;
        gradeStats[s.student_id].count += 1;
      }
    });

    // Assembler la liste consolidée des enfants
    const children: ParentChildInfo[] = (parentStudents || []).map((ps: any) => {
      const sId = ps.student_id;
      const att = attendanceStats[sId];
      const attRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;

      const gr = gradeStats[sId];
      const avgGrade = gr && gr.count > 0 ? Math.round((gr.sum / gr.count) * 10) / 10 : undefined;

      return {
        id: sId,
        first_name: ps.profiles?.first_name || "Élève",
        last_name: ps.profiles?.last_name || "",
        avatar_url: ps.profiles?.avatar_url || null,
        class_id: classMap[sId]?.id,
        class_name: classMap[sId]?.name || "Classe non assignée",
        attendance_rate: attRate,
        recent_grade_avg: avgGrade,
      };
    });

    return {
      success: true,
      children,
      parentProfile: {
        id: user.id,
        first_name: parentProf?.first_name || null,
        last_name: parentProf?.last_name || null,
        email: user.email,
      },
    };
  } catch (err: any) {
    console.error("fetchParentChildrenOverviewAction error:", err);
    return { success: false, children: [], error: err?.message || "Erreur serveur." };
  }
}

// 2. Planning, Assiduité et Replays Vidéos de l'enfant actif
export async function fetchChildPlanningAndAttendanceAction(childId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Récupérer la classe de l'enfant
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("class_id, classes:class_id ( id, name )")
      .eq("student_id", childId)
      .maybeSingle();

    if (!enrollment?.class_id) {
      return { success: true, sessions: [], attendanceMap: {}, className: "Non assigné" };
    }

    const classId = enrollment.class_id;
    const className = (enrollment.classes as any)?.name || "Classe";

    // 2. Matières de la classe
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("class_id", classId);

    const subjectIds = (subjects || []).map((s) => s.id);
    if (subjectIds.length === 0) {
      return { success: true, sessions: [], attendanceMap: {}, className };
    }

    // 3. Séances de cours & Replays
    const { data: sessionsData } = await supabaseAdmin
      .from("live_sessions")
      .select(`
        id,
        subject_id,
        teacher_id,
        title,
        start_time,
        end_time,
        room_name,
        status,
        replay_url,
        created_at,
        subjects:subject_id (
          id,
          name,
          classes:class_id (
            id,
            name
          )
        ),
        profiles:teacher_id (
          id,
          first_name,
          last_name
        )
      `)
      .in("subject_id", subjectIds)
      .order("start_time", { ascending: false });

    // 4. Présences enregistrées de cet enfant
    const { data: attendanceData } = await supabaseAdmin
      .from("attendance")
      .select("session_id, present, marked_at")
      .eq("student_id", childId);

    const attendanceMap: Record<string, { present: boolean; marked_at: string }> = {};
    (attendanceData || []).forEach((a: any) => {
      attendanceMap[a.session_id] = {
        present: a.present,
        marked_at: a.marked_at,
      };
    });

    const sessions = (sessionsData || []).map((s: any) => ({
      id: s.id,
      subject_id: s.subject_id,
      teacher_id: s.teacher_id,
      title: s.title,
      start_time: s.start_time,
      end_time: s.end_time,
      room_name: s.room_name,
      status: s.status,
      replay_url: s.replay_url || null,
      created_at: s.created_at,
      subject: {
        id: s.subjects?.id,
        name: s.subjects?.name,
        class_id: "",
        is_mandatory: true,
        created_at: "",
        class_name: s.subjects?.classes?.name,
      },
      teacher: s.profiles,
      attendance: attendanceMap[s.id] || null,
    }));

    return {
      success: true,
      sessions,
      attendanceMap,
      className,
    };
  } catch (err: any) {
    console.error("fetchChildPlanningAndAttendanceAction error:", err);
    return { success: false, error: err?.message || "Erreur chargement planning." };
  }
}

// 3. Devoirs de l'enfant actif
export async function fetchChildDevoirsAction(childId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    // Classe de l'enfant
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("class_id")
      .eq("student_id", childId)
      .maybeSingle();

    if (!enrollment?.class_id) {
      return { success: true, assignments: [] };
    }

    // Matières de la classe
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("class_id", enrollment.class_id);

    const subjectIds = (subjects || []).map((s) => s.id);
    if (subjectIds.length === 0) return { success: true, assignments: [] };

    // Devoirs créés pour ces matières
    const { data: assignmentsData } = await supabaseAdmin
      .from("assignments")
      .select(`
        id,
        subject_id,
        title,
        description,
        due_date,
        attachment_url,
        attachment_name,
        solution_url,
        solution_name,
        solution_published,
        created_at,
        subjects:subject_id (
          id,
          name
        ),
        profiles:teacher_id (
          id,
          first_name,
          last_name
        )
      `)
      .in("subject_id", subjectIds)
      .order("due_date", { ascending: false });

    // Soumissions de l'enfant
    const { data: submissionsData } = await supabaseAdmin
      .from("submissions")
      .select("id, assignment_id, file_url, file_name, status, grade, feedback, submitted_at")
      .eq("student_id", childId);

    const submissionMap: Record<string, any> = {};
    (submissionsData || []).forEach((sub: any) => {
      submissionMap[sub.assignment_id] = sub;
    });

    const assignments = (assignmentsData || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      due_date: a.due_date,
      attachment_url: a.attachment_url || null,
      attachment_name: a.attachment_name || null,
      solution_url: a.solution_url || null,
      solution_name: a.solution_name || null,
      solution_published: !!a.solution_published,
      subject_name: a.subjects?.name || "Matière",
      teacher_name: a.profiles ? `${a.profiles.first_name || ""} ${a.profiles.last_name || ""}`.trim() : "Professeur",
      submission: submissionMap[a.id] || null,
    }));

    return { success: true, assignments };
  } catch (err: any) {
    console.error("fetchChildDevoirsAction error:", err);
    return { success: false, error: err?.message || "Erreur chargement devoirs." };
  }
}

// 4. Notes et Bulletins de l'enfant actif
export async function fetchChildNotesAction(childId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    // Récupérer toutes les soumissions notées de cet élève
    const { data: gradedSubmissions, error } = await supabaseAdmin
      .from("submissions")
      .select(`
        id,
        grade,
        feedback,
        submitted_at,
        assignments:assignment_id (
          id,
          title,
          subject_id,
          subjects:subject_id (
            id,
            name
          ),
          profiles:teacher_id (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq("student_id", childId)
      .not("grade", "is", null)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    // Regrouper les notes par matière
    const subjectsMap: Record<
      string,
      {
        subject_id: string;
        subject_name: string;
        grades: { id: string; title: string; grade: number; feedback: string | null; date: string }[];
        average: number;
      }
    > = {};

    let totalPoints = 0;
    let totalGradesCount = 0;

    (gradedSubmissions || []).forEach((sub: any) => {
      const assignment = sub.assignments;
      const subjectName = assignment?.subjects?.name || "Matière générale";
      const subjectId = assignment?.subject_id || "general";

      if (!subjectsMap[subjectId]) {
        subjectsMap[subjectId] = {
          subject_id: subjectId,
          subject_name: subjectName,
          grades: [],
          average: 0,
        };
      }

      const numGrade = Number(sub.grade);
      subjectsMap[subjectId].grades.push({
        id: sub.id,
        title: assignment?.title || "Évaluation",
        grade: numGrade,
        feedback: sub.feedback,
        date: sub.submitted_at,
      });

      totalPoints += numGrade;
      totalGradesCount += 1;
    });

    // Calculer les moyennes par matière
    Object.values(subjectsMap).forEach((subj) => {
      const sum = subj.grades.reduce((acc, g) => acc + g.grade, 0);
      subj.average = subj.grades.length > 0 ? Math.round((sum / subj.grades.length) * 10) / 10 : 0;
    });

    const generalAverage = totalGradesCount > 0 ? Math.round((totalPoints / totalGradesCount) * 10) / 10 : null;

    return {
      success: true,
      subjects: Object.values(subjectsMap),
      generalAverage,
      totalGradesCount,
    };
  } catch (err: any) {
    console.error("fetchChildNotesAction error:", err);
    return { success: false, error: err?.message || "Erreur chargement des notes." };
  }
}
