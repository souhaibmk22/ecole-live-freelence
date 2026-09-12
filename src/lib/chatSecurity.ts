/**
 * Utilitaires de Sécurité, Détection de Liens et Modération Pédagogique
 * Mon École en Live
 */

// 1. Assainissement strict des entrées utilisateur (Anti-XSS & Payload Flooding)
export function sanitizeInputText(input: string, maxLength = 3000): string {
  if (!input) return "";

  // Normalisation Unicode NFC
  let cleaned = input.normalize("NFC");

  // Supprimer les caractères de contrôle invisibles / nuls dangereux (sauf retours à la ligne et tabulations)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

  // Éliminer les balises script/html injectables pour stocker du texte pur
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Limite de taille
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned.trim();
}

// 2. Dictionnaire des termes graves, insultes, incitations à la haine et harcèlement
const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Insultes et vulgarités françaises
  { pattern: /\b(fdp|fils\s*de\s*pute|ntm|nique\s*ta\s*m[eèé]re|nique|baise|bais[eé]r)\b/i, label: "Propos injurieux graves" },
  { pattern: /\b(connard|connasse|conard|salope|salop|pute|putain|encul[eé]|enculeur|batard|bâtard|bouffon|trou\s*du\s*cul)\b/i, label: "Injure ou vulgarité" },
  { pattern: /\b(ta\s*gueule|ferme\s*ta\s*gueule|tg|creve|cr[eèé]ve)\b/i, label: "Comportement agressif" },
  { pattern: /\b(pd|pede|p[eé]d[eé]|tapette|gouine|negre|n[eèé]gre|bougnoul)\b/i, label: "Propos discriminatoires ou haineux" },
  { pattern: /\b(suicide|suicide[\s-]*toi|tue[\s-]*toi|va\s*te\s*pendre|je\s*vais\s*te\s*tuer)\b/i, label: "Menace ou incitation à la violence" },

  // Insultes translittérées / argot
  { pattern: /\b(kahba|qahba|zeb|zob|nik\s*mouk|nik\s*mok|zebi|sharmouta|charmouta)\b/i, label: "Injure grave" },

  // Insultes anglaises
  { pattern: /\b(fuck|fucking|bitch|asshole|motherfucker|dickhead|cunt|slut|whore|faggot)\b/i, label: "Injure en langue étrangère" },
];

/**
 * 3. Vérification de conformité du message avec la charte scolaire
 */
export function checkMessageCompliance(text: string): {
  isAllowed: boolean;
  reason?: string;
  matchedLabel?: string;
} {
  if (!text) return { isAllowed: true };

  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents pour tester les variantes
    .replace(/[@$*!0-9_.-]/g, (char) => {
      // Remplacer les ruses de masquage courantes (@ -> a, 0 -> o, 1 -> i, 3 -> e, 5 -> s, $ -> s)
      switch (char) {
        case "@":
          return "a";
        case "0":
          return "o";
        case "1":
        case "!":
          return "i";
        case "3":
          return "e";
        case "5":
        case "$":
          return "s";
        default:
          return "";
      }
    });

  // Tester le texte original et le texte normalisé
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    if (pattern.test(text) || pattern.test(normalized)) {
      return {
        isAllowed: false,
        reason:
          "Votre message contient des termes inappropriés ou contraires aux règles de bienveillance et de respect de l'établissement scolaire.",
        matchedLabel: label,
      };
    }
  }

  return { isAllowed: true };
}

/**
 * 4. Découpage et détection sécurisée des URLs dans un texte (Linkify)
 */
export interface TextToken {
  type: "text" | "link";
  content: string;
  url?: string;
}

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi;

export function parseMessageLinks(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const matchedUrl = match[1];
    const matchIndex = match.index;

    // Ajouter le texte qui précède l'URL
    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        content: text.slice(lastIndex, matchIndex),
      });
    }

    // Valider et normaliser le lien (uniquement protocoles sûrs http:// ou https://)
    let href = matchedUrl;
    if (matchedUrl.toLowerCase().startsWith("www.")) {
      href = `https://${matchedUrl}`;
    }

    // Protection anti-javascript / anti-data injection
    if (/^https?:\/\//i.test(href)) {
      tokens.push({
        type: "link",
        content: matchedUrl,
        url: href,
      });
    } else {
      tokens.push({
        type: "text",
        content: matchedUrl,
      });
    }

    lastIndex = matchIndex + matchedUrl.length;
  }

  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return tokens;
}
