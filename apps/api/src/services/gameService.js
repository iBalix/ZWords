/**
 * Service de gestion des parties
 */

import { supabase } from '../config/supabase.js';
import { generateUniqueCode } from '../utils/codeGenerator.js';
import { generateCrossword } from './crosswordService.js';

/**
 * Verifie si un code de partie existe
 */
async function codeExists(code) {
  const { data } = await supabase
    .from('zwords_games')
    .select('id')
    .eq('code', code)
    .single();
  return !!data;
}

/**
 * Cree une nouvelle partie
 */
export async function createGame(ownerPseudo, theme = 'general', difficulty = 'easy') {
  // Generer code unique
  const code = await generateUniqueCode(codeExists);
  
  // Generer la grille
  const { gridData, clues, answers } = generateCrossword(theme, difficulty);
  
  // Creer la partie
  const { data: game, error: gameError } = await supabase
    .from('zwords_games')
    .insert({
      code,
      owner_pseudo: ownerPseudo,
      theme,
      difficulty,
      status: 'active'
    })
    .select()
    .single();
  
  if (gameError) {
    throw new Error('Erreur creation partie: ' + gameError.message);
  }
  
  // Creer la grille
  const { data: crossword, error: crosswordError } = await supabase
    .from('zwords_crosswords')
    .insert({
      game_id: game.id,
      index_number: 1,
      grid_data: gridData,
      clues,
      answers_encrypted: answers
    })
    .select()
    .single();
  
  if (crosswordError) {
    throw new Error('Erreur creation grille: ' + crosswordError.message);
  }
  
  // Mettre a jour current_crossword_id
  await supabase
    .from('zwords_games')
    .update({ current_crossword_id: crossword.id })
    .eq('id', game.id);
  
  return {
    game: { ...game, current_crossword_id: crossword.id },
    crossword
  };
}

/**
 * Recupere une partie par son code
 */
