import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "submissions";
    const assignmentId = (formData.get("assignmentId") as string) || "general";

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Assurer que le bucket assignments-files existe
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "assignments-files");
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket("assignments-files", { public: true });
    }

    // 2. Nettoyage du nom de fichier
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}_${cleanFileName}`;
    const filePath = `${folder}/${assignmentId}/${uniqueFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Téléversement dans le bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("assignments-files")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    // 4. Récupérer l'URL publique
    const { data: urlData } = supabaseAdmin.storage
      .from("assignments-files")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      filePath: uploadData.path,
    });
  } catch (error: any) {
    console.error("API assignments upload error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur lors du téléversement." },
      { status: 500 }
    );
  }
}
