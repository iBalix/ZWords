/**
 * Service d'integration avec l'API APIVerve Crossword
 * https://github.com/apiverve/crossword-api
 * 
 * Si l'API n'est pas disponible, utilise le generateur local en fallback
 */

import axios from 'axios';
import { generateCrosswordLocal, checkEntryComplete, isCorrectAnswer } from './crosswordLocalGenerator.js';

const APIVERVE_BASE_URL = 'https://api.apiverve.com/v1/crossword';

// Themes valides pour l'API APIVerve
const VALID_THEMES = ['random', 'animals', 'food', 'sports', 'science', 'geography'];

/**
 * Recupere la cle API (lecture dynamique pour permettre le rechargement)
 */
function getApiKey() {
  return process.env.APIVERVE_API_KEY || '';
}

/**
 * Convertit un theme local en theme API valide
 */
function getApiTheme(localTheme) {
  if (VALID_THEMES.includes(localTheme)) {
    return localTheme;
  }
  return 'random';
}

/**
 * Genere une grille via l'API APIVerve
 */
async function fetchFromApi(theme = 'general', difficulty = 'medium') {
  const apiKey = getApiKey();
  
  console.log('🔑 APIVERVE_API_KEY presente:', apiKey ? 'OUI (' + apiKey.substring(0, 8) + '...)' : 'NON');
  
  if (!apiKey) {
    console.log('⚠️ APIVERVE_API_KEY non definie, utilisation du generateur local');
    return null;
  }

  try {
    const apiTheme = getApiTheme(theme);
    console.log('🌐 Appel API APIVerve... theme:', apiTheme);
    
    const sizeMap = {
      'easy': 'small',
      'medium': 'medium',
      'hard': 'large'
    };

    const response = await axios.get(APIVERVE_BASE_URL, {
      params: {
        size: sizeMap[difficulty] || 'medium',
        theme: apiTheme,
        difficulty: difficulty
      },
      headers: {
        'x-api-key': apiKey
      },
      timeout: 15000
    });

    console.log('📥 Reponse API:', response.status, response.data?.status);

    if (response.data?.status === 'ok' && response.data?.data) {
      console.log('✅ Donnees recues de l\'API');
      return convertApiResponse(response.data.data);
    }
    
    console.log('⚠️ Reponse API invalide');
    return null;
  } catch (error) {
    console.error('❌ Erreur API Crossword:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
    return null;
  }
}

/**
 * Trouve la position d'un mot dans la grille
 */
function findWordInGrid(grid, word, direction) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const wordUpper = word.toUpperCase();
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === wordUpper[0]) {
        // Verifier si le mot correspond dans cette direction
        let match = true;
        
        if (direction === 'across') {
          if (c + wordUpper.length > cols) continue;
          for (let i = 0; i < wordUpper.length; i++) {
            if (grid[r][c + i] !== wordUpper[i]) {
              match = false;
              break;
            }
          }
        } else {
          if (r + wordUpper.length > rows) continue;
          for (let i = 0; i < wordUpper.length; i++) {
            if (grid[r + i][c] !== wordUpper[i]) {
              match = false;
              break;
            }
          }
        }
        
        if (match) {
          return { row: r, col: c };
        }
      }
    }
  }
  
  return null;
}

/**
 * Convertit la reponse de l'API au format interne mots fleches
 * 
 * Format API APIVerve:
 * {
 *   size: 10,
 *   grid: [[null, "A", ...], ...],
 *   across: [{ number: 1, clue: "...", answer: "WORD", length: 4 }, ...],
 *   down: [{ number: 1, clue: "...", answer: "WORD", length: 4 }, ...]
 * }
 */
