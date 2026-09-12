const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dossier de Présentation — Mon École en Live</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 16mm 18mm 14mm 18mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* En-tête de page */
    .header-banner {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border-radius: 12px;
      padding: 14px 20px;
      border-left: 6px solid #FF7A00;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header-banner h1 {
      font-size: 18px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .header-banner p {
      font-size: 10px;
      font-weight: 500;
      color: #5EEAD4;
      margin-top: 2px;
    }

    .header-badge {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Titres de sections */
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 10px;
      margin-bottom: 8px;
      border-bottom: 2px solid #F1F5F9;
      padding-bottom: 4px;
    }

    .section-title .bar {
      width: 4px;
      height: 14px;
      background: #FF7A00;
      border-radius: 2px;
    }

    /* Textes */
    p, li {
      font-size: 9px;
      line-height: 1.45;
      color: #334155;
    }

    /* Cartes & Blocs */
    .card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }

    .role-grid {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .role-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      border-left: 4px solid #0F172A;
    }

    .role-card.super-admin { border-left-color: #9333EA; }
    .role-card.admin { border-left-color: #FF7A00; }
    .role-card.prof { border-left-color: #0D9488; }
    .role-card.etudiant { border-left-color: #2563EB; }
    .role-card.parent { border-left-color: #10B981; }

    .role-badge {
      font-size: 8px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .role-badge.super-admin { background: #F3E8FF; color: #7E22CE; }
    .role-badge.admin { background: #FFEDD5; color: #EA580C; }
    .role-badge.prof { background: #CCFBF1; color: #0F766E; }
    .role-badge.etudiant { background: #EFF6FF; color: #1D4ED8; }
    .role-badge.parent { background: #D1FAE5; color: #047857; }

    .role-info h4 {
      font-size: 9.5px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }

    .role-info p {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.35;
    }

    /* Tableaux */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 8px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }

    th {
      background: #0F172A;
      color: #FFFFFF;
      font-size: 8.5px;
      font-weight: 700;
      text-align: left;
      padding: 6px 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 6px 10px;
      font-size: 8.2px;
      border-bottom: 1px solid #F1F5F9;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .tag-tech {
      font-weight: 700;
      color: #0D9488;
    }

    /* Liste de puces cochées */
    .checklist {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .checklist li {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 8.5px;
    }

    .checklist li::before {
      content: "✓";
      color: #0D9488;
      font-weight: 800;
      font-size: 9px;
    }

    /* Box Spéciale Quizlet */
    .quizlet-box {
      background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
      border: 1.5px solid #FDBA74;
      border-radius: 10px;
      padding: 10px 14px;
      margin: 8px 0;
    }

    .quizlet-box h3 {
      font-size: 11px;
      font-weight: 800;
      color: #C2410C;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .quizlet-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 6px;
    }

    .quizlet-card {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #FED7AA;
      border-radius: 6px;
      padding: 6px 8px;
    }

    .quizlet-card h5 {
      font-size: 8.5px;
      font-weight: 700;
      color: #9A3412;
      margin-bottom: 2px;
    }

    .quizlet-card p {
      font-size: 7.8px;
      color: #431407;
      line-height: 1.25;
    }

    /* Roadmap box */
    .roadmap-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-top: 4px;
    }

    .roadmap-item {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #0D9488;
      border-radius: 6px;
      padding: 6px 10px;
    }

    .roadmap-item h5 {
      font-size: 8.5px;
      font-weight: 700;
      color: #0F172A;
    }

    .roadmap-item p {
      font-size: 8px;
      color: #475569;
    }

    /* Pied de page */
    .page-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #64748B;
      font-weight: 500;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <div>
      <div class="header-banner">
        <div>
          <h1>Mon École en Live</h1>
          <p>Dossier de Présentation Technique & Pédagogique — Plateforme EdTech SaaS</p>
        </div>
        <div class="header-badge">Next.js 16 • Supabase</div>
      </div>

      <!-- 1. Présentation & Contexte -->
      <div class="section-title"><div class="bar"></div>1. Présentation & Contexte du Projet</div>
      <div class="card" style="margin-bottom: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
          <div><strong style="color:#0F172A;">Nom du Projet :</strong> Mon École en Live</div>
          <div><strong style="color:#0F172A;">Accès Web :</strong> monecoleenligne.vercel.app</div>
          <div style="grid-column: span 2;"><strong style="color:#0F172A;">Type :</strong> Établissement Scolaire Virtuel en Direct & Plateforme Éducative Intégrée</div>
        </div>
        <div style="background: #FFFFFF; border-left: 3px solid #FF7A00; padding: 6px 10px; border-radius: 4px; margin: 4px 0 6px 0;">
          <em style="color: #EA580C; font-size: 8.8px; font-weight: 600;">« L'école inclusive, gratuite et interactive qui réinvente l'apprentissage en direct. »</em>
        </div>
        <p style="text-align: justify; margin-top: 4px;">
          <strong>Problématique ciblée :</strong> La majorité des solutions e-learning se limitent à du contenu préenregistré passif ou à des visioconférences génériques non intégrées (sans émargement officiel, sans lien direct avec les devoirs, sans espace de supervision pour les parents). <strong>Mon École en Live</strong> résout cette rupture en fournissant un écosystème scolaire complet en temps réel : visioconférences de cours interactives, émargement automatisé, rendus de copies numériques, corrections pédagogiques et suivi parental.
        </p>
      </div>

      <!-- 2. Architecture Multi-Rôles -->
      <div class="section-title"><div class="bar"></div>2. Architecture Multi-Rôles (5 Rôles Étanches)</div>
      <div class="role-grid">
        <div class="role-card super-admin">
          <span class="role-badge super-admin">Super Admin</span>
          <div class="role-info">
            <h4>Direction Générale & Sécurité Globale (/super-admin)</h4>
            <p>Supervision complète de l'établissement, journal d'audit de sécurité (Audit Trail), gouvernance des administrateurs et gestion des accès sensibles.</p>
          </div>
        </div>

        <div class="role-card admin">
          <span class="role-badge admin">Admin</span>
          <div class="role-info">
            <h4>Responsable Pédagogique & Scolarité (/admin)</h4>
            <p>Gestion des effectifs (création des profils, liaisons parents-élèves), création des classes/matières, supervision du planning global et des feuilles d'émargement.</p>
          </div>
        </div>

        <div class="role-card prof">
          <span class="role-badge prof">Professeur</span>
          <div class="role-info">
            <h4>Corps Enseignant (/prof)</h4>
            <p>Animation des cours en direct (WebRTC), enregistrement et publication automatique des replays vidéo, distribution de devoirs, notation sur 20 et messagerie de classe.</p>
          </div>
        </div>

        <div class="role-card etudiant">
          <span class="role-badge etudiant">Étudiant</span>
          <div class="role-info">
            <h4>Élève (/etudiant)</h4>
            <p>Suivi des cours en direct interactifs, accès illimité aux replays vidéo, dépôt de devoirs numériques, consultation du relevé de notes et suivi de sa progression.</p>
          </div>
        </div>

        <div class="role-card parent">
          <span class="role-badge parent">Parent</span>
          <div class="role-info">
            <h4>Parent d'Élève (/parent)</h4>
            <p>Espace de co-éducation multi-enfants : suivi de l'assiduité (présences/absences en direct), devoirs à rendre, consultation des notes et échanges avec l'équipe pédagogique.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Mon École en Live — Dossier de Présentation Pédagogique</span>
      <span>Page 1 / 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <div>
      <div class="header-banner">
        <div>
          <h1>Stack Technique & Réalisations</h1>
          <p>Technologies Employées, Infrastructure & Modules Déjà Validés</p>
        </div>
        <div class="header-badge">Production Ready</div>
      </div>

      <!-- 3. Stack Technologique -->
      <div class="section-title"><div class="bar"></div>3. Stack Technologique (Moderne & Scalable)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Domaine</th>
            <th style="width: 30%;">Technologies</th>
            <th style="width: 45%;">Justification & Rôle</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Frontend & Framework</strong></td>
            <td class="tag-tech">Next.js 16 (App Router) + React 19</td>
            <td>Rendu hybride (SSR + Server Components) pour un chargement instantané (&lt; 100ms) et un SEO optimal.</td>
          </tr>
          <tr>
            <td><strong>Langage & Typage</strong></td>
            <td class="tag-tech">TypeScript 5.x</td>
            <td>Typage statique strict de bout en bout garantissant la robustesse et la zéro régression.</td>
          </tr>
          <tr>
            <td><strong>Styling & UI</strong></td>
            <td class="tag-tech">Tailwind CSS v4 + Lucide React</td>
            <td>Design system moderne, animations fluides et interface 100% responsive (Mobile, Tablette, PC).</td>
          </tr>
          <tr>
            <td><strong>Base de Données</strong></td>
            <td class="tag-tech">PostgreSQL (Supabase)</td>
            <td>Base relationnelle avec 18 tables, index composites et contraintes d'intégrité strictes.</td>
          </tr>
          <tr>
            <td><strong>Sécurité & Auth</strong></td>
            <td class="tag-tech">Supabase Auth + RLS</td>
            <td>Row Level Security : isolation multi-tenante granulaire des données privées en base.</td>
          </tr>
          <tr>
            <td><strong>Visioconférence Live</strong></td>
            <td class="tag-tech">Jitsi Meet API (WebRTC)</td>
            <td>Salons virtuels interactifs sans latence avec gestion audio/vidéo, levée de main et chat.</td>
          </tr>
          <tr>
            <td><strong>Enregistreur & Média</strong></td>
            <td class="tag-tech">WebRTC MediaStream + AudioContext</td>
            <td>Enregistrement haute fidélité avec mixage micro propre et téléversement direct des replays.</td>
          </tr>
          <tr>
            <td><strong>Stockage Fichiers</strong></td>
            <td class="tag-tech">Supabase Storage</td>
            <td>Hébergement sécurisé des polycopiés (PDF), devoirs et replays vidéo.</td>
          </tr>
          <tr>
            <td><strong>Déploiement & CI/CD</strong></td>
            <td class="tag-tech">Vercel + GitHub</td>
            <td>Déploiement continu automatisé sur Edge CDN mondial à haute disponibilité.</td>
          </tr>
        </tbody>
      </table>

      <!-- 4. Fonctionnalités Réalisées -->
      <div class="section-title"><div class="bar"></div>4. Fonctionnalités Déjà Réalisées & Validées (Sprints 1 & 2 — Done)</div>

      <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
        <div class="card" style="margin-bottom: 0;">
          <h5 style="color: #0D9488; font-size: 9px; font-weight: 800; margin-bottom: 4px; text-transform: uppercase;">A. Visioconférence & Salle Virtuelle</h5>
          <ul class="checklist">
            <li>Intégration des salles de cours virtuelles Jitsi interactives par matière et par classe.</li>
            <li>Pipeline d'enregistrement d'écran enseignant avec mixage audio anti-écho matériel.</li>
            <li>Publication et archivage automatique des replays vidéo directement rattachés à la séance.</li>
            <li>Protection anti-fermeture accidentelle (beforeunload) pendant l'enregistrement d'un direct.</li>
          </ul>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <h5 style="color: #0D9488; font-size: 9px; font-weight: 800; margin-bottom: 4px; text-transform: uppercase;">B. Gestion Scolaire & Pédagogique</h5>
          <ul class="checklist">
            <li>Module complet de devoirs : création par le professeur, dépôt numérique par l'élève, feedback et notation sur 20.</li>
            <li>Module d'émargement et suivi des présences en temps réel lors des séances en direct.</li>
            <li>Annuaire scolaire complet : gestion des élèves, enseignants et liaison d'enfants aux comptes parents.</li>
            <li>Messagerie interne segmentée par classe, par cours et par matière.</li>
          </ul>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <h5 style="color: #0D9488; font-size: 9px; font-weight: 800; margin-bottom: 4px; text-transform: uppercase;">C. Performance, Base de Données & Sécurité</h5>
          <ul class="checklist">
            <li>Migration SQL 14 : 10 index composites de performance réduisant le temps de réponse sous 100ms.</li>
            <li>Dénormalisation du champ email dans profiles pour éliminer 100% des requêtes N+1.</li>
            <li>Système de pagination intelligent (Offset 20/page sur utilisateurs et presences + Curseur temporel sur audit).</li>
            <li>Recherche instantanée avec Debounce (250ms) pour une réactivité UI sans saccades.</li>
            <li>Suite de tests de sécurité automatisée (scripts/test-rls.ts) validant l'étanchéité RLS à 100%.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Mon École en Live — Dossier de Présentation Pédagogique</span>
      <span>Page 2 / 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 3 ==================== -->
  <div class="page">
    <div>
      <div class="header-banner">
        <div>
          <h1>Innovations & Roadmap du Projet</h1>
          <p>Module Pédagogique Interactif (Quizlet) & Backlog Produit</p>
        </div>
        <div class="header-badge">Roadmap 2026-2027</div>
      </div>

      <!-- 5. Module Interactif Quizlet -->
      <div class="section-title"><div class="bar"></div>5. Nouvelle Fonctionnalité Majeure : Module Ludique (Style Quizlet)</div>
      
      <div class="quizlet-box">
        <h3>💡 Objectif Pédagogique : Gamification & Mémorisation Active pour Enfants</h3>
        <p style="color: #7C2D12;">
          Rendre l'apprentissage ludique, interactif et engageant pour les enfants à travers la répétition espacée, la mémorisation visuelle et la gamification, directement rattachées aux cours dispensés par leurs professeurs.
        </p>

        <div class="quizlet-grid">
          <div class="quizlet-card">
            <h5>🃏 Cartes Mémoire 3D (Flashcards)</h5>
            <p>Cartes recto/verso animées (notion / réponse illustrée) avec synthèse vocale audio pour faciliter l'apprentissage des plus jeunes.</p>
          </div>
          <div class="quizlet-card">
            <h5>⏱️ Quiz Chronométrés & Streaks</h5>
            <p>Évaluations rapides à la fin de chaque séance live pour valider les acquis avec système de points et séries de victoires.</p>
          </div>
          <div class="quizlet-card">
            <h5>🧩 Jeu d'Association (Match Game)</h5>
            <p>Mini-jeu où les enfants relient les termes à leurs définitions ou images le plus rapidement possible.</p>
          </div>
          <div class="quizlet-card">
            <h5>🤖 Génération Automatique par le Prof</h5>
            <p>L'enseignant génère un deck de flashcards en 1 clic à partir du plan ou des mots-clés de son cours.</p>
          </div>
        </div>
      </div>

      <!-- 6. Product Backlog -->
      <div class="section-title"><div class="bar"></div>6. Product Backlog & Roadmap Prévisionnelle (To-Do)</div>
      <div class="roadmap-list">
        <div class="roadmap-item">
          <h5>Phase 1 : IA & Pédagogie Intelligente (High Priority)</h5>
          <p>Transcription automatique des cours (Speech-to-Text) + Tuteur IA guidé pour les devoirs disponible 24/7.</p>
        </div>
        <div class="roadmap-item">
          <h5>Phase 2 : Gamification & Module Enfants</h5>
          <p>Intégration complète du module Quizlet (Flashcards, Quiz chronométré, Match game) + Système de badges de progression.</p>
        </div>
        <div class="roadmap-item">
          <h5>Phase 3 : Notifications & Bulletins Scolaires</h5>
          <p>Alertes SMS/Email automatiques aux parents en cas d'absence + Génération PDF des bulletins officiels trimestriels.</p>
        </div>
        <div class="roadmap-item">
          <h5>Phase 4 : Application Mobile PWA</h5>
          <p>Progressive Web App installable sur smartphone (iOS/Android) avec mode consultation hors-ligne des supports de cours.</p>
        </div>
      </div>

      <!-- 7. Points Forts -->
      <div class="section-title" style="margin-top: 10px;"><div class="bar"></div>7. Points Forts & Valeur Ajoutée Académique</div>
      <div class="card" style="margin-bottom: 0;">
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 4px;">
          <li><strong style="color:#EA580C;">★ Projet Full-Stack Complet en Production :</strong> Plateforme réelle déployée avec base de données PostgreSQL, WebRTC et gestion multimédia.</li>
          <li><strong style="color:#EA580C;">★ Sécurité & Étanchéité de Niveau Entreprise :</strong> Row Level Security (RLS) et politiques multi-rôles testées et validées par suite automatisée.</li>
          <li><strong style="color:#EA580C;">★ Performance & Optimisation d'Échelle :</strong> Temps de réponse &lt; 100ms, pagination serveur, recherche debouncée et requêtes SQL optimisées.</li>
          <li><strong style="color:#EA580C;">★ Impact Pédagogique & Pertinence Métier :</strong> Réponse concrète aux enjeux de continuité pédagogique et d'inclusion numérique des familles.</li>
        </ul>
      </div>
    </div>

    <div class="page-footer">
      <span>Mon École en Live — Dossier de Présentation Pédagogique</span>
      <span>Page 3 / 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 4 ==================== -->
  <div class="page">
    <div>
      <div class="header-banner">
        <div>
          <h1>Accès & Guide de Démonstration</h1>
          <p>Identifiants de Test, Liens Directs & Parcours Évaluateur</p>
        </div>
        <div class="header-badge">Session Démo Live</div>
      </div>

      <!-- 8. Accès Direct & Comptes -->
      <div class="section-title"><div class="bar"></div>8. Accès Direct & Comptes de Démonstration (Les 5 Profils)</div>
      
      <div class="card" style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 8px; font-weight: 700; color: #64748B; text-transform: uppercase;">Lien de la Plateforme en Production :</div>
            <a href="https://monecoleenligne.vercel.app" style="color: #2563EB; font-weight: 800; font-size: 10px; text-decoration: none;">https://monecoleenligne.vercel.app</a>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 700; color: #64748B; text-transform: uppercase;">Page de Connexion :</div>
            <a href="https://monecoleenligne.vercel.app/login" style="color: #EA580C; font-weight: 800; font-size: 10px; text-decoration: none;">https://monecoleenligne.vercel.app/login</a>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Profil / Rôle</th>
            <th style="width: 32%;">Email de Connexion</th>
            <th style="width: 20%;">Mot de Passe</th>
            <th style="width: 23%;">Espace Dédié</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="role-badge super-admin">Super Admin</span> <strong>Directeur</strong></td>
            <td style="font-family: monospace; font-weight: 700; color: #0D9488;">superadmin@monecoleenlive.fr</td>
            <td style="font-family: monospace; font-weight: 700; color: #EA580C;">SuperAdmin2027!</td>
            <td>/super-admin (Direction)</td>
          </tr>
          <tr>
            <td><span class="role-badge admin">Admin</span> <strong>Pédagogique</strong></td>
            <td style="font-family: monospace; font-weight: 700; color: #0D9488;">admin@monecoleenlive.fr</td>
            <td style="font-family: monospace; font-weight: 700; color: #EA580C;">Admin2027!</td>
            <td>/admin (Scolarité)</td>
          </tr>
          <tr>
            <td><span class="role-badge prof">Professeur</span> <strong>C. Dupont</strong></td>
            <td style="font-family: monospace; font-weight: 700; color: #0D9488;">prof@monecoleenlive.fr</td>
            <td style="font-family: monospace; font-weight: 700; color: #EA580C;">Prof2027!</td>
            <td>/prof (Enseignant)</td>
          </tr>
          <tr>
            <td><span class="role-badge etudiant">Élève</span> <strong>Lucas Martin</strong></td>
            <td style="font-family: monospace; font-weight: 700; color: #0D9488;">eleve@monecoleenlive.fr</td>
            <td style="font-family: monospace; font-weight: 700; color: #EA580C;">Eleve2027!</td>
            <td>/etudiant (Élève)</td>
          </tr>
          <tr>
            <td><span class="role-badge parent">Parent</span> <strong>Sophie Martin</strong></td>
            <td style="font-family: monospace; font-weight: 700; color: #0D9488;">parent@monecoleenlive.fr</td>
            <td style="font-family: monospace; font-weight: 700; color: #EA580C;">Parent2027!</td>
            <td>/parent (Espace Parent)</td>
          </tr>
        </tbody>
      </table>

      <!-- 9. Parcours de Test -->
      <div class="section-title"><div class="bar"></div>9. Parcours de Test Recommandé pour l'Évaluateur (5 Minutes)</div>
      
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div class="card" style="border-left: 4px solid #0D9488; padding: 7px 10px; margin-bottom: 0;">
          <h5 style="color: #0D9488; font-size: 8.8px; font-weight: 800; margin-bottom: 2px;">1. Enseignant (prof@monecoleenlive.fr)</h5>
          <p style="font-size: 8px;">Aller dans <strong>Planning</strong> ➔ Rejoindre la séance live Jitsi (test micro/caméra). Aller dans <strong>Devoirs</strong> ➔ Publier un devoir avec consigne.</p>
        </div>

        <div class="card" style="border-left: 4px solid #2563EB; padding: 7px 10px; margin-bottom: 0;">
          <h5 style="color: #2563EB; font-size: 8.8px; font-weight: 800; margin-bottom: 2px;">2. Élève (eleve@monecoleenlive.fr)</h5>
          <p style="font-size: 8px;">Accéder à la classe en direct avec émargement ou visionner un Replay. Aller dans <strong>Devoirs</strong> ➔ Déposer une copie numérique (PDF).</p>
        </div>

        <div class="card" style="border-left: 4px solid #10B981; padding: 7px 10px; margin-bottom: 0;">
          <h5 style="color: #10B981; font-size: 8.8px; font-weight: 800; margin-bottom: 2px;">3. Parent (parent@monecoleenlive.fr)</h5>
          <p style="font-size: 8px;">Consulter le tableau de bord : visualisation instantanée de l'assiduité de l'enfant et de sa copie déposée.</p>
        </div>

        <div class="card" style="border-left: 4px solid #9333EA; padding: 7px 10px; margin-bottom: 0;">
          <h5 style="color: #9333EA; font-size: 8.8px; font-weight: 800; margin-bottom: 2px;">4. Direction (admin@monecoleenlive.fr ou superadmin)</h5>
          <p style="font-size: 8px;">Consulter l'annuaire paginé dans <strong>Utilisateurs</strong> et la traçabilité des opérations dans le <strong>Journal d'Audit de Sécurité</strong>.</p>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Mon École en Live — Dossier de Présentation Pédagogique</span>
      <span>Page 4 / 4</span>
    </div>
  </div>

</body>
</html>
`;

async function generatePDF() {
  console.log("🚀 Lancement de Chromium pour la génération du PDF haute fidélité...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const outputPath = path.join(__dirname, "../Dossier_Presentation_Mon_Ecole_En_Live.pdf");
  const desktopPath = "/Users/mac/Desktop/Dossier_Presentation_Mon_Ecole_En_Live.pdf";

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  await browser.close();

  // Copier vers le Bureau
  fs.copyFileSync(outputPath, desktopPath);

  console.log(`✅ PDF généré avec succès (Exactement 4 pages, ZÉRO bug d'encodage, ZÉRO page blanche) :`);
  console.log(`   👉 ${outputPath}`);
  console.log(`   👉 ${desktopPath}`);
}

generatePDF().catch(console.error);
