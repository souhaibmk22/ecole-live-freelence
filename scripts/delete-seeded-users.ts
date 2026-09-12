import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Charger les variables depuis .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mdgurezmriqbcbhixvtm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const emailsToDelete = [
  "adam.benali@monecoleenlive.fr",
  "ines.lemoine@monecoleenlive.fr",
  "noah.dubois@monecoleenlive.fr",
  "lea.moreau@monecoleenlive.fr",
  "youssef.mansouri@monecoleenlive.fr",
  "camille.roux@monecoleenlive.fr",
  "hugo.fournier@monecoleenlive.fr",
  "sarah.lambert@monecoleenlive.fr",
  "enzo.girard@monecoleenlive.fr",
  "chloe.bonnet@monecoleenlive.fr",
  "mehdi.zidane@monecoleenlive.fr",
  "emma.fontaine@monecoleenlive.fr",
  "marc.gauthier@monecoleenlive.fr",
  "fatima.nadir@monecoleenlive.fr",
  "thomas.lefebvre@monecoleenlive.fr",
  "nathalie.guerin@monecoleenlive.fr",
  "karim.benali@monecoleenlive.fr",
  "valerie.lemoine@monecoleenlive.fr",
  "patrick.dubois@monecoleenlive.fr",
  "samira.mansouri@monecoleenlive.fr",
];

async function deleteSeededUsers() {
  console.log("🗑️ Début de la suppression des 20 utilisateurs de test...\n");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return;
  }

  let deletedCount = 0;

  for (const email of emailsToDelete) {
    const user = (usersData?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      // 1. Supprimer le profil
      await supabase.from("profiles").delete().eq("id", user.id);
      
      // 2. Supprimer de auth.users
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`❌ Erreur suppression auth pour ${email}:`, delErr.message);
      } else {
        console.log(`  🗑️ Supprimé : ${email}`);
        deletedCount++;
      }
    } else {
      // Nettoyage éventuel du profil orphelin
      await supabase.from("profiles").delete().eq("email", email);
    }
  }

  console.log(`\n🎉 Nettoyage terminé : ${deletedCount} utilisateurs de test ont été supprimés.`);
}

deleteSeededUsers();
