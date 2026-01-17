/**
 * Service de gestion des grilles de mots croises
 * V1: Grilles pre-generees stockees en memoire
 */

// Grilles de demonstration pour V1
// Format: grid[row][col] = { letter, isBlack }
const DEMO_CROSSWORDS = [
  {
    theme: 'general',
    difficulty: 'easy',
    rows: 10,
    cols: 10,
    grid: generateDemoGrid(10, 10),
    clues: {
      across: [
        { number: 1, row: 0, col: 0, length: 5, clue: 'Planete rouge', answer: 'MARS' },
        { number: 4, row: 2, col: 0, length: 6, clue: 'Capitale de la France', answer: 'PARIS' },
        { number: 6, row: 4, col: 0, length: 4, clue: 'Animal qui miaule', answer: 'CHAT' },
        { number: 8, row: 6, col: 2, length: 5, clue: 'Saison chaude', answer: 'ETE' },
        { number: 9, row: 8, col: 0, length: 7, clue: 'Fruit jaune courbe', answer: 'BANANE' }
      ],
      down: [
        { number: 1, row: 0, col: 0, length: 4, clue: 'Couleur du ciel', answer: 'BLEU' },
        { number: 2, row: 0, col: 2, length: 6, clue: 'Astre de la nuit', answer: 'LUNE' },
        { number: 3, row: 0, col: 4, length: 5, clue: 'Liquide vital', answer: 'EAU' },
        { number: 5, row: 2, col: 6, length: 4, clue: 'Nombre apres neuf', answer: 'DIX' },
        { number: 7, row: 4, col: 8, length: 3, clue: 'Organe de la vision', answer: 'OEIL' }
      ]
    }
  },
  {
    theme: 'cinema',
    difficulty: 'medium',
    rows: 12,
    cols: 12,
    grid: generateDemoGrid(12, 12),
    clues: {
      across: [
        { number: 1, row: 0, col: 0, length: 5, clue: 'Film de science-fiction avec E.T.', answer: 'ALIEN' },
        { number: 3, row: 2, col: 1, length: 6, clue: 'Realisateur de Pulp Fiction', answer: 'TARANTINO' },
        { number: 5, row: 4, col: 0, length: 4, clue: 'Film d\'animation avec un poisson clown', answer: 'NEMO' },
        { number: 7, row: 6, col: 2, length: 7, clue: 'Saga avec Dark Vador', answer: 'STARWARS' },
        { number: 9, row: 8, col: 0, length: 5, clue: 'Film avec Leonardo DiCaprio sur un bateau', answer: 'TITANIC' }
      ],
      down: [
        { number: 2, row: 0, col: 2, length: 6, clue: 'Acteur de Matrix', answer: 'KEANU' },
        { number: 4, row: 2, col: 4, length: 5, clue: 'Film avec un requin', answer: 'JAWS' },
        { number: 6, row: 4, col: 6, length: 4, clue: 'Studio d\'animation japonais', answer: 'GHIBLI' },
        { number: 8, row: 6, col: 8, length: 3, clue: 'Actrice de Pretty Woman', answer: 'JULIA' }
      ]
    }
  }
];

/**
 * Genere une grille de demonstration avec des cases noires aleatoires
 */
function generateDemoGrid(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      // ~20% de cases noires de maniere aleatoire mais reproductible
      const isBlack = ((r * 7 + c * 11) % 5 === 0);
      row.push({
        isBlack,
        number: null // Sera rempli par buildGridWithNumbers
      });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Construit les donnees de grille a envoyer au client (sans reponses)
 */
function buildClientGrid(crossword) {
  const { rows, cols, clues } = crossword;
  const cells = [];
  
  // Creer matrice de cellules
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isBlack = crossword.grid[r][c].isBlack;
      
      // Trouver si cette cellule a un numero
      let number = null;
      for (const clue of [...clues.across, ...clues.down]) {
        if (clue.row === r && clue.col === c) {
          number = clue.number;
          break;
        }
      }
      
      cells.push({
        row: r,
        col: c,
        isBlack,
        number,
        value: '' // Vide au depart
      });
    }
  }
  
  return {
    rows,
    cols,
    cells
  };
}

/**
 * Construit les indices a envoyer au client
 */
function buildClientClues(crossword) {
  return {
    across: crossword.clues.across.map(c => ({
      number: c.number,
      row: c.row,
      col: c.col,
      length: c.length,
      clue: c.clue
      // PAS de answer!
    })),
    down: crossword.clues.down.map(c => ({
      number: c.number,
      row: c.row,
      col: c.col,
      length: c.length,
      clue: c.clue
    }))
  };
}

/**
 * Construit la map des reponses (cote serveur uniquement)
 */
function buildAnswersMap(crossword) {
  const answers = {};
  
  for (const clue of crossword.clues.across) {
    answers[`${clue.number}-across`] = {
      answer: clue.answer,
      row: clue.row,
      col: clue.col,
      length: clue.length,
      direction: 'across'
    };
  }
  
  for (const clue of crossword.clues.down) {
    answers[`${clue.number}-down`] = {
      answer: clue.answer,
      row: clue.row,
      col: clue.col,
      length: clue.length,
      direction: 'down'
    };
  }
  
  return answers;
}

/**
 * Genere une nouvelle grille pour une partie
 * @param {string} theme - Theme souhaite
 * @param {string} difficulty - Niveau de difficulte
 * @returns {Object} { gridData, clues, answers }
 */
export function generateCrossword(theme = 'general', difficulty = 'easy') {
  // V1: Selectionner une grille de demo aleatoire
  const matching = DEMO_CROSSWORDS.filter(cw => 
    cw.theme === theme || cw.difficulty === difficulty
  );
  
  const crossword = matching.length > 0 
    ? matching[Math.floor(Math.random() * matching.length)]
    : DEMO_CROSSWORDS[0];
  
  return {
    gridData: buildClientGrid(crossword),
    clues: buildClientClues(crossword),
    answers: buildAnswersMap(crossword)
  };
}

/**
 * Trouve quelles entries passent par une cellule
 * @param {Object} clues - Les indices
 * @param {number} row
 * @param {number} col
 * @returns {Array<string>} Liste d'entry IDs (ex: ["1-across", "2-down"])
 */
export function findEntriesAtCell(clues, row, col) {
  const entries = [];
  
  for (const clue of clues.across) {
    if (row === clue.row && col >= clue.col && col < clue.col + clue.length) {
      entries.push(`${clue.number}-across`);
    }
  }
  
  for (const clue of clues.down) {
    if (col === clue.col && row >= clue.row && row < clue.row + clue.length) {
      entries.push(`${clue.number}-down`);
    }
  }
  
  return entries;
}

/**
 * Verifie si une entry est complete (toutes les cellules remplies)
 * @param {Object} gridCells - Map des cellules { "row-col": value }
 * @param {Object} entry - Definition de l'entry
 * @returns {{ complete: boolean, word: string }}
 */
export function checkEntryComplete(gridCells, entry) {
  let word = '';
  
  for (let i = 0; i < entry.length; i++) {
    const r = entry.direction === 'across' ? entry.row : entry.row + i;
    const c = entry.direction === 'across' ? entry.col + i : entry.col;
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
