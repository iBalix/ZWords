/**
 * Logique de scoring et verification des reponses
 */

import * as gameService from '../services/gameService.js';
import * as messageService from '../services/messageService.js';

/**
 * Vérifie si un mot est complet et correct
 */
function checkWord(entryId, answers, gridCells, currentRow, currentCol, currentValue) {
  const entry = answers[entryId];
  if (!entry) {
    console.log(`❌ Entry ${entryId} non trouvée dans answers`);
    return { complete: false, correct: false, word: '' };
  }
  
  // L'API utilise "answer" comme clé, le générateur local "word"
  const expectedWord = entry.answer || entry.word;
  const cells = entry.cells; // [[r,c], [r,c], ...]
  
  if (!expectedWord || !cells || cells.length === 0) {
    console.log(`❌ Entry ${entryId} mal formée:`, entry);
    return { complete: false, correct: false, word: '' };
  }
  
  // Reconstruire le mot saisi
  let word = '';
  let debugLetters = [];
  
  for (const [r, c] of cells) {
    const key = `${r}-${c}`;
    let letter;
    
    // Utiliser la valeur courante si c'est la cellule qu'on vient de taper
    if (r === currentRow && c === currentCol) {
      letter = currentValue;
    } else {
      letter = gridCells[key];
    }
    
    if (!letter || letter.length === 0) {
      // Mot pas complet
      return { complete: false, correct: false, word: '' };
    }
    
    word += letter.toUpperCase();
    debugLetters.push(`(${r},${c})=${letter}`);
  }
  
  // Mot complet - vérifier s'il est correct
  const correct = word === expectedWord.toUpperCase();
  
  console.log(`🔤 Mot ${entryId}: attendu="${expectedWord}", saisi="${word}", cells=[${debugLetters.join(', ')}], correct=${correct}`);
  
  return { complete: true, correct, word };
}

/**
 * Traite une saisie de cellule et verifie les entries impactees
 */
export async function processCellInput(crosswordId, gameId, row, col, value, pseudo, color, gridData) {
  const result = {
    cellUpdate: { row, col, value, pseudo },
    entries: [],
    gridComplete: false
  };
  
  // Mettre a jour la cellule en DB
  await gameService.updateCell(crosswordId, row, col, value, pseudo);
  
  // Recuperer l'etat actuel des cellules
  const gridCells = await gameService.getGridCells(crosswordId);
  
  // IMPORTANT: Forcer la mise à jour avec la nouvelle valeur
  // (au cas où getGridCells retourne avant que l'upsert soit commité)
  const normalizedValue = value.toUpperCase();
  gridCells[`${row}-${col}`] = normalizedValue;
  
  console.log(`📝 Cellule (${row},${col}) = "${normalizedValue}"`);
  
  // Trouver la cellule dans gridData
  const cellsArray = Array.isArray(gridData?.cells) ? gridData.cells : [];
  const cell = cellsArray.find(c => c.row === row && c.col === col);
  
  if (!cell || cell.type !== 'letter') {
    console.log(`⚠️ Cellule (${row},${col}) non trouvée ou pas une lettre`);
    return result;
  }
  
  // Récupérer les entryIds de cette cellule
  let entryIds = [];
  if (typeof cell.entryIds === 'string') {
    entryIds = cell.entryIds.split(',').filter(Boolean);
  } else if (Array.isArray(cell.entryIds)) {
    entryIds = cell.entryIds;
  }
  
  if (entryIds.length === 0) {
    console.log(`⚠️ Cellule (${row},${col}) sans entryIds`);
    return result;
  }
  
  console.log(`🔍 Validation cellule (${row},${col}): entryIds =`, entryIds);
  
  // Recuperer les reponses (cote serveur uniquement)
  const answers = await gameService.getAnswers(crosswordId);
  
  if (!answers || Object.keys(answers).length === 0) {
    console.log(`❌ Pas de answers pour crossword ${crosswordId}`);
    return result;
  }
  
  for (const entryId of entryIds) {
    // Verifier si deja claim
    const alreadyClaimed = await gameService.isEntryClaimed(crosswordId, entryId);
    if (alreadyClaimed) {
      console.log(`⏭️ Entry ${entryId} déjà claim`);
      continue;
    }
    
    // Vérifier le mot (en passant la valeur courante pour éviter les race conditions)
    const { complete, correct, word } = checkWord(entryId, answers, gridCells, row, col, normalizedValue);
    
    if (!complete) {
      continue;
    }
    
    // Log la tentative
    await messageService.logAttempt(gameId, pseudo, color, entryId, word);
    
    if (correct) {
      // Claim l'entry et attribuer le point
      await gameService.claimEntry(crosswordId, entryId, pseudo);
      
      // Log le succes
      await messageService.logSuccess(gameId, pseudo, color, entryId, word);
      
      const entryCells = answers[entryId].cells.map(([r, c]) => ({ row: r, col: c }));
      
      result.entries.push({
        entryId,
        status: 'claimed',
        word,
        pseudo,
        color,
        cells: entryCells
      });
      
      console.log(`✅ Mot ${word} validé pour ${pseudo} !`);
    } else {
      // Log l'echec
      await messageService.logFail(gameId, pseudo, color, entryId, word);
      
      const entryCells = answers[entryId].cells.map(([r, c]) => ({ row: r, col: c }));
      
      result.entries.push({
        entryId,
        status: 'incorrect',
        word,
        cells: entryCells
      });
      
      console.log(`❌ Mot ${word} incorrect`);
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
