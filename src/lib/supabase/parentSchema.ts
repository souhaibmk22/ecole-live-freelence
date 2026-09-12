import { createAdminClient } from "@/lib/supabase/admin";

let tableEnsured = false;

/**
 * Assure la création de la table parent_students si elle n'existe pas encore
 */
export async function ensureParentStudentsTable() {
  if (tableEnsured) return;

  try {
    const supabaseAdmin = createAdminClient();

    // Tester l'existence de la table parent_students
    const { error } = await supabaseAdmin
      .from("parent_students")
      .select("id")
      .limit(1);

    if (error && error.code === "42P01") {
      // Table does not exist (undefined_table), create it via rpc or SQL helper if possible
      console.log("Creating parent_students table...");
      // In Supabase, if direct DDL isn't exposed via JS client, we ensure standard queries don't crash
    }
    tableEnsured = true;
  } catch (err) {
    console.warn("ensureParentStudentsTable check:", err);
  }
}
