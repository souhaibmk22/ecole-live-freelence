import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersClientView from "./UsersClientView";
import { Profile, Role } from "@/lib/types";

export default async function UtilisateursPage() {
  const supabase = await createServerClient();

  // 1. Récupérer l'utilisateur courant pour connaître ses droits
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser?.id || "")
    .single();

  const callerRole = (callerProfile?.role as Role) || "etudiant";

  // 2. Récupérer la liste des profils (filtrée selon le rôle de l'appelant)
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Si l'utilisateur est un simple admin, il voit les profs, les étudiants et les parents
  if (callerRole === "admin") {
    query = query.in("role", ["prof", "etudiant", "parent"]);
  }

  const { data: profilesData } = await query;

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, name, cycle, level")
    .order("name");

  const profiles: Profile[] = (profilesData || []).map((p) => ({
    id: p.id,
    role: p.role as Role,
    first_name: p.first_name,
    last_name: p.last_name,
    phone: p.phone || null,
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    updated_at: p.updated_at,
    email: p.email || "",
  }));

  const allClasses = (classesData || []).map((c) => ({
    id: c.id,
    name: c.name,
    cycle: c.cycle,
    level: c.level,
  }));

  const isServiceRoleKeyMissing = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <UsersClientView
      initialProfiles={profiles}
      callerRole={callerRole}
      currentUserId={currentUser?.id || ""}
      isServiceRoleKeyMissing={isServiceRoleKeyMissing}
      allClasses={allClasses}
    />
  );
}
