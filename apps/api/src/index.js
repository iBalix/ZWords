/**
 * ZWords API - Serveur principal
 * Express + Socket.IO pour jeu de mots croises multijoueur
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import gamesRouter from './routes/games.js';
import historyRouter from './routes/history.js';
import healthRouter from './routes/health.js';
import { initializeSocketHandlers } from './sockets/gameSocket.js';

// Charger les variables d'environnement
dotenv.config();

// Validation des variables obligatoires
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingVars.join(', '));
  console.error('💡 Copiez .env.example vers .env et remplissez les valeurs');
  process.exit(1);
}

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 3001;

// Creer serveur HTTP pour Socket.IO
const httpServer = createServer(app);

// Configuration CORS
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requetes sans origin (curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Liste des origines autorisees
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      corsOrigin
    ].filter(Boolean);
    
    // Verifier si l'origin est autorisee ou contient railway.app
    if (allowedOrigins.includes(origin) || origin.includes('railway.app')) {
      callback(null, true);
    } else {
      console.warn('🚫 Origin refusée:', origin);
      callback(null, true); // Autoriser quand meme pour debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// Initialiser Socket.IO
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middlewares Express
app.use(cors(corsOptions));
app.use(express.json());

// Logger simple
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'ZWords API',
    version: '1.0.0',
    description: 'Jeu de mots croisés multijoueur temps réel',
    endpoints: {
      health: 'GET /api/health',
      games: {
        list: 'GET /api/games',
        create: 'POST /api/games',
        join: 'POST /api/games/join',
        get: 'GET /api/games/:code',
        next: 'POST /api/games/:code/next',
        delete: 'DELETE /api/games/:code'
      },
      history: {
        list: 'GET /api/games/:code/history',
        detail: 'GET /api/games/:code/history/:crosswordId'
      },
      socket: {
        events: [
          'join_game',
          'leave_game', 
          'cursor_update',
          'cell_input',
          'chat_message',
          'next_grid'
        ]
      }
    }
  });
});

app.use('/api/health', healthRouter);
app.use('/api/games', gamesRouter);
app.use('/api/games', historyRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// Initialiser les handlers Socket.IO
initializeSocketHandlers(io);

// Demarrer le serveur
httpServer.listen(PORT, () => {
  console.log('');
  console.log('🎮 ========================================');
  console.log('🎮  ZWords API - Mots Croisés Multijoueur');
  console.log('🎮 ========================================');
  console.log(`🌐  URL: http://localhost:${PORT}`);
  console.log(`📡  Socket.IO: ws://localhost:${PORT}`);
  console.log(`🎲  Games: http://localhost:${PORT}/api/games`);
  console.log('🎮 ========================================');
  console.log('');
});

// Gestion propre de l'arret
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM reçu, arrêt du serveur...');
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT reçu, arrêt du serveur...');
  httpServer.close(() => {
    process.exit(0);
  });
});
