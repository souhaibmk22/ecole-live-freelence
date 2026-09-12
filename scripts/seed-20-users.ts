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

const usersToSeed = [
  // 12 Étudiants
  { first_name: "Adam", last_name: "Benali", role: "etudiant", email: "adam.benali@monecoleenlive.fr", phone: "+33611223344" },
  { first_name: "Inès", last_name: "Lemoine", role: "etudiant", email: "ines.lemoine@monecoleenlive.fr", phone: "+33622334455" },
  { first_name: "Noah", last_name: "Dubois", role: "etudiant", email: "noah.dubois@monecoleenlive.fr", phone: "+33633445566" },
  { first_name: "Léa", last_name: "Moreau", role: "etudiant", email: "lea.moreau@monecoleenlive.fr", phone: "+33644556677" },
  { first_name: "Youssef", last_name: "Mansouri", role: "etudiant", email: "youssef.mansouri@monecoleenlive.fr", phone: "+33655667788" },
  { first_name: "Camille", last_name: "Roux", role: "etudiant", email: "camille.roux@monecoleenlive.fr", phone: "+33666778899" },
  { first_name: "Hugo", last_name: "Fournier", role: "etudiant", email: "hugo.fournier@monecoleenlive.fr", phone: "+33677889900" },
  { first_name: "Sarah", last_name: "Lambert", role: "etudiant", email: "sarah.lambert@monecoleenlive.fr", phone: "+33688990011" },
  { first_name: "Enzo", last_name: "Girard", role: "etudiant", email: "enzo.girard@monecoleenlive.fr", phone: "+33699001122" },
  { first_name: "Chloé", last_name: "Bonnet", role: "etudiant", email: "chloe.bonnet@monecoleenlive.fr", phone: "+33600112233" },
  { first_name: "Mehdi", last_name: "Zidane", role: "etudiant", email: "mehdi.zidane@monecoleenlive.fr", phone: "+33612345678" },
  { first_name: "Emma", last_name: "Fontaine", role: "etudiant", email: "emma.fontaine@monecoleenlive.fr", phone: "+33623456789" },

  // 4 Professeurs
  { first_name: "Marc", last_name: "Gauthier", role: "prof", email: "marc.gauthier@monecoleenlive.fr", phone: "+33634567890" },
  { first_name: "Fatima", last_name: "Nadir", role: "prof", email: "fatima.nadir@monecoleenlive.fr", phone: "+33645678901" },
  { first_name: "Thomas", last_name: "Lefebvre", role: "prof", email: "thomas.lefebvre@monecoleenlive.fr", phone: "+33656789012" },
  { first_name: "Nathalie", last_name: "Guerin", role: "prof", email: "nathalie.guerin@monecoleenlive.fr", phone: "+33667890123" },

  // 4 Parents
  { first_name: "Karim", last_name: "Benali", role: "parent", email: "karim.benali@monecoleenlive.fr", phone: "+33678901234" },
  { first_name: "Valérie", last_name: "Lemoine", role: "parent", email: "valerie.lemoine@monecoleenlive.fr", phone: "+33689012345" },
  { first_name: "Patrick", last_name: "Dubois", role: "parent", email: "patrick.dubois@monecoleenlive.fr", phone: "+33690123456" },
  { first_name: "Samira", last_name: "Mansouri", role: "parent", email: "samira.mansouri@monecoleenlive.fr", phone: "+33601234567" },
];

async function seedUsers() {
  console.log("🌱 Début de l'ajout des 20 utilisateurs pour le test de pagination...\n");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let successCount = 0;

  for (const u of usersToSeed) {
    try {
      // 1. Créer dans auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "TempPassword2027!",
        email_confirm: true,
        user_metadata: {
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          phone: u.phone,
        },
      });

      let userId = authData?.user?.id;

      if (authError) {
        if (authError.message.includes("already exists") || authError.message.includes("unique constraint")) {
          // Trouver l'utilisateur existant
          const { data: existingList } = await supabase.auth.admin.listUsers();
          const found = existingList?.users.find((eu) => eu.email === u.email);
          userId = found?.id;
        } else {
          console.error(`❌ Erreur auth pour ${u.email}:`, authError.message);
          continue;
        }
      }

      if (userId) {
        // 2. Mettre à jour profiles avec email
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          email: u.email,
          phone: u.phone,
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error(`⚠️ Erreur profile pour ${u.email}:`, profileError.message);
        } else {
          console.log(`  ✅ [${u.role.toUpperCase()}] ${u.first_name} ${u.last_name} (${u.email})`);
          successCount++;
        }
      }
    } catch (err: any) {
      console.error(`❌ Exception pour ${u.email}:`, err.message);
    }
  }

  console.log(`\n🎉 Succès : ${successCount}/20 utilisateurs créés ou synchronisés avec succès !`);
}

seedUsers();
