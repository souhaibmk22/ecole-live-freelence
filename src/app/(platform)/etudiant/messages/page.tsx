import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ChatClientView from "@/components/platform/ChatClientView";
import { fetchUserConversationsAction } from "@/app/(platform)/messages/actions";
import { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Messagerie & Salons de Classe | Mon École en Live",
  description: "Échangez avec vos professeurs et posez vos questions sur les devoirs.",
};

export default async function EtudiantMessagesPage() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "etudiant") redirect("/login");

  // Pré-chargement des conversations sur le serveur pour affichage immédiat à 0ms
  const convRes = await fetchUserConversationsAction().catch(() => ({ success: false, data: [] }));

  return (
    <ChatClientView
      currentUser={profile as Profile}
      initialConversations={convRes.data || []}
    />
  );
}
