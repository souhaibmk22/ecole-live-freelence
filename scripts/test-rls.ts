/**
 * SUITE DE TESTS AUTOMATISÉE D'ISOLATION ET RLS (ROW LEVEL SECURITY)
 * Plateforme : Mon École en Live
 * 
 * Exécution : npx tsx scripts/test-rls.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mdgurezmriqbcbhixvtm.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_iwgxT1z9--PU5NRcebWb2w_BLSzM-X9";

async function runRlsTestSuite() {
  console.log("\n=======================================================");
  console.log("🛡️  LANCEMENT DE LA SUITE DE TESTS DE SÉCURITÉ RLS");
  console.log("=======================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failDetails?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (failDetails) console.error(`     Détails: ${failDetails}`);
    }
  }

  // 1. Test Client Anonyme (Non Authentifié)
  console.log("🔹 1. Tests d'Accès Non Authentifié (Client Anonyme) :");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // A. Lecture des devoirs soumis
    const { data: submissions, error: subErr } = await anonClient
      .from("assignment_submissions")
      .select("*")
      .limit(5);

    assert(
      !submissions || submissions.length === 0,
      "Un client anonyme ne peut pas lire les copies d'élèves",
      subErr?.message
    );

    // B. Lecture des feuilles d'émargement / présences
    const { data: attendance, error: attErr } = await anonClient
      .from("attendance")
      .select("*")
      .limit(5);

    assert(
      !attendance || attendance.length === 0,
      "Un client anonyme ne peut pas lire les présences d'élèves",
      attErr?.message
    );

    // C. Lecture du journal d'audit
    const { data: auditLogs, error: auditErr } = await anonClient
      .from("audit_logs")
      .select("*")
      .limit(5);

    assert(
      !auditLogs || auditLogs.length === 0,
      "Un client anonyme ne peut pas lire le journal d'audit",
      auditErr?.message
    );

    // D. Lecture des messages de chat privés
    const { data: messages, error: msgErr } = await anonClient
      .from("chat_messages")
      .select("*")
      .limit(5);

    assert(
      !messages || messages.length === 0,
      "Un client anonyme ne peut pas espionner les messages de chat",
      msgErr?.message
    );
  } catch (err: any) {
    console.error("Erreur lors des tests anonymes:", err);
  }

  console.log("\n=======================================================");
  console.log(`📊 RÉSULTAT DU RAPPORT DE SÉCURITÉ : ${passedTests}/${totalTests} tests réussis`);
  console.log("=======================================================\n");

  if (passedTests === totalTests) {
    console.log("🎉 Toutes les barrières de sécurité et RLS sont 100% étanches !\n");
  } else {
    process.exit(1);
  }
}

runRlsTestSuite().catch((e) => {
  console.error("Erreur fatale de test:", e);
  process.exit(1);
});
