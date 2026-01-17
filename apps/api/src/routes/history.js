/**
 * Routes pour l'historique des grilles
 */

import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import * as gameService from '../services/gameService.js';
import { isValidCode } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/games/:code/history - Liste des grilles terminees
 */
router.get('/:code/history', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!isValidCode(code)) {
      return res.status(400).json({ error: 'Code invalide' });
    }
    
    const game = await gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvee' });
    }
    
    // Recuperer les grilles terminees (avec completed_at)
    const { data: crosswords } = await supabase
      .from('crosswords')
      .select('id, index_number, created_at, completed_at')
      .eq('game_id', game.id)
      .not('completed_at', 'is', null)
      .order('index_number', { ascending: false });
    
    res.json({
      history: (crosswords || []).map(cw => ({
        id: cw.id,
        indexNumber: cw.index_number,
        createdAt: cw.created_at,
        completedAt: cw.completed_at
      }))
    });
  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/games/:code/history/:crosswordId - Details d'une grille historique
 */
router.get('/:code/history/:crosswordId', async (req, res) => {
  try {
    const { code, crosswordId } = req.params;
    
    if (!isValidCode(code)) {
      return res.status(400).json({ error: 'Code invalide' });
    }
    
    const game = await gameService.getGameByCode(code);
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvee' });
    }
    
    // Recuperer la grille avec l'etat final
    const { data: crossword } = await supabase
      .from('crosswords')
      .select('*')
      .eq('id', crosswordId)
      .eq('game_id', game.id)
      .single();
    
    if (!crossword) {
      return res.status(404).json({ error: 'Grille non trouvee' });
    }
    
    // Recuperer les claims pour cette grille
    const { data: claims } = await supabase
      .from('entry_claims')
      .select('entry_id, claimed_by_pseudo, claimed_at')
      .eq('crossword_id', crosswordId);
    
    // Recuperer les joueurs pour les couleurs
    const players = await gameService.getPlayers(game.id);
    const playerColors = {};
    for (const p of players) {
      playerColors[p.pseudo] = p.color;
    }
    
    res.json({
      crossword: {
        id: crossword.id,
        indexNumber: crossword.index_number,
        gridData: crossword.grid_data,
        clues: crossword.clues,
        finalGridState: crossword.final_grid_state,
        finalScores: crossword.final_scores,
        createdAt: crossword.created_at,
        completedAt: crossword.completed_at
      },
      claims: (claims || []).map(c => ({
        entryId: c.entry_id,
        claimedByPseudo: c.claimed_by_pseudo,
        color: playerColors[c.claimed_by_pseudo] || '#888888',
        claimedAt: c.claimed_at
      }))
    });
  } catch (error) {
    console.error('❌ Erreur historique detail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
