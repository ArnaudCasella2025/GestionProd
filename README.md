# GestionProd — Plan de charge

Portail de gestion de production (studio audiovisuel/jeu vidéo) : plan de
charge des ressources, suivi des conflits d'affectation et du budget
consommé/projeté par projet. Voir `docs/cahier-des-charges` (fourni
séparément) pour la spec fonctionnelle complète — cette première itération
couvre l'écran **Plan de charge**.

Stack : React + TypeScript + Vite, données dans **Cloud Firestore**,
hébergement sur **Firebase Hosting**, déploiement automatique via
**GitHub Actions**.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs Firebase (voir plus bas)
npm run dev
```

L'application se lance à l'adresse affichée par Vite (`http://localhost:5173`
par défaut). Sans configuration Firebase, l'écran affiche un bandeau
d'avertissement et un état vide — voir "Connecter un projet Firebase"
ci-dessous.

Au premier lancement contre une base Firestore vide, un bouton
**"Initialiser des données de démo"** apparaît pour peupler la base avec des
personnes/projets/réservations d'exemple (voir `src/data/demoData.ts`).

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification des types + build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm run lint` | Lint (oxlint) |

## Connecter un projet Firebase

1. Créer un projet sur la [console Firebase](https://console.firebase.google.com/).
2. Activer **Cloud Firestore** (mode production — les règles de sécurité du
   dépôt, `firestore.rules`, gèrent l'accès temporaire, voir plus bas).
3. Ajouter une application **Web** au projet, puis copier la config donnée
   dans `.env.local` (voir `.env.example` pour la liste des variables
   `VITE_FIREBASE_*`).
4. En local : `npx firebase login` puis `npx firebase use --add` pour lier
   ce dossier au projet (met à jour `.firebaserc`).
5. Déployer les règles Firestore une première fois :
   `npx firebase deploy --only firestore:rules`.

### ⚠️ Sécurité — à faire avant toute vraie donnée

`firestore.rules` autorise pour l'instant **toute lecture/écriture, sans
authentification**, jusqu'à une date d'expiration (comme le mode "test" de
la console Firebase). Aucune authentification n'est encore implémentée dans
l'app. **Avant d'entrer de vraies données** — en particulier la vue Admin
listant salaires/charges des employés prévue au cahier des charges — il faut
ajouter Firebase Authentication et des règles Firestore basées sur les 3
rôles (Admin / Responsable / User) décrits dans la spec.

## Modèle de données (Firestore)

- `people` — ressources : `name`, `role`, `dailyRate`.
- `projects` — projets : `name`, `client`, `color`, `budget`.
- `bookings` — réservations : `personId`, `projectId` **ou** `absenceType`
  (`conge`/`teletravail`/`maladie`), `startDate`/`endDate` (ISO `YYYY-MM-DD`).
- `requests` — demandes d'absence en attente : `personId`, `type`,
  `startDate`/`endDate`, `status`.

Toute l'UI est branchée en temps réel sur ces collections via
`onSnapshot` (`src/lib/repository.ts`) — pas de rechargement de page
nécessaire après une modification.

## Déploiement automatisé (GitHub Actions)

Deux workflows sont fournis dans `.github/workflows/` :

- **`deploy.yml`** — à chaque push sur `main` (ou sur la branche de travail
  actuelle) : build de l'app, déploiement des règles Firestore, puis
  déploiement sur le **canal live** de Firebase Hosting.
- **`preview.yml`** — à chaque pull request : build + déploiement sur un
  **canal de preview** temporaire (expire après 7 jours), avec l'URL postée
  automatiquement en commentaire sur la PR. C'est le moyen prévu pour
  itérer/valider une évolution avant de la fusionner.

### Secrets GitHub à configurer

Dans *Settings → Secrets and variables → Actions* du dépôt :

| Secret | D'où vient-il |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Console Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée (coller le **contenu JSON** tel quel) |
| `VITE_FIREBASE_API_KEY` | Config de l'app web Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | idem |
| `VITE_FIREBASE_PROJECT_ID` | idem |
| `VITE_FIREBASE_STORAGE_BUCKET` | idem |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | idem |
| `VITE_FIREBASE_APP_ID` | idem |

Une fois ces secrets renseignés, chaque `git push` sur la branche de
production redéploie automatiquement l'app — aucune étape manuelle requise
pour les itérations suivantes.

### Déploiement manuel (dépannage)

```bash
npm run build
npx firebase deploy
```

## Structure du projet

```
src/
  lib/            Accès Firebase/Firestore, dates, config
  types.ts        Types du domaine (Person, Project, Booking, ...)
  data/           Jeu de données de démo
  features/planning/
    PlanDeCharge.tsx   Écran principal
    CalendarGrid.tsx   Grille calendrier + geste de réservation (glisser-déposer)
    BookingPopover.tsx Panneau flottant de création de réservation
    DetailPanel.tsx    Panneau de détail d'une réservation
    RequestsModal.tsx  Modale des demandes d'absence
    CommandPalette.tsx Palette de commande (⌘K)
    ProjectCards.tsx   Cartes "Consommé & projeté"
    calc.ts            Détection de conflits, calcul budgétaire
  styles/
    broadsheet.css  Design system fourni (tokens + composants)
    app.css         Styles spécifiques à l'écran Plan de charge
```

## Prochaines itérations (hors périmètre de cette version)

Décrites dans le cahier des charges mais non encore construites : semainier
employé, timesheets, vue projet, vue équipe, vue employé (admin), reporting
mensuel, authentification + gestion des droits par rôle.
