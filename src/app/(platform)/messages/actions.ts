"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatConversation, ChatMessage, ChatMessageReaction, Profile } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { createBulkNotifications } from "@/lib/notifications/actions";
import { sanitizeInputText, checkMessageCompliance } from "@/lib/chatSecurity";

// Vérifier l'utilisateur connecté
async function verifyAuth() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) throw new Error("Non authentifié.");

  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profil introuvable.");

  return { user, profile: profile as Profile };
}

// Sécurité : Vérifier formellement que l'utilisateur est participant ou a accès au salon
async function verifyConversationAccess(
  supabaseAdmin: any,
  conversationId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "super_admin" || userRole === "admin") return true;

  // 1. Vérification dans chat_participants
  const { data: part } = await supabaseAdmin
    .from("chat_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (part) return true;

  // 2. Vérification salon de classe / annonces
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, type, class_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return false;

  if (conv.type === "announcement" && !conv.class_id) return true;

  if (conv.class_id) {
    if (userRole === "prof") return true;
    if (userRole === "etudiant") {
      const { data: enroll } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("class_id", conv.class_id)
        .eq("student_id", userId)
        .maybeSingle();
      if (enroll) return true;
    }
  }

  return false;
}

// 1. Récupérer l'annuaire des utilisateurs pour les messages directs
export async function fetchUserDirectoryAction(): Promise<{
  success: boolean;
  data: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar_url: string | null;
    class_name?: string;
    is_child_teacher?: boolean;
    child_name?: string;
    subject_name?: string;
  }[];
  error?: string;
}> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // 1. Récupérer tous les autres utilisateurs
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, role, avatar_url")
      .neq("id", user.id)
      .order("first_name", { ascending: true });

    if (error) {
      console.error("fetchUserDirectoryAction error:", error);
      return { success: false, data: [], error: error.message };
    }

    // 2. Récupérer les classes des étudiants
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, classes:class_id(id, name)");

    const classMap: Record<string, string> = {};
    (enrollments || []).forEach((e: any) => {
      if (e.student_id && e.classes?.name) {
        classMap[e.student_id] = e.classes.name;
      }
    });

    // 3. Spécifique aux parents : Identifier précisément les professeurs de leurs enfants
    const childTeachersMap: Record<string, { child_name: string; subject_name: string; class_name: string }> = {};

    if (profile.role === "parent") {
      const { data: parentStudents } = await supabaseAdmin
        .from("parent_students")
        .select("student_id, profiles:student_id(id, first_name, last_name)")
        .eq("parent_id", user.id);

      const studentIds = (parentStudents || []).map((ps: any) => ps.student_id);
      const studentNameMap: Record<string, string> = {};
      (parentStudents || []).forEach((ps: any) => {
        studentNameMap[ps.student_id] = [ps.profiles?.first_name, ps.profiles?.last_name].filter(Boolean).join(" ");
      });

      if (studentIds.length > 0) {
        const studentEnrollments = (enrollments || []).filter((e: any) => studentIds.includes(e.student_id));
        const classIds = studentEnrollments.map((e: any) => e.classes?.id).filter(Boolean);

        const classToStudentName: Record<string, string> = {};
        const classToClassName: Record<string, string> = {};
        studentEnrollments.forEach((e: any) => {
          if (e.classes?.id) {
            classToStudentName[e.classes.id] = studentNameMap[e.student_id] || "Votre enfant";
            classToClassName[e.classes.id] = e.classes.name || "Classe";
          }
        });

        if (classIds.length > 0) {
          // A. Professeurs assignés aux matières des classes
          const { data: subjects } = await supabaseAdmin
            .from("subjects")
            .select("id, name, class_id")
            .in("class_id", classIds);

          const subjectIds = (subjects || []).map((s: any) => s.id);
          const subjectMap: Record<string, { name: string; class_id: string }> = {};
          (subjects || []).forEach((s: any) => {
            subjectMap[s.id] = { name: s.name, class_id: s.class_id };
          });

          if (subjectIds.length > 0) {
            const { data: teacherSubjects } = await supabaseAdmin
              .from("teacher_subjects")
              .select("teacher_id, subject_id")
              .in("subject_id", subjectIds);

            (teacherSubjects || []).forEach((ts: any) => {
              const sub = subjectMap[ts.subject_id];
              if (sub) {
                childTeachersMap[ts.teacher_id] = {
                  child_name: classToStudentName[sub.class_id] || "Votre enfant",
                  subject_name: sub.name,
                  class_name: classToClassName[sub.class_id] || "Classe",
                };
              }
            });
          }

          // B. Professeurs ayant planifié des lives dans les classes des enfants
          const { data: liveSessions } = await supabaseAdmin
            .from("live_sessions")
            .select("teacher_id, class_id, title")
            .in("class_id", classIds);

          (liveSessions || []).forEach((ls: any) => {
            if (!childTeachersMap[ls.teacher_id]) {
              childTeachersMap[ls.teacher_id] = {
                child_name: classToStudentName[ls.class_id] || "Votre enfant",
                subject_name: ls.title || "Enseignant",
                class_name: classToClassName[ls.class_id] || "Classe",
              };
            }
          });
        }
      }
    }

    const formatted = (profiles || []).map((p: any) => {
      const isChildTeacher = !!childTeachersMap[p.id];
      const childTeacherInfo = childTeachersMap[p.id];

      return {
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        role: p.role,
        avatar_url: p.avatar_url,
        class_name: isChildTeacher
          ? `${childTeacherInfo.subject_name} • ${childTeacherInfo.class_name}`
          : classMap[p.id] || (p.role === "admin" || p.role === "super_admin" ? "Direction & Administration" : undefined),
        is_child_teacher: isChildTeacher,
        child_name: childTeacherInfo?.child_name,
        subject_name: childTeacherInfo?.subject_name,
      };
    });

    // Si Parent : Trier les professeurs de ses enfants et l'administration en tête de liste
    if (profile.role === "parent") {
      formatted.sort((a, b) => {
        if (a.is_child_teacher && !b.is_child_teacher) return -1;
        if (!a.is_child_teacher && b.is_child_teacher) return 1;
        if ((a.role === "admin" || a.role === "super_admin") && b.role !== "admin" && b.role !== "super_admin") return -1;
        if ((b.role === "admin" || b.role === "super_admin") && a.role !== "admin" && a.role !== "super_admin") return 1;
        return a.first_name.localeCompare(b.first_name);
      });
    }

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error("fetchUserDirectoryAction exception:", error);
    return { success: false, data: [], error: error?.message };
  }
}

