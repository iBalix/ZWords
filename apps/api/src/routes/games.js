/**
 * Routes CRUD pour les parties
 */

import { Router } from 'express';
import * as gameService from '../services/gameService.js';
import * as messageService from '../services/messageService.js';
import { isValidPseudo, isValidColor, isValidCode } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/games - Liste des parties actives
 */
router.get('/', async (req, res) => {
  try {
    const games = await gameService.listActiveGames();
    res.json({ games });
  } catch (error) {
    console.error('❌ Erreur liste parties:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/games - Creer une partie
 */
router.post('/', async (req, res) => {
  try {
    const { ownerPseudo, theme, difficulty } = req.body;
    
    if (!isValidPseudo(ownerPseudo)) {
      return res.status(400).json({ error: 'Pseudo invalide' });
    }
    
    const { game, crossword } = await gameService.createGame(
      ownerPseudo.trim(),
      theme || 'general',
      difficulty || 'easy'
    );
    
    res.status(201).json({
      code: game.code,
      gameId: game.id,
      ownerPseudo: game.owner_pseudo
    });
  } catch (error) {
    console.error('❌ Erreur creation partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/games/join - Rejoindre une partie par code
 */
router.post('/join', async (req, res) => {
  try {
    const { code, pseudo, color } = req.body;
    
    if (!isValidCode(code)) {
      return res.status(400).json({ error: 'Code invalide' });
    }
    if (!isValidPseudo(pseudo)) {
      return res.status(400).json({ error: 'Pseudo invalide' });
    }
    if (!isValidColor(color)) {
      return res.status(400).json({ error: 'Couleur invalide' });
    }
    
    const game = await gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvee' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Partie terminee' });
    }
    
    // Ajouter/mettre a jour le joueur
    await gameService.upsertPlayer(game.id, pseudo.trim(), color);
    
    res.json({
      gameId: game.id,
      code: game.code,
      ownerPseudo: game.owner_pseudo,
      theme: game.theme,
      difficulty: game.difficulty
    });
  } catch (error) {
    console.error('❌ Erreur join partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/games/:code - Details d'une partie
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!isValidCode(code)) {
      return res.status(400).json({ error: 'Code invalide' });
    }
    
    const game = await gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvee' });
    }
    
    // Recuperer grille courante (sans answers!)
    const crossword = await gameService.getCurrentCrossword(game.id);
    
    // Recuperer joueurs
    const players = await gameService.getPlayers(game.id);
    
    // Recuperer etat des cellules
    const cells = crossword ? await gameService.getGridCells(crossword.id) : {};
    
    // Recuperer claims
    const claims = crossword ? await gameService.getEntryClaims(crossword.id) : [];
    
    // Recuperer messages
    const messages = await messageService.getMessages(game.id, 50);
    
    res.json({
      game: {
        id: game.id,
        code: game.code,
        ownerPseudo: game.owner_pseudo,
        theme: game.theme,
        difficulty: game.difficulty,
        status: game.status,
        createdAt: game.created_at
      },
      crossword: crossword ? {
        id: crossword.id,
        indexNumber: crossword.index_number,
        gridData: crossword.grid_data,
        clues: crossword.clues
        // PAS de answers!
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
      messages
    });
  } catch (error) {
    console.error('❌ Erreur get partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/games/:code/next - Nouvelle grille (owner only)
 */
router.post('/:code/next', async (req, res) => {
  try {
    const { code } = req.params;
    const { ownerPseudo } = req.body;
    
    const game = await gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvee' });
    }
    
    if (game.owner_pseudo !== ownerPseudo) {
      return res.status(403).json({ error: 'Seul le createur peut lancer une nouvelle grille' });
    }
    
    const newCrossword = await gameService.nextGrid(game.id);
    
    // Log
    await messageService.logNextGrid(game.id, ownerPseudo);
    
    res.json({
      crossword: {
        id: newCrossword.id,
        indexNumber: newCrossword.index_number,
        gridData: newCrossword.grid_data,
        clues: newCrossword.clues
      }
    });
  } catch (error) {
    console.error('❌ Erreur next grille:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/games/:code - Supprimer une partie (owner only)
 */
router.delete('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { ownerPseudo } = req.body;
    
    const game = await gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvee' });
    }
    
    if (game.owner_pseudo !== ownerPseudo) {
      return res.status(403).json({ error: 'Seul le createur peut supprimer la partie' });
    }
    
    await gameService.deleteGame(game.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur delete partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
