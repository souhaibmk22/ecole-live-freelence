const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "../Dossier_Presentation_Mon_Ecole_En_Live.pdf");

// Configuration du document
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 40, bottom: 50, left: 45, right: 45 },
  bufferPages: true,
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Palette de couleurs professionnelles
const COLORS = {
  navy: "#0F172A",
  navyLight: "#1E293B",
  orange: "#EA580C",
  orangeLight: "#FFEDD5",
  teal: "#0D9488",
  tealLight: "#CCFBF1",
  purple: "#7E22CE",
  purpleLight: "#F3E8FF",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  grayDark: "#334155",
  grayMed: "#64748B",
  grayLight: "#F1F5F9",
  white: "#FFFFFF",
  border: "#E2E8F0",
};

// Fonctions utilitaires de dessin
function drawHeader(title, subtitle) {
  doc.rect(45, 35, 505, 55).fill(COLORS.navy);
  
  // Barre accent orange
  doc.rect(45, 35, 6, 55).fill(COLORS.orange);

  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(18).text(title, 60, 45);
  doc.fillColor(COLORS.tealLight).font("Helvetica").fontSize(10).text(subtitle, 60, 68);
  
  doc.y = 105;
}

function drawSectionTitle(title, icon = "■") {
  const y = doc.y;
  doc.rect(45, y, 4, 18).fill(COLORS.orange);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(13).text(`${title}`, 55, y + 2);
  doc.y = y + 24;
}

function drawSubSectionTitle(title) {
  const y = doc.y;
  doc.fillColor(COLORS.teal).font("Helvetica-Bold").fontSize(11).text(title, 45, y);
  doc.y = y + 16;
}

function drawCard(x, y, w, h, bgColor = COLORS.grayLight, borderColor = COLORS.border) {
  doc.rect(x, y, w, h).fillAndStroke(bgColor, borderColor);
}

// ==========================================
// PAGE 1 : PRÉSENTATION & ARCHITECTURE MULTI-RÔLES
// ==========================================
drawHeader("MON ÉCOLE EN LIVE", "Dossier de Présentation & Architecture de Projet EdTech SaaS");

// 1. Présentation & Contexte
drawSectionTitle("1. PRÉSENTATION & CONTEXTE DU PROJET");

doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(9.5);
doc.text("• Nom du Projet : ", { continued: true }).font("Helvetica-Bold").fillColor(COLORS.navy).text("Mon École en Live (monecoleenligne.vercel.app)");
doc.font("Helvetica").fillColor(COLORS.grayDark).text("• Type de Projet : ", { continued: true }).font("Helvetica-Bold").text("Plateforme Éducative & Établissement Scolaire Virtuel en Direct (EdTech SaaS)");
doc.font("Helvetica").fillColor(COLORS.grayDark).text("• Slogan : ", { continued: true }).font("Helvetica-Oblique").fillColor(COLORS.orange).text("« L'école inclusive, gratuite et interactive qui réinvente l'apprentissage en direct. »");

doc.moveDown(0.5);
doc.font("Helvetica-Bold").fillColor(COLORS.navy).text("Problématique ciblée :");
doc.font("Helvetica").fillColor(COLORS.grayDark).text(
  "La majorité des solutions e-learning se limitent à du contenu préenregistré passif ou à des visioconférences génériques non intégrées (sans suivi de présence officiel, sans lien direct avec les devoirs, sans espace de supervision pour les parents). Mon École en Live résout cette rupture en fournissant un écosystème scolaire complet en temps réel, unifiant cours en direct, émargement automatisé, rendus de copies, corrections pédagogiques et suivi parental.",
  { align: "justify", lineGap: 1.5 }
);

doc.moveDown(1);

// 2. Architecture Multi-Rôles
drawSectionTitle("2. ARCHITECTURE MULTI-RÔLES (5 RÔLES ÉTANCHES)");