// 2. Récupérer les classes et matières pour la création de salon
export async function fetchAvailableClassesAndSubjectsAction() {
  try {
    await verifyAuth();
    const supabaseAdmin = createAdminClient();

    const { data: classesData } = await supabaseAdmin
      .from("classes")
      .select("id, name, level, cycle")
      .order("name", { ascending: true });

    const { data: subjectsData } = await supabaseAdmin
      .from("subjects")
      .select("id, name, class_id")
      .order("name", { ascending: true });

    return {
      success: true,
      classes: classesData || [],
      subjects: subjectsData || [],
    };
  } catch (error: any) {
    return { success: false, classes: [], subjects: [], error: error?.message };
  }
}

// 3. Récupérer le nombre total de messages non lus de l'utilisateur
export async function fetchTotalUnreadMessagesCountAction(): Promise<{
  success: boolean;
  unreadCount: number;
}> {
  try {
    const { user } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    const { data: participations } = await supabaseAdmin
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      return { success: true, unreadCount: 0 };
    }

    const convIds = participations.map((p) => p.conversation_id);
    const { data: messages } = await supabaseAdmin
      .from("chat_messages")
      .select("conversation_id, created_at, sender_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id);

    const partMap = new Map(participations.map((p) => [p.conversation_id, p.last_read_at || "1970-01-01T00:00:00Z"]));
    let unreadCount = 0;
    (messages || []).forEach((m) => {
      const lastRead = partMap.get(m.conversation_id) || "1970-01-01T00:00:00Z";
      if (m.created_at > lastRead) unreadCount++;
    });

    return { success: true, unreadCount };
  } catch {
    return { success: false, unreadCount: 0 };
  }
}

