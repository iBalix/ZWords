/**
 * Service de gestion des grilles de mots fleches
 * V1: Grilles pre-generees stockees en memoire
 * 
 * Format mots fleches:
 * - Pas de cases noires
 * - Les definitions sont dans des cases speciales avec fleches
 * - Les fleches indiquent la direction de la reponse
 */

// Grille de demonstration - Format Mots Fleches simple
const DEMO_CROSSWORD = {
  theme: 'general',
  difficulty: 'easy',
  rows: 6,
  cols: 8,
  cells: [
    // Row 0
    { row: 0, col: 0, type: 'clue', clue: 'Planète rouge', direction: 'right' },
    { row: 0, col: 1, type: 'letter', entryId: 'mars' },
    { row: 0, col: 2, type: 'letter', entryId: 'mars' },
    { row: 0, col: 3, type: 'letter', entryId: 'mars' },
    { row: 0, col: 4, type: 'letter', entryId: 'mars' },
    { row: 0, col: 5, type: 'clue', clue: 'Animal miaule', direction: 'down' },
    { row: 0, col: 6, type: 'clue', clue: 'Couleur ciel', direction: 'down' },
    { row: 0, col: 7, type: 'clue', clue: 'Roi animaux', direction: 'down' },
    // Row 1
    { row: 1, col: 0, type: 'clue', clue: 'Saison chaude', direction: 'right' },
    { row: 1, col: 1, type: 'letter', entryId: 'ete' },
    { row: 1, col: 2, type: 'letter', entryId: 'ete' },
    { row: 1, col: 3, type: 'letter', entryId: 'ete' },
    { row: 1, col: 4, type: 'clue', clue: 'Astre nuit', direction: 'right' },
    { row: 1, col: 5, type: 'letter', entryId: 'chat,lune' },
    { row: 1, col: 6, type: 'letter', entryId: 'bleu,lune' },
    { row: 1, col: 7, type: 'letter', entryId: 'lion,lune' },
    // Row 2
    { row: 2, col: 0, type: 'clue', clue: 'Contraire oui', direction: 'right' },
    { row: 2, col: 1, type: 'letter', entryId: 'non' },
    { row: 2, col: 2, type: 'letter', entryId: 'non' },
    { row: 2, col: 3, type: 'letter', entryId: 'non' },
    { row: 2, col: 4, type: 'clue', clue: 'Métal jaune', direction: 'right' },
    { row: 2, col: 5, type: 'letter', entryId: 'chat,or' },
    { row: 2, col: 6, type: 'letter', entryId: 'bleu,or' },
    { row: 2, col: 7, type: 'letter', entryId: 'lion' },
    // Row 3
    { row: 3, col: 0, type: 'clue', clue: 'Fleur rouge', direction: 'right' },
    { row: 3, col: 1, type: 'letter', entryId: 'rose' },
    { row: 3, col: 2, type: 'letter', entryId: 'rose' },
    { row: 3, col: 3, type: 'letter', entryId: 'rose' },
    { row: 3, col: 4, type: 'letter', entryId: 'rose' },
    { row: 3, col: 5, type: 'letter', entryId: 'chat' },
    { row: 3, col: 6, type: 'letter', entryId: 'bleu' },
    { row: 3, col: 7, type: 'letter', entryId: 'lion' },
    // Row 4
    { row: 4, col: 0, type: 'clue', clue: 'Liquide vital', direction: 'right' },
    { row: 4, col: 1, type: 'letter', entryId: 'eau' },
    { row: 4, col: 2, type: 'letter', entryId: 'eau' },
    { row: 4, col: 3, type: 'letter', entryId: 'eau' },
    { row: 4, col: 4, type: 'clue', clue: 'FIN', direction: 'none' },
    { row: 4, col: 5, type: 'clue', clue: 'FIN', direction: 'none' },
    { row: 4, col: 6, type: 'clue', clue: 'FIN', direction: 'none' },
    { row: 4, col: 7, type: 'clue', clue: 'FIN', direction: 'none' },
  ],
  answers: {
    'mars': { answer: 'MARS', cells: [[0,1],[0,2],[0,3],[0,4]] },
    'chat': { answer: 'CHAT', cells: [[1,5],[2,5],[3,5]] },
    'bleu': { answer: 'BLEU', cells: [[1,6],[2,6],[3,6]] },
    'lion': { answer: 'LION', cells: [[1,7],[2,7],[3,7]] },
    'ete': { answer: 'ETE', cells: [[1,1],[1,2],[1,3]] },
    'lune': { answer: 'LUN', cells: [[1,5],[1,6],[1,7]] },
    'non': { answer: 'NON', cells: [[2,1],[2,2],[2,3]] },
    'or': { answer: 'OR', cells: [[2,5],[2,6]] },
    'rose': { answer: 'ROSE', cells: [[3,1],[3,2],[3,3],[3,4]] },
    'eau': { answer: 'EAU', cells: [[4,1],[4,2],[4,3]] },
  }
};

/**
 * Construit les donnees de grille a envoyer au client (sans reponses)
 */
function buildClientGrid(crossword) {
  const { rows, cols, cells } = crossword;
  
  return {
    rows,
    cols,
    cells: cells.map(cell => ({
      row: cell.row,
      col: cell.col,
      type: cell.type,
      clue: cell.clue || null,
      direction: cell.direction || null,
      // Convertir entryId string en tableau entryIds
      entryIds: cell.entryId ? cell.entryId.split(',') : [],
      // Garder aussi entryId original pour le backend
      entryId: cell.entryId || null
    }))
  };
}

/**
 * Construit la map des reponses (cote serveur uniquement)
 */
function buildAnswersMap(crossword) {
  const answers = {};
  
  for (const [entryId, data] of Object.entries(crossword.answers)) {
    answers[entryId] = {
      answer: data.answer,
      cells: data.cells, // [[row, col], ...]
      length: data.answer.length
    };
  }
  
  return answers;
}

/**
 * Genere une nouvelle grille pour une partie
 * @param {string} theme - Theme souhaite
 * @param {string} difficulty - Niveau de difficulte
 * @returns {Object} { gridData, answers }
 */
export function generateCrossword(theme = 'general', difficulty = 'easy') {
  // V1: Utiliser la grille de demo
  const crossword = DEMO_CROSSWORD;
  
  return {
    gridData: buildClientGrid(crossword),
    clues: {}, // Plus besoin de clues separees, elles sont dans la grille
    answers: buildAnswersMap(crossword)
  };
}

/**
 * Verifie si une entry est complete (toutes les cellules remplies)
 * @param {Object} gridCells - Map des cellules { "row-col": value }
 * @param {Object} entry - Definition de l'entry { answer, cells }
 * @returns {{ complete: boolean, word: string }}
 */
export function checkEntryComplete(gridCells, entry) {
  let word = '';
  
  for (const [r, c] of entry.cells) {
    const key = `${r}-${c}`;
    const value = gridCells[key];
    
    if (!value || value === '') {
      return { complete: false, word: '' };
    }
    word += value;
  }
  
  return { complete: true, word: word.toUpperCase() };
}

/**
 * Verifie si un mot est correct
 * @param {string} word - Mot entre par le joueur
 * @param {string} answer - Reponse correcte
 * @returns {boolean}
 */
export function isCorrectAnswer(word, answer) {
  return word.toUpperCase() === answer.toUpperCase();
}
