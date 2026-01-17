/**
 * Gestionnaire Socket.IO pour les parties
 */

import * as gameService from '../services/gameService.js';
import * as messageService from '../services/messageService.js';
import * as presence from './presence.js';
import { processCellInput, getScoreboard } from './scoring.js';
import { isValidPseudo, isValidColor, isValidCode, isValidCellPosition, isValidCellValue, normalizeCellValue } from '../utils/validation.js';

// Throttle pour les cursor updates (en ms)
const CURSOR_THROTTLE = 50;
const lastCursorUpdate = new Map();

/**
 * Initialise les handlers Socket.IO
 */
export function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`📡 Socket connecté: ${socket.id}`);
    
    /**
     * JOIN_GAME - Rejoindre une partie
     */
    socket.on('join_game', async ({ code, pseudo, color }) => {
      try {
        // Validation
        if (!isValidCode(code)) {
          socket.emit('error', { message: 'Code invalide' });
          return;
        }
        if (!isValidPseudo(pseudo)) {
          socket.emit('error', { message: 'Pseudo invalide' });
          return;
        }
        if (!isValidColor(color)) {
          socket.emit('error', { message: 'Couleur invalide' });
          return;
        }
        
        const gameCode = code.toUpperCase();
        const game = await gameService.getGameByCode(gameCode);
        
        if (!game) {
          socket.emit('error', { message: 'Partie non trouvée' });
          return;
        }
        
        // Rejoindre la room Socket.IO
        socket.join(gameCode);
        
        // Ajouter/mettre a jour le joueur en DB
        await gameService.upsertPlayer(game.id, pseudo.trim(), color);
        
        // Enregistrer la presence
        presence.setPresence(socket.id, gameCode, pseudo, color);
        
        // Log le join
        await messageService.logJoin(game.id, pseudo, color);
        
        // Envoyer l'etat complet au nouveau joueur
        const crossword = await gameService.getCurrentCrossword(game.id);
        const players = await gameService.getPlayers(game.id);
        const cells = crossword ? await gameService.getGridCells(crossword.id) : {};
        const claims = crossword ? await gameService.getEntryClaims(crossword.id) : [];
        const messages = await messageService.getMessages(game.id, 50);
        const presences = presence.getGamePresences(gameCode);
        const scoreboard = await getScoreboard(game.id);
        
        socket.emit('game_state', {
          game: {
            id: game.id,
            code: game.code,
            ownerPseudo: game.owner_pseudo,
            theme: game.theme,
            difficulty: game.difficulty,
            status: game.status
          },
          crossword: crossword ? {
            id: crossword.id,
            indexNumber: crossword.index_number,
            gridData: crossword.grid_data,
            clues: crossword.clues
          } : null,
          cells,
          claims: claims.map(c => ({
            entryId: c.entry_id,
            claimedByPseudo: c.claimed_by_pseudo
          })),
          players: players.map(p => ({
            pseudo: p.pseudo,
            color: p.color,
            scoreTotal: p.score_total
          })),
          messages,
          presence: presences,
          scoreboard
        });
        
        // Notifier les autres joueurs
        socket.to(gameCode).emit('presence_update', {
          pseudo,
          color,
          row: null,
          col: null,
          direction: 'across',
          entryId: null
        });
        
        socket.to(gameCode).emit('message_broadcast', {
          type: 'log_join',
          pseudo,
          color,
          content: `${pseudo} a rejoint la partie`,
          createdAt: new Date().toISOString()
        });
        
        console.log(`✅ ${pseudo} a rejoint la partie ${gameCode}`);
        
      } catch (error) {
        console.error('❌ Erreur join_game:', error);
        socket.emit('error', { message: 'Erreur serveur' });
      }
    });
    
    /**
     * LEAVE_GAME - Quitter une partie
     */
    socket.on('leave_game', async () => {
      await handleLeave(socket);
    });
    
    /**
     * CURSOR_UPDATE - Mise a jour du curseur (throttled)
     */
    socket.on('cursor_update', ({ row, col, direction, entryId }) => {
      // Throttle
      const now = Date.now();
      const lastUpdate = lastCursorUpdate.get(socket.id) || 0;
      if (now - lastUpdate < CURSOR_THROTTLE) {
        return;
      }
      lastCursorUpdate.set(socket.id, now);
      
      // Mettre a jour la presence
      const updated = presence.updateCursor(socket.id, row, col, direction, entryId);
      
      if (updated) {
        // Broadcast aux autres joueurs
        socket.to(updated.gameCode).emit('presence_update', {
          pseudo: updated.pseudo,
          color: updated.color,
          row: updated.row,
          col: updated.col,
          direction: updated.direction,
          entryId: updated.entryId
        });
      }
    });
    
    /**
     * CELL_INPUT - Saisie d'une lettre
     */
    socket.on('cell_input', async ({ row, col, value }) => {
      try {
        const gameInfo = presence.getSocketGameInfo(socket.id);
        if (!gameInfo) {
          socket.emit('error', { message: 'Non connecté à une partie' });
          return;
        }
        
        const { gameCode, pseudo, color } = gameInfo;
        
        // Validation
        if (!isValidCellPosition(row, col)) {
          return;
        }
        if (!isValidCellValue(value)) {
          return;
        }
        
        const normalizedValue = normalizeCellValue(value);
        
        // Recuperer la partie et grille
        const game = await gameService.getGameByCode(gameCode);
        if (!game) return;
        
        const crossword = await gameService.getCurrentCrossword(game.id);
        if (!crossword) return;
        
        // Traiter la saisie
        const result = await processCellInput(
          crossword.id,
          game.id,
          row,
          col,
          normalizedValue,
          pseudo,
          color,
          crossword.clues
        );
        
        // Broadcast la mise a jour de cellule
        io.to(gameCode).emit('cell_update', result.cellUpdate);
        
        // Traiter les entries
        for (const entry of result.entries) {
          if (entry.status === 'claimed') {
            // Mot correct!
            io.to(gameCode).emit('entry_claimed', {
              entryId: entry.entryId,
              pseudo: entry.pseudo,
              color: entry.color,
              word: entry.word
            });
            
            // Mettre a jour le scoreboard
            const scoreboard = await getScoreboard(game.id);
            io.to(gameCode).emit('scoreboard_update', { scores: scoreboard });
            
            // Broadcast le log
            io.to(gameCode).emit('message_broadcast', {
              type: 'log_success',
              pseudo: entry.pseudo,
              color: entry.color,
              content: `${entry.pseudo} a trouvé ${entry.word} !`,
              payload: { entryId: entry.entryId, word: entry.word },
              createdAt: new Date().toISOString()
            });
            
          } else if (entry.status === 'incorrect') {
            // Mot incorrect
            io.to(gameCode).emit('entry_incorrect', {
              entryId: entry.entryId,
              cells: entry.cells
            });
            
            // Broadcast le log
            io.to(gameCode).emit('message_broadcast', {
              type: 'log_fail',
              pseudo,
              color,
              content: `${pseudo} ${entry.word} incorrect`,
              payload: { entryId: entry.entryId, word: entry.word },
              createdAt: new Date().toISOString()
            });
          }
        }
        
        // Grille terminee?
        if (result.gridComplete) {
          const scoreboard = await getScoreboard(game.id);
          io.to(gameCode).emit('grid_completed', {
            finalScores: scoreboard,
            podium: scoreboard.slice(0, 3)
          });
        }
        
      } catch (error) {
        console.error('❌ Erreur cell_input:', error);
      }
    });
    
    /**
     * CHAT_MESSAGE - Message de chat
     */
    socket.on('chat_message', async ({ content }) => {
      try {
        const gameInfo = presence.getSocketGameInfo(socket.id);
        if (!gameInfo) return;
        
        const { gameCode, pseudo, color } = gameInfo;
        
        if (!content || content.trim().length === 0) return;
        if (content.length > 500) return; // Limite de taille
        
        const game = await gameService.getGameByCode(gameCode);
        if (!game) return;
        
        // Enregistrer le message
        const message = await messageService.sendChatMessage(
          game.id,
          pseudo,
          color,
          content.trim()
        );
        
        // Broadcast
        io.to(gameCode).emit('message_broadcast', {
          type: 'chat',
          pseudo,
          color,
          content: content.trim(),
          createdAt: message.created_at
        });
        
      } catch (error) {
        console.error('❌ Erreur chat_message:', error);
      }
    });
    
    /**
     * NEXT_GRID - Nouvelle grille (owner only)
     */
    socket.on('next_grid', async () => {
      try {
        const gameInfo = presence.getSocketGameInfo(socket.id);
        if (!gameInfo) return;
        
        const { gameCode, pseudo } = gameInfo;
        
        const game = await gameService.getGameByCode(gameCode);
        if (!game) return;
        
        // Verifier que c'est l'owner
        if (game.owner_pseudo !== pseudo) {
          socket.emit('error', { message: 'Seul le créateur peut lancer une nouvelle grille' });
          return;
        }
        
        // Creer nouvelle grille
        const newCrossword = await gameService.nextGrid(game.id);
        
        // Log
        await messageService.logNextGrid(game.id, pseudo);
        
        // Broadcast la nouvelle grille
        io.to(gameCode).emit('grid_next', {
          crossword: {
            id: newCrossword.id,
            indexNumber: newCrossword.index_number,
            gridData: newCrossword.grid_data,
            clues: newCrossword.clues
          }
        });
        
        io.to(gameCode).emit('message_broadcast', {
          type: 'log_next',
          pseudo: null,
          color: null,
          content: `Nouvelle grille lancée par ${pseudo}`,
          createdAt: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Erreur next_grid:', error);
      }
    });
    
    /**
     * DISCONNECT - Deconnexion
     */
    socket.on('disconnect', async () => {
      await handleLeave(socket);
      console.log(`📡 Socket déconnecté: ${socket.id}`);
    });
  });
}

/**
 * Gere le depart d'un joueur
 */
async function handleLeave(socket) {
  try {
    const removed = presence.removePresence(socket.id);
    lastCursorUpdate.delete(socket.id);
    
    if (removed) {
      const { gameCode, pseudo } = removed;
      
      socket.leave(gameCode);
      
      // Recuperer la couleur du joueur
      const game = await gameService.getGameByCode(gameCode);
      if (game) {
        const players = await gameService.getPlayers(game.id);
        const player = players.find(p => p.pseudo === pseudo);
        const color = player?.color || '#888888';
        
        // Log le leave
        await messageService.logLeave(game.id, pseudo, color);
        
        // Notifier les autres
        socket.to(gameCode).emit('presence_remove', { pseudo });
        
        socket.to(gameCode).emit('message_broadcast', {
          type: 'log_leave',
          pseudo,
          color,
          content: `${pseudo} a quitté la partie`,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur handleLeave:', error);
  }
}
