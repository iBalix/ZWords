# Deploiement ZWords sur Railway

## Pre-requis

1. Compte Railway connecte a GitHub
2. Projet Supabase cree avec les tables (executer `docs/schema.sql`)

## Etape 1: Creer le projet Railway

1. Aller sur [Railway Dashboard](https://railway.app/dashboard)
2. Cliquer sur **New Project**
3. Choisir **Deploy from GitHub repo**
4. Selectionner le repo `iBalix/ZWords`

## Etape 2: Creer le service API

1. Dans le projet Railway, cliquer **Add New Service > GitHub Repo**
2. Selectionner `iBalix/ZWords`
3. Configurer les settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. Ajouter les variables d'environnement:
   ```
   PORT=3001
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   CORS_ORIGIN=https://zwords-web.up.railway.app
   ```

## Etape 3: Creer le service Web

1. Cliquer **Add New Service > GitHub Repo**
2. Selectionner `iBalix/ZWords`
3. Configurer les settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`

4. Ajouter les variables d'environnement:
   ```
   PORT=4173
   VITE_API_URL=https://zwords-api.up.railway.app
   VITE_SOCKET_URL=https://zwords-api.up.railway.app
   ```

## Etape 4: Configuration WebSocket

Railway supporte nativement WebSocket. Verifier:
- Le service API expose Socket.IO sur le meme port que l'API HTTP
- CORS est configure pour accepter le domaine du frontend

## Etape 5: Executer les migrations DB

1. Aller dans le Supabase Dashboard
2. Ouvrir l'editeur SQL
3. Coller et executer le contenu de `docs/schema.sql`

## Checklist de validation

- [ ] API repond sur `/api/health`
- [ ] Socket.IO connecte (tester dans la console du navigateur)
- [ ] CORS fonctionne (pas d'erreur reseau)
- [ ] Variables d'environnement correctes (logs Railway)
- [ ] Base de donnees accessible (tester creation d'une partie)
- [ ] WebSocket temps reel fonctionne (ouvrir 2 navigateurs)

## URLs finales

- **API**: `https://zwords-api.up.railway.app`
- **Frontend**: `https://zwords-web.up.railway.app`
- **Health check**: `https://zwords-api.up.railway.app/api/health`

## Troubleshooting

### Erreur CORS
Verifier que `CORS_ORIGIN` dans l'API contient bien l'URL du frontend.

### WebSocket ne connecte pas
- Verifier que `VITE_SOCKET_URL` est correct
- Verifier les logs du service API sur Railway

### Base de donnees non accessible
- Verifier les credentials Supabase
- Verifier que les tables sont creees

### Build echoue
- Verifier les logs de build sur Railway
- S'assurer que le `Root Directory` est correct
