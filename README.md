# ZWords

Jeu de mots croises multijoueur en temps reel, concu pour la ZLAN 2026.

## Stack Technique

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + Socket.IO
- **Base de donnees**: Supabase (PostgreSQL)
- **Deploiement**: Railway

## Structure du Projet

```
ZWords/
├── apps/
│   ├── api/          # Backend Express + Socket.IO
│   └── web/          # Frontend React + Vite
├── docs/             # Documentation et scripts SQL
└── package.json      # Scripts monorepo
```

## Installation

```bash
# Cloner le repo
git clone https://github.com/iBalix/ZCrosswords.git ZWords
cd ZWords

# Installer toutes les dependances
npm run install:all
```

## Developpement

```bash
# Lancer API et Web en parallele
npm run dev

# Ou separement
npm run dev:api   # Backend sur http://localhost:3001
npm run dev:web   # Frontend sur http://localhost:5173
```

## Variables d'Environnement

### Backend (apps/api/.env)

```env
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CORS_ORIGIN=http://localhost:5173
```

### Frontend (apps/web/.env)

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Deploiement Railway

1. Connecter le repo GitHub a Railway
2. Creer 2 services:
   - **api**: Root Directory = `apps/api`
   - **web**: Root Directory = `apps/web`
3. Configurer les variables d'environnement
4. Executer `docs/schema.sql` dans Supabase

## Fonctionnalites

- [x] Parties avec code 4 caracteres
- [x] Grille interactive temps reel
- [x] Presence des joueurs (curseurs, couleurs)
- [x] Scoring serveur-side (anti-triche)
- [x] Chat + Logs d'actions
- [x] Historique des grilles terminees
- [x] Animations (validation, erreur, score)

## License

ISC