// Initialiser automatiquement une discussion d'accueil avec l'Administration pour les Parents
async function ensureParentWelcomeConversation(supabaseAdmin: any, parentId: string, parentProfile: any) {
  try {
    // 1. Trouver un administrateur / super_admin actif
    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("role", ["super_admin", "admin"])
      .order("created_at", { ascending: true })
      .limit(1);

    const admin = adminProfiles?.[0];
    if (!admin) return;

    // 2. Vérifier si une conversation directe existe déjà entre ce parent et l'admin
    const { data: existingParts } = await supabaseAdmin
      .from("chat_participants")
      .select("conversation_id")
      .eq("user_id", parentId);

    if (existingParts && existingParts.length > 0) {
      const convIds = existingParts.map((p: any) => p.conversation_id);
      const { data: adminParts } = await supabaseAdmin
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", admin.id)
        .in("conversation_id", convIds);

      if (adminParts && adminParts.length > 0) {
        // Une conversation existe déjà avec l'administration
        return;
      }
    }

    // 3. Récupérer les noms des enfants pour personnaliser le message d'accueil
    const { data: parentStudents } = await supabaseAdmin
      .from("parent_students")
      .select("student_id, profiles:student_id(first_name, last_name)")
      .eq("parent_id", parentId);

    const childNames = (parentStudents || [])
      .map((ps: any) => ps.profiles?.first_name)
      .filter(Boolean)
      .join(", ");

    const welcomeContent = childNames
      ? `Bonjour et bienvenue sur votre Espace Parent Mon École En Ligne ! 👋\n\nL'équipe administrative et les enseignants de ${childNames} sont à votre entière disposition pour vous accompagner.\n\nN'hésitez pas à nous écrire directement ici pour toute question concernant la scolarité, les cours ou l'emploi du temps.`
      : `Bonjour et bienvenue sur votre Espace Parent Mon École En Ligne ! 👋\n\nL'équipe administrative et pédagogique est à votre entière disposition pour répondre à toutes vos questions concernant la scolarité de vos enfants.\n\nN'hésitez pas à nous écrire directement ici si vous avez la moindre interrogation.`;

    // 4. Créer la conversation directe 1-à-1
    const { data: newConv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .insert({
        type: "direct",
        title: "Direction & Administration Scolaire",
        created_by: admin.id,
      })
      .select()
      .single();

    if (convErr || !newConv) return;

    // 5. Associer les 2 participants
    await supabaseAdmin.from("chat_participants").insert([
      { conversation_id: newConv.id, user_id: admin.id, last_read_at: new Date().toISOString() },
      { conversation_id: newConv.id, user_id: parentId, last_read_at: "1970-01-01T00:00:00Z" },
    ]);

    // 6. Insérer le message de bienvenue officiel
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: newConv.id,
      sender_id: admin.id,
      content: welcomeContent,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("ensureParentWelcomeConversation error:", err);
  }
}

// Nettoyage et fusion automatique des salons en doublon
async function cleanupDuplicateConversations(supabaseAdmin: any) {
  try {
    const { data: allConvs } = await supabaseAdmin
      .from("chat_conversations")
      .select("id, type, title, class_id, created_at")
      .order("created_at", { ascending: true });

    if (!allConvs || allConvs.length === 0) return;

    const seenKeys = new Set<string>();
    const duplicateIds: string[] = [];

    for (const c of allConvs) {
      let key = "";
      const titleClean = (c.title || "").trim();

      if (titleClean.includes("Annonces Officielles de l'École — Parents")) {
        key = `parent_announcements_singleton`;
      } else if (c.class_id && titleClean.includes("Équipe Pédagogique")) {
        key = `teachers_team_${c.class_id}`;
      }

      if (key) {
        if (seenKeys.has(key)) {
          duplicateIds.push(c.id);
        } else {
          seenKeys.add(key);
        }
      }
    }

    if (duplicateIds.length > 0) {
      console.log(`[Deduplication] Nettoyage de ${duplicateIds.length} conversations en doublon...`);
      await supabaseAdmin.from("chat_conversations").delete().in("id", duplicateIds);
    }
  } catch (err) {
    console.warn("cleanupDuplicateConversations warning:", err);
  }
}

// Initialiser automatiquement le canal d'annonces officiel pour les Parents
async function ensureParentAnnouncementsChannel(supabaseAdmin: any, parentId?: string) {
  try {
    // 1. Chercher si le canal d'annonces parents existe déjà (par titre)
    const { data: existing } = await supabaseAdmin
      .from("chat_conversations")
      .select("id, title")
      .ilike("title", "%Annonces Officielles de l'École — Parents%")
      .limit(1);

    let channelId = existing?.[0]?.id;

    if (!channelId) {
      const { data: adminProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("role", ["super_admin", "admin"])
        .order("created_at", { ascending: true })
        .limit(1);

      const admin = adminProfiles?.[0];
      if (!admin) return;

      const { data: created, error } = await supabaseAdmin
        .from("chat_conversations")
        .insert({
          type: "announcement",
          title: "📢 Annonces Officielles de l'École — Parents",
          created_by: admin.id,
        })
        .select("id")
        .single();

      if (error || !created) return;
      channelId = created.id;

      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: channelId,
        sender_id: admin.id,
        content: "📢 Bienvenue sur le canal officiel d'annonces de l'école destiné aux parents d'élèves. Vous y retrouverez les communications administratives importantes, les dates clés et les informations officielles.",
      });
    }

    if (parentId && channelId) {
      await supabaseAdmin.from("chat_participants").upsert(
        { conversation_id: channelId, user_id: parentId, last_read_at: "1970-01-01T00:00:00Z" },
        { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
      );
    }
  } catch (err) {
    console.warn("ensureParentAnnouncementsChannel error:", err);
  }
}

// Initialiser automatiquement les salons d'équipe pédagogique par classe pour les professeurs
async function ensureTeacherTeamChannels(supabaseAdmin: any, teacherId?: string) {
  try {
    const { data: classes } = await supabaseAdmin.from("classes").select("id, name");
    if (!classes || classes.length === 0) return;

    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["super_admin", "admin"]);
    const adminIds = (adminProfiles || []).map((a: any) => a.id);

    for (const cl of classes) {
      // Chercher si le salon existe déjà
      const { data: existing } = await supabaseAdmin
        .from("chat_conversations")
        .select("id")
        .eq("class_id", cl.id)
        .ilike("title", `%Équipe Pédagogique%`)
        .limit(1);

      let teamConvId = existing?.[0]?.id;

      if (!teamConvId) {
        const creatorId = adminIds[0] || teacherId;
        if (!creatorId) continue;

        const { data: created } = await supabaseAdmin
          .from("chat_conversations")
          .insert({
            type: "teachers_team",
            title: `🧑‍🏫 Équipe Pédagogique — ${cl.name}`,
            class_id: cl.id,
            created_by: creatorId,
          })
          .select("id")
          .single();

        if (!created) continue;
        teamConvId = created.id;

        await supabaseAdmin.from("chat_messages").insert({
          conversation_id: teamConvId,
          sender_id: creatorId,
          content: `Bienvenue dans l'espace de concertation pédagogique pour la classe de ${cl.name}. Cet espace réservé aux enseignants permet d'échanger sur la progression et le suivi des élèves.`,
        });
      }

      const { data: subjects } = await supabaseAdmin
        .from("subjects")
        .select("id")
        .eq("class_id", cl.id);
      const subjectIds = (subjects || []).map((s: any) => s.id);

      let teacherIds: string[] = [];
      if (subjectIds.length > 0) {
        const { data: teacherSubs } = await supabaseAdmin
          .from("teacher_subjects")
          .select("teacher_id")
          .in("subject_id", subjectIds);
        teacherIds = (teacherSubs || []).map((ts: any) => ts.teacher_id).filter(Boolean);
      }

      const allMembers = Array.from(new Set([...adminIds, ...teacherIds]));
      if (allMembers.length > 0 && teamConvId) {
        const rows = allMembers.map((uid) => ({
          conversation_id: teamConvId,
          user_id: uid,
        }));
        await supabaseAdmin.from("chat_participants").upsert(rows, {
          onConflict: "conversation_id,user_id",
          ignoreDuplicates: true,
        });
      }
    }
  } catch (err) {
    console.warn("ensureTeacherTeamChannels error:", err);
  }
}

