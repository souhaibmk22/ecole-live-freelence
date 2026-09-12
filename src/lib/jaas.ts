"use server";

import * as jose from "jose";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function getJaasJwtTokenAction(formData: {
  roomName: string;
  isModerator?: boolean;
}) {
  try {
    const jaasAppId = process.env.NEXT_PUBLIC_JAAS_APP_ID || "vpaas-magic-cookie-2b9ab6e8a0f447c8824038696d33de34";
    const apiKeyId = process.env.JAAS_API_KEY_ID;
    const privateKeyPem = process.env.JAAS_PRIVATE_KEY;

    if (!apiKeyId || !privateKeyPem) {
      // Pas de clé privée configurée : renvoie null (mode JaaS sans JWT)
      return { success: true, token: null };
    }

    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    const userName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
      : user?.email || "Participant";

    const isMod = formData.isModerator ?? false;

    // Normaliser la clé privée
    const formattedPrivateKey = privateKeyPem.replace(/\\n/g, "\n");
    const privateKey = await jose.importPKCS8(formattedPrivateKey, "RS256");

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 4 * 60 * 60; // Valide 4 heures

    const token = await new jose.SignJWT({
      aud: "jitsi",
      iss: "chat",
      sub: jaasAppId,
      room: "*",
      context: {
        user: {
          id: user?.id || "guest",
          name: userName,
          email: user?.email || "",
          avatar: "",
          moderator: isMod ? "true" : "false",
        },
        features: {
          recording: isMod ? "true" : "false",
          livestreaming: isMod ? "true" : "false",
          transcription: "false",
          "outbound-call": "false",
        },
      },
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: `${jaasAppId}/${apiKeyId}`,
        typ: "JWT",
      })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(exp)
      .sign(privateKey);

    return { success: true, token };
  } catch (error: any) {
    console.warn("JaaS JWT generation warning:", error?.message);
    return { success: false, error: error?.message, token: null };
  }
}