function convertApiResponse(apiData) {
  console.log('🔄 Conversion de la reponse API...');
  
  const grid = apiData.grid;
  if (!grid || !grid.length) {
    console.log('⚠️ Grille vide dans la reponse');
    return null;
  }
  
  const originalRows = grid.length;
  const originalCols = grid[0]?.length || 0;
  
  console.log('📏 Grille originale:', originalRows, 'x', originalCols);
  
  // Extraire les mots avec leurs positions depuis la grille
  let words = [];
  
  if (apiData.across) {
    for (const clue of apiData.across) {
      const word = clue.answer || clue.word;
      const pos = findWordInGrid(grid, word, 'across');
      if (pos) {
        words.push({
          word: word.toUpperCase(),
          definition: clue.clue || clue.hint || 'Definition',
          row: pos.row,
          col: pos.col,
          direction: 'across',
          number: clue.number,
          length: word.length
        });
        console.log('  ➡️ ACROSS:', word, 'at', pos.row, pos.col);
      } else {
        console.log('  ⚠️ Mot non trouve:', word);
      }
    }
  }
  
  if (apiData.down) {
    for (const clue of apiData.down) {
      const word = clue.answer || clue.word;
      const pos = findWordInGrid(grid, word, 'down');
      if (pos) {
        words.push({
          word: word.toUpperCase(),
          definition: clue.clue || clue.hint || 'Definition',
          row: pos.row,
          col: pos.col,
          direction: 'down',
          number: clue.number,
          length: word.length
        });
        console.log('  ⬇️ DOWN:', word, 'at', pos.row, pos.col);
      } else {
        console.log('  ⚠️ Mot non trouve:', word);
      }
    }
  }
  
  console.log('📝 Mots trouves:', words.length);
  
  if (words.length === 0) {
    console.log('⚠️ Aucun mot trouve dans la grille');
    return null;
  }

  // Ajouter 1 pour les definitions (format mots fleches)
  const finalRows = originalRows + 1;
  const finalCols = originalCols + 1;
  
  const cells = [];
  const answers = {};
  const gridMap = {};

  // Creer les entries et marquer les cases de lettres
  for (const wordData of words) {
    const entryId = `${wordData.word.toLowerCase()}_${wordData.row}_${wordData.col}`;
    
    // Creer les cellules du mot (decalees de +1 pour la definition)
    const wordCells = [];
    for (let i = 0; i < wordData.length; i++) {
      const r = wordData.direction === 'across' ? wordData.row + 1 : wordData.row + 1 + i;
      const c = wordData.direction === 'across' ? wordData.col + 1 + i : wordData.col + 1;
      wordCells.push([r, c]);
      
      const key = `${r}-${c}`;
      if (!gridMap[key]) {
        gridMap[key] = { type: 'letter', entryIds: [] };
      }
      gridMap[key].entryIds.push(entryId);
    }
    
    answers[entryId] = {
      answer: wordData.word,
      cells: wordCells,
      length: wordData.length,
      definition: wordData.definition
    };
    
    // Placer la definition (case avant le premier caractere)
    const defRow = wordData.direction === 'across' ? wordData.row + 1 : wordData.row;
    const defCol = wordData.direction === 'across' ? wordData.col : wordData.col + 1;
    
    const defKey = `${defRow}-${defCol}`;
    if (!gridMap[defKey] || gridMap[defKey].type !== 'letter') {
      gridMap[defKey] = {
        type: 'clue',
        clue: wordData.definition,
        direction: wordData.direction === 'across' ? 'right' : 'down',
        entryId
      };
    }
  }

  console.log('📦 Entries creees:', Object.keys(answers).length);
  console.log('📊 GridMap entries:', Object.keys(gridMap).length);

  // Construire le tableau de cellules
  for (let r = 0; r < finalRows; r++) {
    for (let c = 0; c < finalCols; c++) {
      const key = `${r}-${c}`;
      const cellData = gridMap[key];
      
      if (!cellData) {
        cells.push({ row: r, col: c, type: 'empty' });
      } else if (cellData.type === 'clue') {
        cells.push({
          row: r,
          col: c,
          type: 'clue',
          clue: cellData.clue,
          direction: cellData.direction,
          entryId: cellData.entryId
        });
      } else {
        cells.push({
          row: r,
          col: c,
          type: 'letter',
          entryIds: cellData.entryIds,
          entryId: cellData.entryIds.join(',')
        });
      }
    }
  }

  console.log('✅ Conversion terminee:', cells.length, 'cellules,', Object.keys(answers).length, 'mots');

  return {
    gridData: { rows: finalRows, cols: finalCols, cells },
    answers
  };
}

/**
 * Genere une grille (API avec fallback local)
 */
export async function generateCrossword(theme = 'general', difficulty = 'easy') {
  console.log('🎲 Generation de grille - theme:', theme, 'difficulte:', difficulty);
  
  // Essayer l'API d'abord
  const apiResult = await fetchFromApi(theme, difficulty);
  
  if (apiResult) {
    console.log('✅ Grille generee via API APIVerve');
    return {
      gridData: apiResult.gridData,
      clues: {},
      answers: apiResult.answers
    };
  }
  
  // Fallback sur le generateur local
  console.log('📦 Fallback sur le generateur local');
  return generateCrosswordLocal(theme, difficulty);
}

/**
 * Re-export des fonctions utilitaires
 */
export { checkEntryComplete, isCorrectAnswer };
