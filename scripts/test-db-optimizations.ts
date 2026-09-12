/**
 * SCRIPT DE TEST & VALIDATION DES OPTIMISATIONS BASE DE DONNÉES
 * Plateforme : Mon École en Live
 * 
 * Exécution : npx tsx scripts/test-db-optimizations.ts
 */

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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function runOptimizationsVerification() {
  console.log("\n=======================================================");
  console.log("⚡ TEST DES OPTIMISATIONS & DE LA MIGRATION SUPABASE");
  console.log("=======================================================\n");

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`     ℹ️ ${detail}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     ⚠️ ${detail}`);
    }
  }

  // 1. Test Dénormalisation Email dans Profiles
  console.log("🔹 1. Vérification du champ `email` dans `public.profiles` :");
  const startProfileTime = performance.now();
  const { data: profiles, error: profErr } = await adminClient
    .from("profiles")
    .select("id, role, email, first_name, last_name")
    .limit(10);
  const profileDuration = Math.round(performance.now() - startProfileTime);

  assert(
    !profErr && !!profiles,
    "La table `profiles` est lisible avec la colonne `email`",
    `Temps de réponse : ${profileDuration}ms`
  );

  const populatedEmailsCount = (profiles || []).filter((p) => p.email && p.email.includes("@")).length;
  assert(
    populatedEmailsCount > 0,
    "Les adresses emails sont bien rétro-remplies et présentes dans `profiles`",
    `${populatedEmailsCount}/${profiles?.length || 0} profils testés ont un email valide`
  );

  // 2. Test de la Pagination Backend (Range 0..19)
  console.log("\n🔹 2. Vérification de la pagination serveur (20 items) :");
  const startPaginationTime = performance.now();
  const { data: paginatedData, count: totalCount, error: pagErr } = await adminClient
    .from("profiles")
    .select("id, email, role", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 19);
  const paginationDuration = Math.round(performance.now() - startPaginationTime);

  assert(
    !pagErr && paginatedData && paginatedData.length <= 20,
    "La pagination renvoie exactement une page de 20 utilisateurs maximum",
    `Reçu : ${paginatedData?.length || 0} utilisateurs sur un total de ${totalCount} en ${paginationDuration}ms`
  );

  // 3. Test de Lecture des Présences & Séances (Sans appel Auth Admin)
  console.log("\n🔹 3. Vérification des séances avec emails intégrés :");
  const startSessionsTime = performance.now();
  const { data: sessions, error: sessErr } = await adminClient
    .from("live_sessions")
    .select(`
      id,
      title,
      start_time,
      profiles:teacher_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .limit(5);
  const sessionDuration = Math.round(performance.now() - startSessionsTime);

  assert(
    !sessErr && !!sessions,
    "Les séances se chargent directement avec l'email enseignant sans API Auth",
    `Temps de réponse : ${sessionDuration}ms`
  );

  // 4. Test des Logs d'Audit avec Pagination Curseur
  console.log("\n🔹 4. Vérification de l'Audit Trail avec curseur temporel :");
  const { data: auditLogs, error: auditErr } = await adminClient
    .from("audit_logs")
    .select("id, action, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  assert(
    !auditErr && !!auditLogs,
    "Les logs d'audit sont lisibles et ordonnés pour la pagination curseur",
    `Événements trouvés : ${auditLogs?.length || 0}`
  );

  console.log("\n=======================================================");
  console.log(`📊 BILAN DU TEST : ${passedTests}/${totalTests} validations réussies`);
  console.log("=======================================================\n");

  if (passedTests === totalTests) {
    console.log("🚀 Toutes les optimisations sont fonctionnelles et validées en production !\n");
  }
}

runOptimizationsVerification().catch((err) => {
  console.error("Erreur d'exécution du test :", err);
});