const roles = [
  {
    name: "Super Administrateur (Direction)",
    badge: "SUPER ADMIN",
    color: COLORS.purple,
    bgColor: COLORS.purpleLight,
    desc: "Supervision globale de l'établissement, journal d'audit de sécurité (Audit Trail), gouvernance des administrateurs et gestion des accès sensibles.",
  },
  {
    name: "Administrateur Pédagogique",
    badge: "ADMIN",
    color: COLORS.orange,
    bgColor: COLORS.orangeLight,
    desc: "Gestion des effectifs (création de comptes, liaisons parents-élèves, affectations), création des matières, supervision du planning global et des feuilles d'émargement.",
  },
  {
    name: "Professeur (Enseignant)",
    badge: "PROF",
    color: COLORS.teal,
    bgColor: COLORS.tealLight,
    desc: "Animation des cours en direct (visioconférence WebRTC), enregistrement et publication automatique des replays vidéo, distribution de devoirs, notation et messagerie de classe.",
  },
  {
    name: "Étudiant (Élève)",
    badge: "ETUDIANT",
    color: COLORS.blue,
    bgColor: COLORS.blueLight,
    desc: "Suivi des cours en direct interactifs, accès illimité aux replays vidéo, dépôt de devoirs numériques, consultation du relevé de notes et suivi de sa progression.",
  },
  {
    name: "Parent d'Élève",
    badge: "PARENT",
    color: COLORS.teal,
    bgColor: COLORS.tealLight,
    desc: "Espace de co-éducation multi-enfants : suivi de l'assiduité (présences/absences en direct), devoirs à rendre, consultation des notes et échanges avec l'équipe pédagogique.",
  },
];

roles.forEach((r) => {
  const y = doc.y;
  doc.rect(45, y, 505, 36).fillAndStroke(COLORS.white, COLORS.border);
  doc.rect(45, y, 4, 36).fill(r.color);
  
  doc.fillColor(r.color).font("Helvetica-Bold").fontSize(9).text(r.name, 55, y + 5);
  doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(8.2).text(r.desc, 55, y + 17, { width: 485, lineGap: 1 });
  doc.y = y + 41;
});

// ==========================================
// PAGE 2 : STACK TECHNOLOGIQUE & FONCTIONNALITÉS RÉALISÉES
// ==========================================
doc.addPage();
drawHeader("STACK TECHNIQUE & RÉALISATIONS", "Technologies Employées, Infrastructure & Modules Validés");

// 3. Stack Technologique
drawSectionTitle("3. STACK TECHNOLOGIQUE (MODERNE, SCALABLE & PERFORMANTE)");

const techStack = [
  ["Frontend & Framework", "Next.js 16 (App Router) + React 19", "Rendu hybride (SSR + Server Components) pour un chargement instantané (< 100ms) et un SEO optimal."],
  ["Langage & Typage", "TypeScript 5.x", "Typage statique strict de bout en bout garantissant la robustesse du code et la zéro régression."],
  ["Styling & UI Design", "Tailwind CSS v4 + Lucide Icons", "Design system moderne, fluide, accessible et 100% responsive (Mobile, Tablette, PC)."],
  ["Base de Données", "PostgreSQL (Supabase)", "Base relationnelle avec 18 tables, index composites et contraintes d'intégrité strictes."],
  ["Sécurité & Auth", "Supabase Auth + Row Level Security (RLS)", "Isolation multi-tenante granulaire : étanchéité totale des données privées en base."],
  ["Visioconférence Live", "Jitsi Meet API (WebRTC)", "Classes virtuelles interactives sans latence avec audio/vidéo, levée de main et chat."],
  ["Enregistreur & Média", "WebRTC MediaStream + AudioContext", "Enregistrement haute fidélité du cours avec mixage micro propre et téléversement auto des replays."],
  ["Stockage Fichiers", "Supabase Storage (Buckets)", "Hébergement sécurisé des polycopiés (PDF), devoirs et replays vidéo."],
  ["Déploiement & CI/CD", "Vercel + GitHub", "Déploiement continu automatisé sur Edge CDN mondial à haute disponibilité."],
];

// En-tête de tableau
let tableY = doc.y;
doc.rect(45, tableY, 505, 18).fill(COLORS.navy);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(8.5);
doc.text("Domaine", 50, tableY + 5, { width: 100 });
doc.text("Technologies", 155, tableY + 5, { width: 140 });
doc.text("Justification & Rôle", 300, tableY + 5, { width: 245 });