export async function getGameByCode(code) {
  const { data: game, error } = await supabase
    .from('zwords_games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  
  if (error || !game) {
    return null;
  }
  
  return game;
}

/**
 * Recupere la grille courante d'une partie
 */
export async function getCurrentCrossword(gameId) {
  const { data: game } = await supabase
    .from('zwords_games')
    .select('current_crossword_id')
    .eq('id', gameId)
    .single();
  
  if (!game?.current_crossword_id) {
    return null;
  }
  
  const { data: crossword } = await supabase
    .from('zwords_crosswords')
    .select('id, game_id, index_number, grid_data, clues, created_at')
    .eq('id', game.current_crossword_id)
    .single();
  
  return crossword;
}

/**
 * Recupere les joueurs d'une partie
 */
export async function getPlayers(gameId) {
  const { data: players } = await supabase
    .from('zwords_players')
    .select('*')
    .eq('game_id', gameId)
    .order('score_total', { ascending: false });
  
  return players || [];
}

/**
 * Ajoute ou met a jour un joueur
 */
export async function upsertPlayer(gameId, pseudo, color) {
  const { data: player, error } = await supabase
    .from('zwords_players')
    .upsert({
      game_id: gameId,
      pseudo,
      color,
      last_seen: new Date().toISOString()
    }, {
      onConflict: 'game_id,pseudo'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Erreur upsert player:', error);
    throw error;
  }
  
  return player;
}

/**
 * Recupere l'etat des cellules de la grille courante
 */
export async function getGridCells(crosswordId) {
  const { data: cells } = await supabase
    .from('zwords_grid_cells')
    .select('*')
    .eq('crossword_id', crosswordId);
  
  // Convertir en map { "row-col": value }
  const cellsMap = {};
  for (const cell of (cells || [])) {
    cellsMap[`${cell.row}-${cell.col}`] = cell.value;
  }
  
  return cellsMap;
}

/**
 * Met a jour une cellule
 */
export async function updateCell(crosswordId, row, col, value, pseudo) {
  const { error } = await supabase
    .from('zwords_grid_cells')
    .upsert({
      crossword_id: crosswordId,
      row,
      col,
      value: value.toUpperCase(),
      updated_by_pseudo: pseudo,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'crossword_id,row,col'
    });
  
  if (error) {
    console.error('Erreur update cell:', error);
    throw error;
  }
}

/**
 * Recupere les claims d'une grille
 */
export async function getEntryClaims(crosswordId) {
  const { data: claims } = await supabase
    .from('zwords_entry_claims')
    .select('*')
    .eq('crossword_id', crosswordId);
  
  return claims || [];
}

/**
 * Verifie si une entry est deja claim
 */
export async function isEntryClaimed(crosswordId, entryId) {
  const { data } = await supabase
    .from('zwords_entry_claims')
    .select('id')
    .eq('crossword_id', crosswordId)
    .eq('entry_id', entryId)
    .single();
  
  return !!data;
}

/**
 * Claim une entry et attribue le point
 */
export async function claimEntry(crosswordId, entryId, pseudo) {
  // Insert claim
  const { error: claimError } = await supabase
    .from('zwords_entry_claims')
    .insert({
      crossword_id: crosswordId,
      entry_id: entryId,
      claimed_by_pseudo: pseudo
    });
  
  if (claimError) {
    console.error('Erreur claim entry:', claimError);
    throw claimError;
  }
  
  // Recuperer game_id depuis crossword
  const { data: crossword } = await supabase
    .from('zwords_crosswords')
    .select('game_id')
    .eq('id', crosswordId)
    .single();
  
  // Incrementer score du joueur
  const { error: scoreError } = await supabase.rpc('zwords_increment_player_score', {
    p_game_id: crossword.game_id,
    p_pseudo: pseudo
  });
  
  // Si la fonction RPC n'existe pas, faire manuellement
  if (scoreError) {
    const { data: player } = await supabase
      .from('zwords_players')
      .select('score_total')
      .eq('game_id', crossword.game_id)
      .eq('pseudo', pseudo)
      .single();
    
    if (player) {
      await supabase
        .from('zwords_players')
        .update({ score_total: (player.score_total || 0) + 1 })
        .eq('game_id', crossword.game_id)
        .eq('pseudo', pseudo);
    }
  }
}

/**
 * Recupere les reponses (cote serveur uniquement)
 */
export async function getAnswers(crosswordId) {
  const { data: crossword } = await supabase
    .from('zwords_crosswords')
    .select('answers_encrypted')
    .eq('id', crosswordId)
    .single();
  
  return crossword?.answers_encrypted || {};
}

/**
 * Verifie si la grille est terminee
 */
export async function isGridComplete(crosswordId) {
  const { data: crossword } = await supabase
    .from('zwords_crosswords')
    .select('answers_encrypted')
    .eq('id', crosswordId)
    .single();
  
  if (!crossword) return false;
  
  // Compter le nombre d'entries dans answers_encrypted
  const answers = crossword.answers_encrypted || {};
  const totalEntries = Object.keys(answers).length;
  
  const { count } = await supabase
    .from('zwords_entry_claims')
    .select('*', { count: 'exact', head: true })
    .eq('crossword_id', crosswordId);
  
  return count >= totalEntries;
}

/**
 * Archive la grille courante et en cree une nouvelle
 */
export async function nextGrid(gameId) {
  // Recuperer la grille courante
  const { data: game } = await supabase
    .from('zwords_games')
    .select('*, zwords_crosswords!current_crossword_id(*)')
    .eq('id', gameId)
    .single();
  
  if (!game) throw new Error('Partie non trouvee');
  
  const currentCrossword = game.zwords_crosswords;
  
  // Recuperer l'etat final des cellules
  const finalCells = await getGridCells(currentCrossword.id);
  
  // Recuperer les scores actuels
  const players = await getPlayers(gameId);
  const finalScores = players.map(p => ({
    pseudo: p.pseudo,
    color: p.color,
    score: p.score_total
  }));
  
  // Mettre a jour la grille avec l'etat final
  await supabase
    .from('zwords_crosswords')
    .update({
      final_grid_state: finalCells,
      final_scores: finalScores,
      completed_at: new Date().toISOString()
    })
    .eq('id', currentCrossword.id);
  
  // Creer nouvelle grille
  const { gridData, clues, answers } = generateCrossword(game.theme, game.difficulty);
  
  const { data: newCrossword, error } = await supabase
    .from('zwords_crosswords')
    .insert({
      game_id: gameId,
      index_number: currentCrossword.index_number + 1,
      grid_data: gridData,
      clues,
      answers_encrypted: answers
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Mettre a jour la partie
  await supabase
    .from('zwords_games')
    .update({ current_crossword_id: newCrossword.id })
    .eq('id', gameId);
  
  return newCrossword;
}

/**
 * Recupere la liste des parties actives
 */
export async function listActiveGames() {
  const { data: games } = await supabase
    .from('zwords_games')
    .select(`
      id,
      code,
      owner_pseudo,
      theme,
      difficulty,
      status,
      created_at,
      zwords_players(count)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  return (games || []).map(g => ({
    ...g,
    playerCount: g.zwords_players?.[0]?.count || 0
  }));
}

/**
 * Supprime une partie
 */
export async function deleteGame(gameId) {
  await supabase
    .from('zwords_games')
    .delete()
    .eq('id', gameId);
}
