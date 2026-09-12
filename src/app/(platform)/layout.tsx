import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformShell from "@/components/platform/PlatformShell";
import { Profile, Role } from "@/lib/types";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Récupérer le profil complet de l'utilisateur
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("PLATFORM LAYOUT PROFILE FETCH ERROR:", error);
  } else {
    console.log("PLATFORM LAYOUT FOUND PROFILE:", profile);
  }

  const userProfile: Profile = {
    id: user.id,
    role: (profile?.role as Role) || "etudiant",
    first_name: profile?.first_name || null,
    last_name: profile?.last_name || null,
    avatar_url: profile?.avatar_url || null,
    created_at: profile?.created_at || user.created_at,
    updated_at: profile?.updated_at || user.created_at,
    email: user.email,
  };

  return <PlatformShell user={userProfile}>{children}</PlatformShell>;
}