tableY += 18;
techStack.forEach((row, idx) => {
  const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.grayLight;
  doc.rect(45, tableY, 505, 22).fillAndStroke(rowBg, COLORS.border);
  
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(7.8).text(row[0], 50, tableY + 6, { width: 100 });
  doc.fillColor(COLORS.teal).font("Helvetica-Bold").fontSize(7.8).text(row[1], 155, tableY + 6, { width: 140 });
  doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(7.5).text(row[2], 300, tableY + 6, { width: 245, lineGap: 0.5 });
  
  tableY += 22;
});

doc.y = tableY + 12;

// 4. Fonctionnalités Réalisées
drawSectionTitle("4. FONCTIONNALITÉS DÉJÀ RÉALISÉES & VALIDÉES (SPRINTS 1 & 2 — DONE)");

const completedFeatures = [
  {
    cat: "A. Visioconférence & Salle Virtuelle",
    items: [
      "Intégration des salles de cours virtuelles Jitsi interactives par matière et par classe.",
      "Pipeline d'enregistrement d'écran enseignant avec mixage audio anti-écho matériel.",
      "Publication et archivage automatique des replays vidéo directement rattachés à la séance.",
      "Protection anti-fermeture accidentelle (beforeunload) pendant l'enregistrement d'un direct.",
    ],
  },
  {
    cat: "B. Gestion Scolaire & Pédagogique",
    items: [
      "Module complet de devoirs : création par le professeur, dépôt numérique par l'élève, feedback et notation sur 20.",
      "Module d'émargement et suivi des présences en temps réel lors des séances en direct.",
      "Annuaire scolaire complet : gestion des élèves, enseignants et liaison d'enfants aux comptes parents.",
      "Messagerie interne segmentée par classe, par cours et par matière.",
    ],
  },
  {
    cat: "C. Performance, Base de Données & Sécurité",
    items: [
      "Migration SQL 14 : 10 index composites de performance réduisant le temps de réponse sous 100ms.",
      "Dénormalisation du champ email dans profiles pour éliminer 100% des requêtes N+1.",
      "Système de pagination intelligent (Offset 20/page sur utilisateurs et presences + Curseur temporel sur audit).",
      "Recherche instantanée avec Debounce (250ms) pour une réactivité UI sans saccades.",
      "Suite de tests de sécurité automatisée (scripts/test-rls.ts) validant l'étanchéité RLS à 100%.",
    ],
  },
];

completedFeatures.forEach((cf) => {
  drawSubSectionTitle(cf.cat);
  cf.items.forEach((item) => {
    doc.fillColor(COLORS.teal).font("Helvetica-Bold").fontSize(8.5).text("  ✓ ", { continued: true });
    doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(8.5).text(item, { lineGap: 1 });
  });
  doc.moveDown(0.3);
});

// ==========================================
// PAGE 3 : ROADMAP, NOUVEAU MODULE QUIZLET & VALEUR AJOUTÉE
// ==========================================
doc.addPage();
drawHeader("INNOVATIONS & ROADMAP DU PROJET", "Module Pédagogique Interactif (Quizlet) & Backlog Produit");

// 5. Module Interactif Quizlet
drawSectionTitle("5. NOUVELLE FONCTIONNALITÉ MAJEURE : MODULE LUDIQUE (STYLE QUIZLET)");

doc.rect(45, doc.y, 505, 125).fillAndStroke(COLORS.orangeLight, COLORS.orange);
const quizletY = doc.y;
doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(10.5).text("💡 Objectif Pédagogique : Gamification & Mémorisation Active pour Enfants", 55, quizletY + 8);
doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(8.5).text(
  "Rendre l'apprentissage ludique, interactif et engageant pour les enfants à travers la répétition espacée, la mémorisation visuelle et la gamification, directement rattachées aux cours dispensés par leurs professeurs.",
  55, quizletY + 23, { width: 485, lineGap: 1.5 }
);