// 4. Récupérer toutes les conversations de l'utilisateur avec calcul du non-lu
export async function fetchUserConversationsAction(): Promise<{
  success: boolean;
  data: ChatConversation[];
  error?: string;
}> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // 1. Nettoyage préventif des doublons éventuels
    await cleanupDuplicateConversations(supabaseAdmin);

    // 2. Synchronisation automatique des salons selon le rôle
    if (profile.role === "parent") {
      await ensureParentWelcomeConversation(supabaseAdmin, user.id, profile);
      await ensureParentAnnouncementsChannel(supabaseAdmin, user.id);
    } else if (profile.role === "prof") {
      await ensureTeacherTeamChannels(supabaseAdmin, user.id);
    } else if (profile.role === "admin" || profile.role === "super_admin") {
      await ensureParentAnnouncementsChannel(supabaseAdmin);
      await ensureTeacherTeamChannels(supabaseAdmin);
    }

    // Récupérer la classe de l'utilisateur si élève
    let userClassId: string | null = null;
    if (profile.role === "etudiant") {
      const { data: enrollment } = await supabaseAdmin
        .from("enrollments")
        .select("class_id")
        .eq("student_id", user.id)
        .maybeSingle();
      userClassId = enrollment?.class_id || null;
    }

    // Récupérer les participations de l'utilisateur
    const { data: myParticipations } = await supabaseAdmin
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    const directConvIds = (myParticipations || []).map((p: any) => p.conversation_id);
    const myPartMap = new Map<string, string>();
    (myParticipations || []).forEach((p: any) => {
      myPartMap.set(p.conversation_id, p.last_read_at || "1970-01-01T00:00:00Z");
    });

    // Récupérer toutes les conversations
    const { data: conversations, error } = await supabaseAdmin
      .from("chat_conversations")
      .select(`
        *,
        class:classes(id, name),
        subject:subjects(id, name),
        participants:chat_participants(user:profiles(id, first_name, last_name, role, avatar_url))
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: true, data: [] };
    }

    // Filtrer les conversations pertinentes
    const relevant = (conversations || []).filter((c: any) => {
      const titleClean = (c.title || "").trim();

      // 1. Direct message: l'utilisateur doit être participant
      if (c.type === "direct") {
        return directConvIds.includes(c.id);
      }

      // 2. Annonces dédiées aux parents
      const isParentAnnounce =
        c.channel_scope === "parent_announcements" ||
        titleClean.includes("Annonces Officielles de l'École — Parents");

      if (isParentAnnounce) {
        return profile.role === "parent" || profile.role === "admin" || profile.role === "super_admin";
      }

      // 3. Équipe pédagogique des professeurs
      const isTeachersTeam =
        c.channel_scope === "teachers_team" ||
        c.type === "teachers_team" ||
        titleClean.includes("Équipe Pédagogique");

      if (isTeachersTeam) {
        if (profile.role === "parent" || profile.role === "etudiant") return false;
        if (profile.role === "admin" || profile.role === "super_admin") return true;
        return directConvIds.includes(c.id);
      }

      // 4. Annonces globales de l'école
      if (c.type === "announcement" && !c.class_id) {
        if (profile.role === "parent") return false; // les parents ont leur canal dédié
        return true;
      }

      // 5. Salons de classe / matières
      if (c.class_id) {
        if (profile.role === "parent") return false;
        if (profile.role === "admin" || profile.role === "super_admin") return true;
        if (profile.role === "prof") return true;
        if (userClassId && c.class_id === userClassId) return true;
        return false;
      }

      return true;
    });

    // DÉDOUBLONNAGE EN MÉMOIRE STRICT
    const seenKeys = new Set<string>();
    const deduplicatedRelevant = relevant.filter((c: any) => {
      const cleanTitle = (c.title || "").trim();
      let uniqueKey = c.id;

      if (cleanTitle.includes("Annonces Officielles de l'École — Parents")) {
        uniqueKey = "parent_announcements_singleton";
      } else if (c.class_id && cleanTitle.includes("Équipe Pédagogique")) {
        uniqueKey = `teachers_team_${c.class_id}`;
      } else if (c.type === "direct" && c.participants) {
        const other = c.participants.find((p: any) => (p.user?.id || p.id) !== user.id);
        const otherId = other?.user?.id || other?.id;
        if (otherId) uniqueKey = `direct_${otherId}`;
      }

      if (seenKeys.has(uniqueKey)) return false;
      seenKeys.add(uniqueKey);
      return true;
    });

    // Récupérer tous les derniers messages et non-lus en 1 seule requête ultra-rapide (Batch SQL)
    const convIds = deduplicatedRelevant.map((c: any) => c.id);
    const lastMsgMap = new Map<string, any>();
    const unreadCountMap = new Map<string, number>();

    if (convIds.length > 0) {
      const { data: recentMessages } = await supabaseAdmin
        .from("chat_messages")
        .select("*, sender:profiles(id, first_name, last_name, role)")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      (recentMessages || []).forEach((m: any) => {
        if (!lastMsgMap.has(m.conversation_id)) {
          lastMsgMap.set(m.conversation_id, m);
        }
        const lastRead = myPartMap.get(m.conversation_id) || "1970-01-01T00:00:00Z";
        if (m.sender_id !== user.id && m.created_at > lastRead) {
          unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) || 0) + 1);
        }
      });
    }

    const formatted: ChatConversation[] = deduplicatedRelevant.map((c: any) => {
      let displayTitle = c.title;
      if (c.type === "direct" && c.participants) {
        const otherParticipant = c.participants.find((p: any) => (p.user?.id || p.id) !== user.id);
        if (otherParticipant?.user || otherParticipant) {
          const u = otherParticipant.user || otherParticipant;
          const roleLabel =
            u.role === "prof"
              ? "Professeur"
              : u.role === "admin" || u.role === "super_admin"
              ? "Direction & Administration"
              : u.role === "parent"
              ? "Parent"
              : "Élève";
          displayTitle = `✉️ ${u.first_name || ""} ${u.last_name || ""} (${roleLabel})`;
        }
      }

      const isParentAnnounce =
        c.channel_scope === "parent_announcements" ||
        (c.title || "").includes("Annonces Officielles de l'École — Parents");

      const isReadonly =
        (c.is_readonly_for_members || isParentAnnounce) &&
        profile.role !== "admin" &&
        profile.role !== "super_admin";

      return {
        id: c.id,
        type: c.type,
        title: displayTitle,
        class_id: c.class_id,
        subject_id: c.subject_id,
        created_by: c.created_by,
        created_at: c.created_at,
        updated_at: c.updated_at,
        class: c.class,
        subject: c.subject,
        channel_scope: c.channel_scope,
        is_readonly_for_members: isReadonly,
        last_message: lastMsgMap.get(c.id) || null,
        unread_count: unreadCountMap.get(c.id) || 0,
        participants: (c.participants || []).map((p: any) => p.user || p).filter(Boolean),
      };
    });

    return { success: true, data: formatted };
  } catch (error: any) {
    return { success: false, data: [], error: error?.message };
  }
}

// 5. Obtenir ou créer une conversation directe 1-à-1
export async function getOrCreateDirectConversationAction(targetUserId: string): Promise<{
  success: boolean;
  data?: ChatConversation;
  error?: string;
}> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    if (user.id === targetUserId) {
      return { success: false, error: "Impossible de créer une conversation avec soi-même." };
    }

    // Récupérer les informations du destinataire
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile) return { success: false, error: "Destinataire introuvable." };

    // Vérifier si une conversation directe existe déjà entre ces 2 utilisateurs
    const { data: myConvs } = await supabaseAdmin
      .from("chat_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    const myConvIds = (myConvs || []).map((p: any) => p.conversation_id);

    if (myConvIds.length > 0) {
      const { data: shared } = await supabaseAdmin
        .from("chat_participants")
        .select("conversation_id, chat_conversations(type)")
        .eq("user_id", targetUserId)
        .in("conversation_id", myConvIds);

      const existingDirect = (shared || []).find(
        (s: any) => s.chat_conversations?.type === "direct"
      );

      if (existingDirect) {
        // La conversation existe déjà
        const { data: conv } = await supabaseAdmin
          .from("chat_conversations")
          .select("*")
          .eq("id", existingDirect.conversation_id)
          .single();

        return { success: true, data: conv };
      }
    }

    // Créer une nouvelle conversation directe
    const targetName = `${targetProfile.first_name || ""} ${targetProfile.last_name || ""}`.trim();
    const myName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

    const { data: newConv, error: convError } = await supabaseAdmin
      .from("chat_conversations")
      .insert({
        type: "direct",
        title: `✉️ ${myName} & ${targetName}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !newConv) {
      return { success: false, error: convError?.message || "Erreur lors de la création." };
    }

    // Ajouter les deux participants
    await supabaseAdmin.from("chat_participants").insert([
      { conversation_id: newConv.id, user_id: user.id, last_read_at: new Date().toISOString() },
      { conversation_id: newConv.id, user_id: targetUserId, last_read_at: null },
    ]);

    // Message d'ouverture
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: newConv.id,
      sender_id: user.id,
      content: `👋 Bonjour ${targetName}, ouverture de notre discussion directe.`,
    });

    revalidatePath("/etudiant/messages");
    revalidatePath("/prof/messages");
    revalidatePath("/admin/messages");

    return { success: true, data: newConv };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 6. Créer un salon de classe ciblé (automatiquement partagé avec tous les élèves de la classe)
