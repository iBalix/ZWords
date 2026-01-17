/**
 * Logique de scoring et verification des reponses
 */

import * as gameService from '../services/gameService.js';
import * as messageService from '../services/messageService.js';
import { findEntriesAtCell, checkEntryComplete, isCorrectAnswer } from '../services/crosswordService.js';

/**
 * Traite une saisie de cellule et verifie les entries impactees
 * @returns {{ cellUpdate, entries: Array<{ entryId, status, word, pseudo, color }> }}
 */
export async function processCellInput(crosswordId, gameId, row, col, value, pseudo, color, clues) {
  const result = {
    cellUpdate: { row, col, value, pseudo },
    entries: [],
    gridComplete: false
  };
  
  // Mettre a jour la cellule en DB
  await gameService.updateCell(crosswordId, row, col, value, pseudo);
  
  // Recuperer l'etat actuel des cellules
  const gridCells = await gameService.getGridCells(crosswordId);
  
  // Mettre a jour avec la nouvelle valeur
  gridCells[`${row}-${col}`] = value.toUpperCase();
  
  // Trouver les entries qui passent par cette cellule
  const entryIds = findEntriesAtCell(clues, row, col);
  
  // Recuperer les reponses (cote serveur uniquement)
  const answers = await gameService.getAnswers(crosswordId);
  
  for (const entryId of entryIds) {
    const entry = answers[entryId];
    if (!entry) continue;
    
    // Verifier si l'entry est complete
    const { complete, word } = checkEntryComplete(gridCells, entry);
    
    if (complete) {
      // Verifier si deja claim
      const alreadyClaimed = await gameService.isEntryClaimed(crosswordId, entryId);
      
      if (alreadyClaimed) {
        // Ne rien faire, deja trouve
        continue;
      }
      
      // Log la tentative
      await messageService.logAttempt(gameId, pseudo, color, entryId, word);
      
      // Verifier si correct
      const correct = isCorrectAnswer(word, entry.answer);
      
      if (correct) {
        // Claim l'entry et attribuer le point
        await gameService.claimEntry(crosswordId, entryId, pseudo);
        
        // Log le succes
        await messageService.logSuccess(gameId, pseudo, color, entryId, word);
        
        result.entries.push({
          entryId,
          status: 'claimed',
          word,
          pseudo,
          color
        });
      } else {
        // Log l'echec
        await messageService.logFail(gameId, pseudo, color, entryId, word);
        
        // Recuperer les cellules de l'entry pour l'animation
        const entryCells = [];
        for (let i = 0; i < entry.length; i++) {
          const r = entry.direction === 'across' ? entry.row : entry.row + i;
          const c = entry.direction === 'across' ? entry.col + i : entry.col;
          entryCells.push({ row: r, col: c });
        }
        
        result.entries.push({
          entryId,
          status: 'incorrect',
          word,
          cells: entryCells
        });
      }
    }
  }
  
  // Verifier si la grille est terminee
  if (result.entries.some(e => e.status === 'claimed')) {
    result.gridComplete = await gameService.isGridComplete(crosswordId);
  }
  
  return result;
}

/**
 * Recupere le scoreboard d'une partie
 */
export async function getScoreboard(gameId) {
  const players = await gameService.getPlayers(gameId);
  
  return players
    .map(p => ({
      pseudo: p.pseudo,
      color: p.color,
      score: p.score_total
    }))
    .sort((a, b) => b.score - a.score);
}