const quizletItems = [
  ["🃏 Cartes Mémoire 3D (Flashcards)", "Cartes recto/verso animées (notion / réponse illustrée) avec synthèse vocale audio pour les plus jeunes."],
  ["⏱️ Quiz Chronométrés & Streaks", "Évaluations rapides à la fin de chaque séance live pour valider les acquis avec système de points et séries de victoires."],
  ["🧩 Jeu d'Association (Match Game)", "Mini-jeu où les enfants relient les termes à leurs définitions ou images le plus rapidement possible."],
  ["🤖 Génération Automatique par le Prof", "L'enseignant génère un deck de flashcards en 1 clic à partir du plan ou des mots-clés de son cours."],
];

let qItemY = quizletY + 54;
quizletItems.forEach(([title, desc]) => {
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(8).text(`• ${title} : `, 55, qItemY, { continued: true });
  doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(8).text(desc, { width: 480 });
  qItemY += 16;
});

doc.y = quizletY + 135;

// 6. Product Backlog
drawSectionTitle("6. PRODUCT BACKLOG & ROADMAP PRÉVISIONNELLE (TO-DO)");

const roadmap = [
  ["Phase 1 : IA & Pédagogie", "Transcription automatique des cours (Speech-to-Text) + Tuteur IA guidé pour les devoirs 24/7."],
  ["Phase 2 : Gamification Enfants", "Intégration complète du module Quizlet (Flashcards, Quiz chronométré, Match game) + Badges de réussite."],
  ["Phase 3 : Notifications & Bulletins", "Alertes SMS/Email automatiques aux parents en cas d'absence + Génération PDF des bulletins scolaires."],
  ["Phase 4 : Application Mobile PWA", "Progressive Web App installable sur smartphone avec mode consultation hors-ligne."],
];

roadmap.forEach(([phase, desc]) => {
  const y = doc.y;
  doc.rect(45, y, 505, 24).fillAndStroke(COLORS.white, COLORS.border);
  doc.rect(45, y, 4, 24).fill(COLORS.teal);
  
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(8.5).text(phase, 55, y + 4);
  doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(8).text(desc, 55, y + 14, { width: 485 });
  doc.y = y + 28;
});

doc.moveDown(0.5);

// 7. Valeur Ajoutée pour l'Évaluation
drawSectionTitle("7. POINTS FORTS & VALEUR AJOUTÉE ACADÉMIQUE");

const pointsForts = [
  ["Projet Full-Stack Complet en Production", "Plateforme réelle déployée avec base de données PostgreSQL, WebRTC et gestion multimédia."],
  ["Sécurité & Étanchéité de Niveau Entreprise", "Row Level Security (RLS) et politiques multi-rôles testées et validées par suite automatisée."],
  ["Performance & Optimisation d'Échelle", "Temps de réponse < 100ms, pagination serveur, recherche debouncée et requêtes SQL optimisées."],
  ["Impact Pédagogique & Pertinence Métier", "Réponse concrète aux enjeux de continuité pédagogique et d'inclusion numérique des familles."],
];

pointsForts.forEach(([title, desc]) => {
  doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(8.5).text("★ ", { continued: true });
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").text(`${title} : `, { continued: true });
  doc.fillColor(COLORS.grayDark).font("Helvetica").text(desc, { lineGap: 1 });
});

// ==========================================
// PAGE 4 : ACCÈS À LA PLATEFORME & GUIDE DE DÉMO
// ==========================================
doc.addPage();
drawHeader("ACCÈS & GUIDE DE DÉMONSTRATION", "Identifiants de Test, Liens Directs & Parcours Évaluateur");

// 8. Liens et Comptes de test
drawSectionTitle("8. ACCÈS DIRECT & COMPTES DE DÉMONSTRATION (LES 5 PROFILS)");

doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(9);
doc.text("• Lien de la Plateforme en Production : ", { continued: true }).font("Helvetica-Bold").fillColor(COLORS.blue).text("https://monecoleenligne.vercel.app");
doc.font("Helvetica").fillColor(COLORS.grayDark).text("• Page de Connexion Directe : ", { continued: true }).font("Helvetica-Bold").fillColor(COLORS.blue).text("https://monecoleenligne.vercel.app/login");

