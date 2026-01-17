/**
 * Service de gestion des grilles de mots fleches
 * V1: Grilles pre-generees stockees en memoire
 * 
 * Format mots fleches:
 * - Pas de cases noires
 * - Les definitions sont dans des cases speciales avec fleches
 * - Les fleches indiquent la direction de la reponse
 */

// Grilles de demonstration pour V1 - Format Mots Fleches
// Type de cellule: 'letter' (pour ecrire) ou 'clue' (definition avec fleche)
const DEMO_CROSSWORDS = [
  {
    theme: 'general',
    difficulty: 'easy',
    rows: 8,
    cols: 10,
    // Grille avec definitions integrees
    cells: [
      // Row 0
      { row: 0, col: 0, type: 'clue', clue: 'Planète rouge', direction: 'right' },
      { row: 0, col: 1, type: 'letter', entryId: '1-right' },
      { row: 0, col: 2, type: 'letter', entryId: '1-right' },
      { row: 0, col: 3, type: 'letter', entryId: '1-right' },
      { row: 0, col: 4, type: 'letter', entryId: '1-right' },
      { row: 0, col: 5, type: 'clue', clue: 'Couleur du ciel', direction: 'down' },
      { row: 0, col: 6, type: 'clue', clue: 'Animal qui miaule', direction: 'right' },
      { row: 0, col: 7, type: 'letter', entryId: '3-right' },
      { row: 0, col: 8, type: 'letter', entryId: '3-right' },
      { row: 0, col: 9, type: 'letter', entryId: '3-right' },
      // Row 1
      { row: 1, col: 0, type: 'clue', clue: 'Capitale France', direction: 'down' },
      { row: 1, col: 1, type: 'letter', entryId: '4-down' },
      { row: 1, col: 2, type: 'clue', clue: 'Saison chaude', direction: 'right' },
      { row: 1, col: 3, type: 'letter', entryId: '5-right' },
      { row: 1, col: 4, type: 'letter', entryId: '5-right' },
      { row: 1, col: 5, type: 'letter', entryId: '2-down' },
      { row: 1, col: 6, type: 'clue', clue: 'Fruit jaune', direction: 'down' },
      { row: 1, col: 7, type: 'letter', entryId: '7-down' },
      { row: 1, col: 8, type: 'clue', clue: 'Liquide vital', direction: 'right' },
      { row: 1, col: 9, type: 'letter', entryId: '8-right' },
      // Row 2
      { row: 2, col: 0, type: 'letter', entryId: '4-down' },
      { row: 2, col: 1, type: 'letter', entryId: '4-down' },
      { row: 2, col: 2, type: 'letter', entryId: '4-down' },
      { row: 2, col: 3, type: 'clue', clue: 'Nombre 10', direction: 'down' },
      { row: 2, col: 4, type: 'clue', clue: 'Astre nuit', direction: 'right' },
      { row: 2, col: 5, type: 'letter', entryId: '2-down,10-right' },
      { row: 2, col: 6, type: 'letter', entryId: '10-right' },
      { row: 2, col: 7, type: 'letter', entryId: '7-down,10-right' },
      { row: 2, col: 8, type: 'letter', entryId: '10-right' },
      { row: 2, col: 9, type: 'clue', clue: 'Note musique', direction: 'down' },
      // Row 3
      { row: 3, col: 0, type: 'clue', clue: 'Roi animaux', direction: 'right' },
      { row: 3, col: 1, type: 'letter', entryId: '11-right' },
      { row: 3, col: 2, type: 'letter', entryId: '11-right' },
      { row: 3, col: 3, type: 'letter', entryId: '9-down,11-right' },
      { row: 3, col: 4, type: 'letter', entryId: '11-right' },
      { row: 3, col: 5, type: 'letter', entryId: '2-down' },
      { row: 3, col: 6, type: 'clue', clue: 'Partie corps', direction: 'right' },
      { row: 3, col: 7, type: 'letter', entryId: '7-down,12-right' },
      { row: 3, col: 8, type: 'letter', entryId: '12-right' },
      { row: 3, col: 9, type: 'letter', entryId: '13-down,12-right' },
      // Row 4
      { row: 4, col: 0, type: 'clue', clue: 'Oiseau noir', direction: 'down' },
      { row: 4, col: 1, type: 'clue', clue: 'Métal jaune', direction: 'right' },
      { row: 4, col: 2, type: 'letter', entryId: '15-right' },
      { row: 4, col: 3, type: 'letter', entryId: '9-down,15-right' },
      { row: 4, col: 4, type: 'clue', clue: 'Véhicule', direction: 'down' },
      { row: 4, col: 5, type: 'letter', entryId: '2-down' },
      { row: 4, col: 6, type: 'letter', entryId: '17-down' },
      { row: 4, col: 7, type: 'letter', entryId: '7-down' },
      { row: 4, col: 8, type: 'clue', clue: 'Temps passé', direction: 'right' },
      { row: 4, col: 9, type: 'letter', entryId: '13-down,18-right' },
      // Row 5
      { row: 5, col: 0, type: 'letter', entryId: '14-down' },
      { row: 5, col: 1, type: 'clue', clue: 'Fleur rouge', direction: 'right' },
      { row: 5, col: 2, type: 'letter', entryId: '19-right' },
      { row: 5, col: 3, type: 'letter', entryId: '19-right' },
      { row: 5, col: 4, type: 'letter', entryId: '16-down,19-right' },
      { row: 5, col: 5, type: 'letter', entryId: '19-right' },
      { row: 5, col: 6, type: 'letter', entryId: '17-down' },
      { row: 5, col: 7, type: 'clue', clue: 'Sentiment fort', direction: 'down' },
      { row: 5, col: 8, type: 'clue', clue: 'Bruit fort', direction: 'right' },
      { row: 5, col: 9, type: 'letter', entryId: '13-down,20-right' },
      // Row 6
      { row: 6, col: 0, type: 'letter', entryId: '14-down' },
      { row: 6, col: 1, type: 'letter', entryId: '14-down' },
      { row: 6, col: 2, type: 'clue', clue: 'Contraire oui', direction: 'right' },
      { row: 6, col: 3, type: 'letter', entryId: '21-right' },
      { row: 6, col: 4, type: 'letter', entryId: '16-down,21-right' },
      { row: 6, col: 5, type: 'letter', entryId: '21-right' },
      { row: 6, col: 6, type: 'letter', entryId: '17-down' },
      { row: 6, col: 7, type: 'letter', entryId: '22-down' },
      { row: 6, col: 8, type: 'clue', clue: 'Jour repos', direction: 'right' },
      { row: 6, col: 9, type: 'letter', entryId: '23-right' },
      // Row 7
      { row: 7, col: 0, type: 'letter', entryId: '14-down' },
      { row: 7, col: 1, type: 'clue', clue: 'Petit insecte', direction: 'right' },
      { row: 7, col: 2, type: 'letter', entryId: '24-right' },
      { row: 7, col: 3, type: 'letter', entryId: '24-right' },
      { row: 7, col: 4, type: 'letter', entryId: '16-down,24-right' },
      { row: 7, col: 5, type: 'letter', entryId: '24-right' },
      { row: 7, col: 6, type: 'letter', entryId: '17-down,24-right' },
      { row: 7, col: 7, type: 'letter', entryId: '22-down,24-right' },
      { row: 7, col: 8, type: 'letter', entryId: '24-right' },
      { row: 7, col: 9, type: 'clue', clue: 'FIN', direction: 'none' },
    ],
    // Reponses par entryId
    answers: {
      '1-right': { answer: 'MARS', cells: [[0,1],[0,2],[0,3],[0,4]] },
      '2-down': { answer: 'BLEU', cells: [[1,5],[2,5],[3,5],[4,5]] },
      '3-right': { answer: 'CHAT', cells: [[0,7],[0,8],[0,9]] },
      '4-down': { answer: 'PARIS', cells: [[1,1],[2,0],[2,1],[2,2]] },
      '5-right': { answer: 'ETE', cells: [[1,3],[1,4]] },
      '7-down': { answer: 'BANANE', cells: [[1,7],[2,7],[3,7],[4,7]] },
      '8-right': { answer: 'EAU', cells: [[1,9]] },
      '9-down': { answer: 'DIX', cells: [[3,3],[4,3]] },
      '10-right': { answer: 'LUNE', cells: [[2,5],[2,6],[2,7],[2,8]] },
      '11-right': { answer: 'LION', cells: [[3,1],[3,2],[3,3],[3,4]] },
      '12-right': { answer: 'MAIN', cells: [[3,7],[3,8],[3,9]] },
      '13-down': { answer: 'NOIR', cells: [[3,9],[4,9],[5,9],[6,9]] },
      '14-down': { answer: 'CORBEAU', cells: [[5,0],[6,0],[6,1],[7,0]] },
      '15-right': { answer: 'OR', cells: [[4,2],[4,3]] },
      '16-down': { answer: 'AUTO', cells: [[5,4],[6,4],[7,4]] },
      '17-down': { answer: 'ROUTE', cells: [[4,6],[5,6],[6,6],[7,6]] },
      '18-right': { answer: 'HIER', cells: [[4,9]] },
      '19-right': { answer: 'ROSE', cells: [[5,2],[5,3],[5,4],[5,5]] },
      '20-right': { answer: 'CRI', cells: [[5,9]] },
      '21-right': { answer: 'NON', cells: [[6,3],[6,4],[6,5]] },
      '22-down': { answer: 'AMOUR', cells: [[6,7],[7,7]] },
      '23-right': { answer: 'DIMANCHE', cells: [[6,9]] },
      '24-right': { answer: 'FOURMI', cells: [[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8]] },
    }
  }
];

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
      entryIds: cell.entryId ? cell.entryId.split(',') : [],
      value: '' // Vide au depart pour les lettres
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
  const crossword = DEMO_CROSSWORDS[0];
  
  return {
    gridData: buildClientGrid(crossword),
    clues: {}, // Plus besoin de clues separees, elles sont dans la grille
    answers: buildAnswersMap(crossword)
  };
}

/**
 * Trouve quelles entries contiennent une cellule
 * @param {Array} cells - Les cellules de la grille
 * @param {number} row
 * @param {number} col
 * @returns {Array<string>} Liste d'entry IDs
 */
export function findEntriesAtCell(cells, row, col) {
  const cell = cells.find(c => c.row === row && c.col === col);
  if (!cell || cell.type !== 'letter') return [];
  
  return cell.entryIds || [];
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