export async function createClassConversationAction(formData: {
  type: "announcement" | "subject_channel";
  title: string;
  classId: string;
  subjectId?: string;
  initialMessage?: string;
}) {
  try {
    const { user } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // 1. Récupérer le nom de la classe et de la matière pour un titre clair
    const { data: classData } = await supabaseAdmin
      .from("classes")
      .select("name")
      .eq("id", formData.classId)
      .single();

    let finalTitle = formData.title.trim();
    if (formData.subjectId) {
      const { data: subData } = await supabaseAdmin
        .from("subjects")
        .select("name")
        .eq("id", formData.subjectId)
        .single();
      if (subData && !finalTitle.includes(subData.name)) {
        finalTitle = `📚 Salon ${subData.name} — ${classData?.name || "Classe"}`;
      }
    }

    // 2. Créer le salon
    const { data: newConv, error: convError } = await supabaseAdmin
      .from("chat_conversations")
      .insert({
        type: formData.type,
        title: finalTitle,
        class_id: formData.classId,
        subject_id: formData.subjectId || null,
        created_by: user.id,
      })
      .select(`
        *,
        class:classes(id, name),
        subject:subjects(id, name)
      `)
      .single();

    if (convError || !newConv) {
      return { success: false, error: convError?.message || "Erreur de création du salon." };
    }

    // 3. Récupérer tous les élèves inscrits dans cette classe
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .eq("class_id", formData.classId);

    const studentIds = (enrollments || []).map((e: any) => e.student_id);

    // 4. Inscrire le créateur + tous les élèves comme participants
    const participantRows = [
      { conversation_id: newConv.id, user_id: user.id, last_read_at: new Date().toISOString() },
      ...studentIds.map((sid) => ({ conversation_id: newConv.id, user_id: sid, last_read_at: null })),
    ];

    await supabaseAdmin.from("chat_participants").upsert(participantRows, {
      onConflict: "conversation_id,user_id",
      ignoreDuplicates: true,
    });

    // 5. Message initial
    const welcomeMsg =
      formData.initialMessage?.trim() ||
      `Bienvenue dans le salon ${finalTitle}. Cet espace est dédié aux échanges de votre classe.`;

    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: newConv.id,
      sender_id: user.id,
      content: welcomeMsg,
    });

    // 6. Alerter tous les élèves de la classe qu'ils ont été ajoutés
    if (studentIds.length > 0) {
      await createBulkNotifications(studentIds, {
        type: "announcement",
        title: `📢 Vous avez été ajouté au Salon : ${finalTitle}`,
        message: welcomeMsg.slice(0, 100),
        link_url: "/etudiant/messages",
      });
    }

    revalidatePath("/etudiant/messages");
    revalidatePath("/prof/messages");
    revalidatePath("/admin/messages");

    return { success: true, data: newConv };
  } catch (error: any) {
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 7. Récupérer les messages d'une conversation façon Instagram (paginé, limit = 20 par défaut)
export async function fetchConversationMessagesAction(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<{
  success: boolean;
  data: ChatMessage[];
  hasMore: boolean;
  error?: string;
}> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // SÉCURITÉ : Vérifier l'autorisation d'accès au salon
    const hasAccess = await verifyConversationAccess(supabaseAdmin, conversationId, user.id, profile.role);
    if (!hasAccess) {
      return { success: false, data: [], hasMore: false, error: "Accès refusé : vous n'êtes pas autorisé à consulter cette conversation." };
    }

    const limit = options?.limit || 20;

    // A. Mettre à jour last_read_at de l'utilisateur actuel si c'est le chargement initial
    if (!options?.before) {
      await supabaseAdmin.from("chat_participants").upsert(
        {
          conversation_id: conversationId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );
    }

    // B. Récupérer le timestamp de lecture des autres participants
    const { data: otherParticipants } = await supabaseAdmin
      .from("chat_participants")
      .select("user_id, last_read_at")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id);

    let maxOtherLastRead = 0;
    (otherParticipants || []).forEach((p: any) => {
      if (p.last_read_at) {
        const time = new Date(p.last_read_at).getTime();
        if (time > maxOtherLastRead) maxOtherLastRead = time;
      }
    });

    // C. Requête paginée ultra-rapide (les limit derniers messages)
    let query = supabaseAdmin
      .from("chat_messages")
      .select(`
        *,
        sender:profiles(id, first_name, last_name, role, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (options?.before) {
      query = query.lt("created_at", options.before);
    }

    const { data, error } = await query;
    if (error) return { success: false, data: [], hasMore: false, error: error.message };

    const rawList = data || [];
    const hasMore = rawList.length > limit;
    const items = hasMore ? rawList.slice(0, limit) : rawList;

    // Remettre dans l'ordre chronologique croissant
    items.reverse();

    const msgIds = items.map((m: any) => m.id);
    const reactionsByMessage: Record<string, ChatMessageReaction[]> = {};

    if (msgIds.length > 0) {
      try {
        const { data: rawReactions } = await supabaseAdmin
          .from("chat_message_reactions")
          .select("message_id, user_id, emoji")
          .in("message_id", msgIds);

        if (rawReactions && rawReactions.length > 0) {
          const map: Record<string, Record<string, string[]>> = {};
          rawReactions.forEach((r: any) => {
            if (!map[r.message_id]) map[r.message_id] = {};
            if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = [];
            map[r.message_id][r.emoji].push(r.user_id);
          });

          Object.entries(map).forEach(([mId, emojiMap]) => {
            reactionsByMessage[mId] = Object.entries(emojiMap).map(([emoji, uIds]) => ({
              emoji,
              count: uIds.length,
              user_ids: uIds,
              has_reacted: uIds.includes(user.id),
            }));
          });
        }
      } catch (err) {
        console.warn("Reactions fetch warning:", err);
      }
    }

    const messages: ChatMessage[] = items.map((m: any) => {
      const isMe = m.sender_id === user.id;
      let isSeen = false;
      if (isMe) {
        const msgTime = new Date(m.created_at).getTime();
        isSeen = maxOtherLastRead > 0 && maxOtherLastRead >= msgTime;
      } else {
        isSeen = true;
      }

      return {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.content,
        attachment_url: m.attachment_url,
        attachment_name: m.attachment_name,
        created_at: m.created_at,
        sender: m.sender,
        is_seen: isSeen,
        status: isSeen ? ("read" as const) : ("delivered" as const),
        reactions: reactionsByMessage[m.id] || [],
      };
    });

    return { success: true, data: messages, hasMore };
  } catch (error: any) {
    return { success: false, data: [], hasMore: false, error: error?.message };
  }
}

// 7b. Ajouter ou retirer une réaction Emoji sur un message (Toggle Like / Reaction)
export async function toggleMessageReactionAction(
  messageId: string,
  emoji: string
): Promise<{
  success: boolean;
  data?: ChatMessageReaction[];
  error?: string;
}> {
  try {
    const { user } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // 1. Vérifier si l'utilisateur a déjà réagi avec cet emoji
    const { data: existing } = await supabaseAdmin
      .from("chat_message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("chat_message_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      await supabaseAdmin
        .from("chat_message_reactions")
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
    }

    // 2. Récupérer toutes les réactions agrégées à jour pour ce message
    const { data: allReactions } = await supabaseAdmin
      .from("chat_message_reactions")
      .select("user_id, emoji")
      .eq("message_id", messageId);

    const emojiMap: Record<string, string[]> = {};
    (allReactions || []).forEach((r: any) => {
      if (!emojiMap[r.emoji]) emojiMap[r.emoji] = [];
      emojiMap[r.emoji].push(r.user_id);
    });

    const aggregated: ChatMessageReaction[] = Object.entries(emojiMap).map(([em, uIds]) => ({
      emoji: em,
      count: uIds.length,
      user_ids: uIds,
      has_reacted: uIds.includes(user.id),
    }));

    return { success: true, data: aggregated };
  } catch (error: any) {
    console.error("toggleMessageReactionAction error:", error);
    return { success: false, error: error?.message || "Erreur lors de la réaction." };
  }
}

// 8. Envoyer un message dans une conversation avec ID stable dès la création
export async function sendMessageAction(formData: {
  id?: string;
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // SÉCURITÉ : Vérifier l'autorisation d'accès au salon
    const hasAccess = await verifyConversationAccess(supabaseAdmin, formData.conversationId, user.id, profile.role);
    if (!hasAccess) {
      return { success: false, error: "Accès refusé : vous n'avez pas l'autorisation d'écrire dans ce salon." };
    }

    // SÉCURITÉ : Vérifier le mode lecture seule pour les canaux d'annonces
    const { data: convInfo } = await supabaseAdmin
      .from("chat_conversations")
      .select("is_readonly_for_members, channel_scope")
      .eq("id", formData.conversationId)
      .single();

    if (
      (convInfo?.is_readonly_for_members || convInfo?.channel_scope === "parent_announcements") &&
      profile.role !== "admin" &&
      profile.role !== "super_admin"
    ) {
      return {
        success: false,
        error: "Ce canal officiel est réservé aux annonces de la direction en lecture seule.",
      };
    }

    // SÉCURITÉ : Assainissement strict et anti-injection
    const sanitizedContent = sanitizeInputText(formData.content || "");

    // MODÉRATION : Vérification des termes graves / insultes / harcèlement
    if (sanitizedContent) {
      const compliance = checkMessageCompliance(sanitizedContent);
      if (!compliance.isAllowed) {
        return {
          success: false,
          error: `⚠️ Message refusé : ${compliance.reason}`,
        };
      }
    }

    if (!sanitizedContent && !formData.attachmentUrl) {
      return { success: false, error: "Le message ne peut pas être vide." };
    }

    // Utiliser l'UUID stable généré par le client ou en créer un
    const messageId = formData.id || crypto.randomUUID();

    // A. Insérer le message avec son ID définitif
    const { data: inserted, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        id: messageId,
        conversation_id: formData.conversationId,
        sender_id: user.id,
        content: sanitizedContent || (formData.attachmentUrl ? "📎 Pièce jointe partagée" : ""),
        attachment_url: formData.attachmentUrl || null,
        attachment_name: formData.attachmentName ? sanitizeInputText(formData.attachmentName, 100) : null,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      console.error("Insert chat_messages error:", error);
      return { success: false, error: error?.message || "Erreur lors de l'envoi du message." };
    }

    const newMessage: ChatMessage = {
      ...inserted,
      sender: profile || {
        id: user.id,
        first_name: "Moi",
        last_name: "",
        role: "etudiant" as any,
        avatar_url: null,
      },
      is_seen: false,
      status: "sent",
    };

    // B. Mettre à jour l'horodatage et la lecture de façon atomique et non bloquante
    const nowIso = new Date().toISOString();
    Promise.all([
      supabaseAdmin
        .from("chat_conversations")
        .update({ updated_at: nowIso })
        .eq("id", formData.conversationId),
      supabaseAdmin
        .rpc("mark_conversation_read_monotonic", {
          p_conversation_id: formData.conversationId,
          p_user_id: user.id,
          p_read_at: nowIso,
        })
        .then((r) => {
          if (r.error) {
            return supabaseAdmin.from("chat_participants").upsert(
              { conversation_id: formData.conversationId, user_id: user.id, last_read_at: nowIso },
              { onConflict: "conversation_id,user_id" }
            );
          }
        }),
    ]).catch((err) => console.error("Background timestamp update error:", err));

    // Invalider les chemins de messagerie pour garantir des rechargements (F5) toujours frais
    try {
      revalidatePath("/etudiant/messages");
      revalidatePath("/prof/messages");
      revalidatePath("/admin/messages");
    } catch (e) {}

    return { success: true, data: newMessage };
  } catch (error: any) {
    console.error("sendMessageAction unexpected error:", error);
    return { success: false, error: error?.message || "Une erreur est survenue." };
  }
}

// 9. Marquer explicitement une conversation comme lue par l'utilisateur connecté (Monotone & Sécurisé)
export async function markConversationAsReadAction(conversationId: string): Promise<{ success: boolean }> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // SÉCURITÉ : Vérifier l'autorisation d'accès au salon
    const hasAccess = await verifyConversationAccess(supabaseAdmin, conversationId, user.id, profile.role);
    if (!hasAccess) return { success: false };

    const nowIso = new Date().toISOString();

    const rpcRes = await supabaseAdmin.rpc("mark_conversation_read_monotonic", {
      p_conversation_id: conversationId,
      p_user_id: user.id,
      p_read_at: nowIso,
    });

    if (rpcRes.error) {
      await supabaseAdmin.from("chat_participants").upsert(
        {
          conversation_id: conversationId,
          user_id: user.id,
          last_read_at: nowIso,
        },
        { onConflict: "conversation_id,user_id" }
      );
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

// 10. Supprimer un message façon Instagram (Unsend pour tout le monde)
export async function deleteMessageAction(messageId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    // Récupérer le message
    const { data: msg, error: fetchErr } = await supabaseAdmin
      .from("chat_messages")
      .select("id, conversation_id, sender_id")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) {
      return { success: false, error: "Message introuvable ou déjà supprimé." };
    }

    // Autorisation : L'auteur du message, ou un administrateur / professeur
    const isOwner = msg.sender_id === user.id;
    const isStaff = profile.role === "admin" || profile.role === "super_admin" || profile.role === "prof";

    if (!isOwner && !isStaff) {
      return { success: false, error: "Vous n'avez pas l'autorisation de supprimer ce message." };
    }

    // Suppression en base
    const { error: delErr } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    try {
      revalidatePath("/etudiant/messages");
      revalidatePath("/prof/messages");
      revalidatePath("/admin/messages");
    } catch (e) {}

    return { success: true, conversationId: msg.conversation_id };
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur lors de la suppression." };
  }
}

// 11. Supprimer ou quitter une conversation / salon façon Instagram
export async function deleteConversationAction(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, profile } = await verifyAuth();
    const supabaseAdmin = createAdminClient();

    const { data: conv, error: fetchErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (fetchErr || !conv) {
      return { success: false, error: "Discussion introuvable." };
    }

    // Autorisation :
    // - En direct : n'importe quel participant
    // - En salon / annonce : le créateur, un prof ou un admin
    if (conv.type === "direct") {
      const { data: part } = await supabaseAdmin
        .from("chat_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!part && profile.role !== "admin" && profile.role !== "super_admin") {
        return { success: false, error: "Vous ne participez pas à cette discussion." };
      }
    } else {
      const isCreator = conv.created_by === user.id;
      const isStaff = profile.role === "admin" || profile.role === "super_admin" || profile.role === "prof";
      if (!isCreator && !isStaff) {
        return { success: false, error: "Seuls les enseignants ou la direction peuvent supprimer ce salon." };
      }
    }

    // Suppression en cascade (chat_messages & chat_participants liés)
    const { error: delErr } = await supabaseAdmin
      .from("chat_conversations")
      .delete()
      .eq("id", conversationId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    try {
      revalidatePath("/etudiant/messages");
      revalidatePath("/prof/messages");
      revalidatePath("/admin/messages");
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur lors de la suppression de la discussion." };
  }
}