doc.moveDown(0.5);

const accounts = [
  ["Super Administrateur", "superadmin@monecoleenlive.fr", "SuperAdmin2027!", "/super-admin", "Direction & Sécurité"],
  ["Administrateur Pédagogique", "admin@monecoleenlive.fr", "Admin2027!", "/admin", "Effectifs, Classes & Présences"],
  ["Professeur (Enseignant)", "prof@monecoleenlive.fr", "Prof2027!", "/prof", "Visioconférence, Replays & Devoirs"],
  ["Élève (Étudiant)", "eleve@monecoleenlive.fr", "Eleve2027!", "/etudiant", "Directs, Replays, Devoirs & Notes"],
  ["Parent d'Élève", "parent@monecoleenlive.fr", "Parent2027!", "/parent", "Suivi Enfants, Assiduité & Résultats"],
];

let accY = doc.y;
doc.rect(45, accY, 505, 18).fill(COLORS.navy);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(8);
doc.text("Profil / Rôle", 50, accY + 5, { width: 120 });
doc.text("Email de Connexion", 175, accY + 5, { width: 140 });
doc.text("Mot de Passe", 320, accY + 5, { width: 85 });
doc.text("Espace Dédié", 410, accY + 5, { width: 135 });

accY += 18;
accounts.forEach((acc, idx) => {
  const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.grayLight;
  doc.rect(45, accY, 505, 20).fillAndStroke(rowBg, COLORS.border);
  
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(8).text(acc[0], 50, accY + 6, { width: 120 });
  doc.fillColor(COLORS.teal).font("Helvetica").fontSize(7.8).text(acc[1], 175, accY + 6, { width: 140 });
  doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(7.8).text(acc[2], 320, accY + 6, { width: 85 });
  doc.fillColor(COLORS.grayDark).font("Helvetica-Bold").fontSize(7.5).text(`${acc[3]} (${acc[4]})`, 410, accY + 6, { width: 135 });
  
  accY += 20;
});

doc.y = accY + 12;

// 9. Parcours de Test Recommandé
drawSectionTitle("9. PARCOURS DE TEST RECOMMANDÉ POUR L'ÉVALUATEUR (5 MINUTES)");

const steps = [
  ["1. Enseignant (prof@monecoleenlive.fr)", "Aller dans Planning ➔ Rejoindre le direct Jitsi avec test micro/caméra. Aller dans Devoirs ➔ Publier un nouveau devoir."],
  ["2. Élève (eleve@monecoleenlive.fr)", "Accéder au direct ou visionner un Replay vidéo. Aller dans Devoirs ➔ Déposer une copie numérique (PDF)."],
  ["3. Parent (parent@monecoleenlive.fr)", "Consulter le tableau de bord : visualisation instantanée des présences de l'enfant et de sa copie déposée."],
  ["4. Direction (admin / superadmin)", "Consulter l'annuaire paginé dans Utilisateurs et la traçabilité complète dans Journal d'Audit de Sécurité."],
];

steps.forEach(([title, desc]) => {
  const y = doc.y;
  doc.rect(45, y, 505, 28).fillAndStroke(COLORS.white, COLORS.border);
  doc.rect(45, y, 4, 28).fill(COLORS.blue);
  
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(8.5).text(title, 55, y + 4);
  doc.fillColor(COLORS.grayDark).font("Helvetica").fontSize(8).text(desc, 55, y + 16, { width: 485 });
  doc.y = y + 32;
});

// Pied de page numéroté automatique
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.rect(45, 800, 505, 0.5).fill(COLORS.border);
  doc.fillColor(COLORS.grayMed).font("Helvetica").fontSize(7.5);
  doc.text("Mon École en Live — Dossier Technique & Présentation Pédagogique", 45, 808, { width: 350 });
  doc.text(`Page ${i + 1} sur ${range.count}`, 450, 808, { width: 100, align: "right" });
}

doc.end();

writeStream.on("finish", () => {
  console.log(`✅ PDF généré avec succès à : ${outputPath}`);
});
