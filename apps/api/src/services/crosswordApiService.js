/**
 * Service d'integration avec l'API APIVerve Crossword
 * https://github.com/apiverve/crossword-api
 * 
 * Si l'API n'est pas disponible, utilise le generateur local en fallback
 */

import axios from 'axios';
import { generateCrosswordLocal } from './crosswordLocalGenerator.js';

const APIVERVE_BASE_URL = 'https://api.apiverve.com/v1/crossword';
const APIVERVE_API_KEY = process.env.APIVERVE_API_KEY || '';

/**
 * Genere une grille via l'API APIVerve
 */
async function fetchFromApi(theme = 'general', difficulty = 'medium') {
  if (!APIVERVE_API_KEY) {
    console.log('⚠️ APIVERVE_API_KEY non definie, utilisation du generateur local');
    return null;
  }

  try {
    const sizeMap = {
      'easy': 'small',
      'medium': 'medium',
      'hard': 'large'
    };

    const response = await axios.get(APIVERVE_BASE_URL, {
      params: {
        size: sizeMap[difficulty] || 'medium',
        theme: theme,
        difficulty: difficulty
      },
      headers: {
        'x-api-key': APIVERVE_API_KEY
      },
      timeout: 10000
    });

    if (response.data?.status === 'ok' && response.data?.data) {
      return convertApiResponse(response.data.data);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur API Crossword:', error.message);
    return null;
  }
}

/**
 * Convertit la reponse de l'API au format interne
 */
function convertApiResponse(apiData) {
  // L'API retourne un format specifique qu'on doit convertir
  // pour notre format mots fleches
  
  const { grid, words, rows, cols } = apiData;
  
  if (!grid || !words) {
    return null;
  }

  const cells = [];
  const answers = {};

  // Parcourir les mots pour creer les entries
  for (const wordData of words) {
    const { word, start, direction, definition } = wordData;
    const entryId = `${word.toLowerCase()}_${start.row}_${start.col}`;
    
    // Creer les cellules du mot
    const wordCells = [];
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? start.row : start.row + i;
      const c = direction === 'across' ? start.col + i : start.col;
      wordCells.push([r, c]);
    }
    
    answers[entryId] = {
      answer: word.toUpperCase(),
      cells: wordCells,
      length: word.length
    };
  }

  // Construire la grille de cellules
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gridCell = grid[r]?.[c];
      
      if (!gridCell || gridCell === '#') {
        cells.push({ row: r, col: c, type: 'empty' });
      } else if (typeof gridCell === 'object' && gridCell.clue) {
        cells.push({
          row: r,
          col: c,
          type: 'clue',
          clue: gridCell.clue,
          direction: gridCell.direction === 'across' ? 'right' : 'down',
          entryId: gridCell.entryId
        });
      } else {
        // Trouver les entryIds pour cette cellule
        const entryIds = [];
        for (const [entryId, entry] of Object.entries(answers)) {
          if (entry.cells.some(([er, ec]) => er === r && ec === c)) {
            entryIds.push(entryId);
          }
        }
        
        cells.push({
          row: r,
          col: c,
          type: 'letter',
          entryIds,
          entryId: entryIds.join(',')
        });
      }
    }
  }

  return {
    gridData: { rows, cols, cells },
    answers
  };
}

/**
 * Genere une grille (API avec fallback local)
 */
export async function generateCrossword(theme = 'general', difficulty = 'easy') {
  // Essayer l'API d'abord
  const apiResult = await fetchFromApi(theme, difficulty);
  
  if (apiResult) {
    console.log('✅ Grille generee via API');
    return {
      gridData: apiResult.gridData,
      clues: {},
      answers: apiResult.answers
    };
  }
  
  // Fallback sur le generateur local
  console.log('📦 Utilisation du generateur local');
  return generateCrosswordLocal(theme, difficulty);
}

/**
 * Re-export des fonctions utilitaires
 */
export { checkEntryComplete, isCorrectAnswer } from './crosswordLocalGenerator.js';
