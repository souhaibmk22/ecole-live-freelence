import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    const testUsers = [
      {
        email: "superadmin@monecoleenlive.fr",
        password: "SuperAdmin2027!",
        first_name: "Directeur",
        last_name: "Général",
        role: "super_admin",
      },
      {
        email: "admin@monecoleenlive.fr",
        password: "Admin2027!",
        first_name: "Responsable",
        last_name: "Pédagogique",
        role: "admin",
      },
      {
        email: "prof@monecoleenlive.fr",
        password: "Prof2027!",
        first_name: "Claire",
        last_name: "Dupont",
        role: "prof",
      },
      {
        email: "eleve@monecoleenlive.fr",
        password: "Eleve2027!",
        first_name: "Lucas",
        last_name: "Martin",
        role: "etudiant",
      },
      {
        email: "parent@monecoleenlive.fr",
        password: "Parent2027!",
        first_name: "Sophie",
        last_name: "Martin",
        role: "parent",
      },
    ];

    const results = [];

    // Récupérer la liste des utilisateurs existants
    const { data: existingUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUsers = existingUsersData?.users || [];

    for (const u of testUsers) {
      const found = existingUsers.find((eu) => eu.email?.toLowerCase() === u.email.toLowerCase());

      let userId = found?.id;

      if (found) {
        // Mettre à jour le mot de passe et confirmer l'email
        const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
          password: u.password,
          email_confirm: true,
          user_metadata: {
            first_name: u.first_name,
            last_name: u.last_name,
            role: u.role,
          },
        });
        if (updateErr) {
          results.push({ email: u.email, status: "update_error", error: updateErr.message });
        } else {
          results.push({ email: u.email, status: "password_updated" });
        }
      } else {
        // Créer l'utilisateur via l'API native Supabase Auth
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: {
            first_name: u.first_name,
            last_name: u.last_name,
            role: u.role,
          },
        });

        if (createErr) {
          results.push({ email: u.email, status: "create_error", error: createErr.message });
        } else {
          userId = created.user?.id;
          results.push({ email: u.email, status: "created_successfully" });
        }
      }

      // Synchroniser le profil dans public.profiles
      if (userId) {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            role: u.role,
            first_name: u.first_name,
            last_name: u.last_name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Comptes de test initialisés et synchronisés avec l'API Supabase Auth !",
      details: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur serveur",
      },
      { status: 500 }
    );
  }
}
