# 🎓 Mon École en Live — Plateforme Éducative & Établissement Virtuel en Direct

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![WebRTC Jitsi](https://img.shields.io/badge/WebRTC-Jitsi_Meet-4A90E2?style=flat-square&logo=jitsi)](https://jitsi.org/)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=flat-square&logo=vercel)](https://monecoleenligne.vercel.app)

> **« L'école inclusive, gratuite et interactive qui réinvente l'apprentissage en direct. »**

---

## 🌐 Démonstration en Ligne (Live Demo)

* 🚀 **Plateforme en Production** : [https://monecoleenligne.vercel.app](https://monecoleenligne.vercel.app)
* 🔐 **Page de Connexion** : [https://monecoleenligne.vercel.app/login](https://monecoleenligne.vercel.app/login)
* 📄 **Dossier de Présentation PDF** : `Dossier_Presentation_Mon_Ecole_En_Live.pdf`

---

## 📌 Présentation & Problématique Métier

La majorité des solutions e-learning actuelles se limitent à du contenu préenregistré passif ou à des visioconférences génériques non intégrées (sans suivi de présence officiel, sans lien direct avec les devoirs, sans espace de supervision pour les parents). 

**Mon École en Live** résout cette rupture en fournissant un écosystème scolaire complet en temps réel :
1. **Salles de classe virtuelles WebRTC (Jitsi Meet)** interactives par classe et par matière.
2. **Pipeline d'enregistrement synchrone** avec mixage audio anti-écho et publication automatique des replays vidéo.
3. **Feuilles d'émargement officielles** et suivi d'assiduité en temps réel.
4. **Distribution et rendu de devoirs numériques** avec notation sur 20 et commentaires pédagogiques.
5. **Espace de co-éducation parents-élèves** avec sélecteur multi-enfants et suivi continu.

---

## 🏛️ Architecture Multi-Rôles (5 Espaces Dédiés)

Le système est compartimenté en **5 profils étanches**, sécurisés nativement par **Row Level Security (RLS)** :

| Rôle / Profil | Email de Démonstration | Mot de Passe | Espace Dédié | Missions Principales |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Super Administrateur** | `superadmin@monecoleenlive.fr` | `SuperAdmin2027!` | `/super-admin` | Direction générale, journal d'audit de sécurité (Audit Trail), gouvernance des administrateurs. |
| **🛡️ Administrateur Pédagogique** | `admin@monecoleenlive.fr` | `Admin2027!` | `/admin` | Effectifs scolaires, classes & matières, supervision du planning global et des émargements. |
| **👨‍🏫 Professeur** | `prof@monecoleenlive.fr` | `Prof2027!` | `/prof` | Animation des directs, enregistrement des replays, publication & correction des devoirs. |
| **🎒 Élève (Étudiant)** | `eleve@monecoleenlive.fr` | `Eleve2027!` | `/etudiant` | Cours en direct, visionnage des replays, dépôt de copies (PDF) et relevé de notes. |
| **👨‍👩‍👧 Parent d’Élève** | `parent@monecoleenlive.fr` | `Parent2027!` | `/parent` | Sélecteur multi-enfants, suivi des présences, devoirs à faire et liaison avec les enseignants. |

---

## 🛠️ Stack Technologique & Choix d'Ingénierie

| Domaine | Technologies | Justification & Rôle |
| :--- | :--- | :--- |
| **Frontend & Framework** | **Next.js 16 (App Router)** + **React 19** | Rendu hybride (SSR + Server Components) pour un chargement instantané (< 100ms) et un SEO optimal. |
| **Langage** | **TypeScript 5.x** | Typage statique strict de bout en bout garantissant la robustesse et la zéro régression. |
| **Styling & UI** | **Tailwind CSS v4** + **Lucide React** + **Framer Motion** | Design system moderne, animations fluides et interface 100% responsive (Mobile, Tablette, PC). |
| **Base de Données** | **PostgreSQL (Supabase)** | Base relationnelle avec 18 tables, 10 index composites de performance et contraintes d'intégrité. |
| **Sécurité & Auth** | **Supabase Auth + Row Level Security (RLS)** | Isolation multi-tenante granulaire : étanchéité totale des données privées en base. |
| **Visioconférence Live** | **Jitsi Meet API (WebRTC)** | Salles virtuelles interactives sans latence avec audio/vidéo, levée de main et chat. |
| **Enregistreur & Média** | **WebRTC MediaStream + AudioContext** | Enregistrement haute fidélité avec mixage micro propre et téléversement auto des replays. |
| **Stockage Fichiers** | **Supabase Storage** | Hébergement sécurisé des polycopiés (PDF), devoirs et replays vidéo. |
| **Déploiement & CI/CD** | **Vercel** + **GitHub** | Déploiement continu automatisé sur Edge CDN mondial à haute disponibilité. |

---

## ✨ Fonctionnalités Réalisées (Done)

- [x] **Visioconférences & Replays** : Salons Jitsi intégrés par classe, enregistreur d'écran professeur, hébergement et lecteur de Replay intégré.
- [x] **Protection `beforeunload`** : Alerte anti-fermeture accidentelle d'onglet pendant l'enregistrement d'un cours.
- [x] **Devoirs & Notations** : Distribution de devoirs avec pièces jointes, dépôt de copies numériques et retours personnalisés.
- [x] **Émargement & Assiduité** : Feuilles d'émargement horodatées avec calcul des taux de présence.
- [x] **Annuaire & Effectifs Scolaires** : Gestion des comptes, réinitialisation de mot de passe autonome et liaison parents-élèves.
- [x] **Journal d'Audit de Sécurité** : Traçabilité des actions sensibles (création de compte, réinitialisation, suppression).
- [x] **Optimisations de Performance** :
  - 10 index composites de performance PostgreSQL.
  - Dénormalisation des emails pour éliminer 100% des requêtes N+1.
  - Pagination intelligente (Offset 20/page sur utilisateurs et présences + Curseur temporel sur les logs d'audit).
  - Recherche en temps réel avec Debounce (250ms).
- [x] **Sécurité RLS Validée** : Suite de tests automatisée `scripts/test-rls.ts` validant l'étanchéité des données.
- [x] **SEO & Responsive** : Métadonnées OpenGraph/Twitter complètes, Favicon, page 404 sur-mesure et navigation mobile dédiée.

---

## 🎮 Roadmap & Innovations Futures : Module Style Quizlet

Afin d'optimiser l'apprentissage actif des enfants, le projet intégrera prochainement :
* 🃏 **Cartes Mémoire 3D (Flashcards)** : Cartes recto/verso animées avec synthèse vocale audio.
* ⏱️ **Quiz Chronométrés & Streaks** : QCM rapides après chaque direct pour valider la compréhension avec points et badges.
* 🧩 **Jeu d'Association (Match Game)** : Mini-jeu de correspondance de notions en temps limité.
* 🤖 **Génération Automatique de Cartes par IA** : Création de jeux de révision en 1 clic à partir du cours de l'enseignant.

---

## 🚀 Installation & Lancement Local

### 1. Cloner le projet
```bash
git clone https://github.com/souhaibmk22/ecole-live-freelence.git
cd ecole-live-freelence
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
Créer un fichier `.env.local` à la racine :
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 🧪 Tests & Validation Automatisée

```bash
# Tester les performances de la base de données et la pagination
npx tsx scripts/test-db-optimizations.ts

# Valider l'étanchéité de la sécurité Row Level Security (RLS)
npx tsx scripts/test-rls.ts

# Générer le dossier de présentation PDF officiel
node scripts/generate-pdf-html.js
```

---

## 👤 Auteur & Réalisation

Projet conçu et développé par **Souhaib** — Plateforme *Mon École en Live*.
