/**
 * Service de generation de grilles de mots fleches
 * Generateur avec vrais mots entrecroisés
 */

// Dictionnaire de mots francais avec definitions
const FRENCH_WORDS = [
  // 3 lettres
  { word: 'AIR', definition: 'Gaz respiré' },
  { word: 'EAU', definition: 'Liquide vital' },
  { word: 'FEU', definition: 'Flamme brûlante' },
  { word: 'SOL', definition: 'Surface terrestre' },
  { word: 'MER', definition: 'Étendue salée' },
  { word: 'RUE', definition: 'Voie urbaine' },
  { word: 'VIE', definition: 'Existence' },
  { word: 'NID', definition: 'Abri d\'oiseau' },
  { word: 'ROI', definition: 'Monarque' },
  { word: 'BLE', definition: 'Céréale dorée' },
  { word: 'THE', definition: 'Boisson chaude' },
  { word: 'RIZ', definition: 'Céréale asiatique' },
  // 4 lettres
  { word: 'MARS', definition: 'Planète rouge' },
  { word: 'LUNE', definition: 'Astre nocturne' },
  { word: 'CHAT', definition: 'Animal qui miaule' },
  { word: 'LION', definition: 'Roi des animaux' },
  { word: 'ROSE', definition: 'Fleur épineuse' },
  { word: 'BLEU', definition: 'Couleur du ciel' },
  { word: 'NOIR', definition: 'Couleur sombre' },
  { word: 'VERT', definition: 'Couleur nature' },
  { word: 'PAIN', definition: 'Aliment boulanger' },
  { word: 'LAIT', definition: 'Boisson blanche' },
  { word: 'BOIS', definition: 'Matériau arbre' },
  { word: 'PEUR', definition: 'Émotion effrayante' },
  { word: 'JOIE', definition: 'Bonheur intense' },
  { word: 'NUIT', definition: 'Période sombre' },
  { word: 'JOUR', definition: 'Période claire' },
  { word: 'ANGE', definition: 'Être céleste' },
  { word: 'REVE', definition: 'Songe nocturne' },
  { word: 'CAFE', definition: 'Boisson noire' },
  { word: 'DENT', definition: 'Os de bouche' },
  { word: 'MAIN', definition: 'Extrémité du bras' },
  { word: 'PIED', definition: 'Base du corps' },
  { word: 'TETE', definition: 'Sommet du corps' },
  // 5 lettres
  { word: 'SOLEIL', definition: 'Astre du jour' },
  { word: 'TERRE', definition: 'Notre planète' },
  { word: 'MONDE', definition: 'Univers habité' },
  { word: 'COEUR', definition: 'Organe vital' },
  { word: 'AMOUR', definition: 'Sentiment fort' },
  { word: 'ROUGE', definition: 'Couleur sang' },
  { word: 'BLANC', definition: 'Couleur neige' },
  { word: 'TABLE', definition: 'Meuble plat' },
  { word: 'ARBRE', definition: 'Végétal ligneux' },
  { word: 'FLEUR', definition: 'Organe coloré' },
  { word: 'OCEAN', definition: 'Grande étendue' },
  { word: 'NUAGE', definition: 'Vapeur céleste' },
  { word: 'PLUIE', definition: 'Eau tombante' },
  { word: 'NEIGE', definition: 'Flocons blancs' },
  { word: 'OMBRE', definition: 'Zone obscure' },
  { word: 'LIVRE', definition: 'Ouvrage écrit' },
  { word: 'ECOLE', definition: 'Lieu d\'études' },
  { word: 'VERRE', definition: 'Récipient transparent' },
  { word: 'FRUIT', definition: 'Produit végétal' },
  { word: 'SUCRE', definition: 'Poudre douce' },
  // 6+ lettres
  { word: 'ORANGE', definition: 'Agrume coloré' },
  { word: 'BANANE', definition: 'Fruit jaune courbé' },
  { word: 'MAISON', definition: 'Habitation' },
  { word: 'JARDIN', definition: 'Espace vert' },
  { word: 'FENETRE', definition: 'Ouverture vitrée' },
  { word: 'MONTAGNE', definition: 'Relief élevé' },
  { word: 'CUISINE', definition: 'Pièce des repas' },
  { word: 'VOITURE', definition: 'Véhicule automobile' },
  { word: 'AVION', definition: 'Appareil volant' },
  { word: 'BATEAU', definition: 'Navire flottant' },
  { word: 'CHEVAL', definition: 'Équidé domestique' },
  { word: 'PAPILLON', definition: 'Insecte ailé' },
];

/**
 * Generateur de grille de mots fleches
 */
class CrosswordGenerator {
  constructor(rows = 8, cols = 10) {
    this.rows = rows;
    this.cols = cols;
    this.grid = [];
    this.words = [];
    this.cells = [];
    this.usedWords = new Set();
  }

  /**
   * Initialise une grille vide
   */
  initGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid.push(new Array(this.cols).fill(null));
    }
  }

  /**
   * Verifie si un mot peut etre place a une position
   */
  canPlaceWord(word, startRow, startCol, direction) {
    const len = word.length;
    
    // Verifier les limites (laisser place pour la case definition)
    if (direction === 'right') {
      if (startCol + len > this.cols) return false;
      if (startCol < 1) return false; // Besoin d'une case pour la definition
    } else {
      if (startRow + len > this.rows) return false;
      if (startRow < 1) return false; // Besoin d'une case pour la definition
    }

    // Verifier chaque lettre
    for (let i = 0; i < len; i++) {
      const r = direction === 'right' ? startRow : startRow + i;
      const c = direction === 'right' ? startCol + i : startCol;
      
      const cell = this.grid[r][c];
      
      if (cell !== null) {
        // Case deja occupee - verifier si meme lettre (croisement)
        if (cell.type === 'letter' && cell.letter === word[i]) {
          continue; // OK, croisement valide
        }
        return false; // Conflit
      }
    }

    return true;
  }

  /**
   * Place un mot sur la grille
   */
  placeWord(wordData, startRow, startCol, direction) {
    const { word, definition } = wordData;
    const entryId = `${word.toLowerCase()}_${startRow}_${startCol}`;
    
    // Placer la case definition
    const defRow = direction === 'right' ? startRow : startRow - 1;
    const defCol = direction === 'right' ? startCol - 1 : startCol;
    
    this.grid[defRow][defCol] = {
      type: 'clue',
      clue: definition,
      direction: direction === 'right' ? 'right' : 'down',
      entryId
    };

    // Placer les lettres
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'right' ? startRow : startRow + i;
      const c = direction === 'right' ? startCol + i : startCol;
      
      if (this.grid[r][c] === null) {
        this.grid[r][c] = {
          type: 'letter',
          letter: word[i],
          entryIds: [entryId]
        };
      } else if (this.grid[r][c].type === 'letter') {
        // Croisement - ajouter l'entryId
        this.grid[r][c].entryIds.push(entryId);
      }
    }

    this.words.push({
      entryId,
      word,
      definition,
      startRow,
      startCol,
      direction,
      cells: Array.from({ length: word.length }, (_, i) => [
        direction === 'right' ? startRow : startRow + i,
        direction === 'right' ? startCol + i : startCol
      ])
    });

    this.usedWords.add(word);
  }

  /**
   * Trouve des croisements possibles avec les mots existants
   */
  findIntersections(word) {
    const intersections = [];
    
    for (const placedWord of this.words) {
      for (let i = 0; i < placedWord.word.length; i++) {
        const letter = placedWord.word[i];
        const letterIndex = word.indexOf(letter);
        
        if (letterIndex !== -1) {
          // Lettre commune trouvee
          const [r, c] = placedWord.cells[i];
          
          // Essayer direction opposee
          const newDir = placedWord.direction === 'right' ? 'down' : 'right';
          const startRow = newDir === 'right' ? r : r - letterIndex;
          const startCol = newDir === 'right' ? c - letterIndex : c;
          
          if (startRow >= 1 && startCol >= 1) {
            intersections.push({ startRow, startCol, direction: newDir, letter, index: letterIndex });
          }
        }
      }
    }
    
    return intersections;
  }

  /**
   * Genere une grille complete
   */
  generate() {
    this.initGrid();
    
    // Melanger les mots
    const shuffledWords = [...FRENCH_WORDS].sort(() => Math.random() - 0.5);
    
    // Placer le premier mot horizontalement au centre
    const firstWord = shuffledWords.find(w => w.word.length >= 4 && w.word.length <= 6);
    if (firstWord) {
      const startRow = Math.floor(this.rows / 2);
      const startCol = 1;
      if (this.canPlaceWord(firstWord.word, startRow, startCol, 'right')) {
        this.placeWord(firstWord, startRow, startCol, 'right');
      }
    }

    // Essayer de placer plus de mots
    let attempts = 0;
    const maxAttempts = 200;
    
    while (this.words.length < 8 && attempts < maxAttempts) {
      attempts++;
      
      // Trouver un mot aleatoire non utilise
      const candidate = shuffledWords.find(w => 
        !this.usedWords.has(w.word) && 
        w.word.length >= 3 && 
        w.word.length <= 7
      );
      
      if (!candidate) break;
      
      // Trouver des intersections possibles
      const intersections = this.findIntersections(candidate.word);
      
      for (const inter of intersections) {
        if (this.canPlaceWord(candidate.word, inter.startRow, inter.startCol, inter.direction)) {
          this.placeWord(candidate, inter.startRow, inter.startCol, inter.direction);
          break;
        }
      }
      
      // Si pas de croisement, essayer position aleatoire
      if (!this.usedWords.has(candidate.word)) {
        const direction = Math.random() > 0.5 ? 'right' : 'down';
        const startRow = direction === 'down' ? 1 : Math.floor(Math.random() * (this.rows - 2)) + 1;
        const startCol = direction === 'right' ? 1 : Math.floor(Math.random() * (this.cols - candidate.word.length));
        
        if (this.canPlaceWord(candidate.word, startRow, startCol, direction)) {
          this.placeWord(candidate, startRow, startCol, direction);
        }
      }
    }

    // Construire le tableau de cellules
    this.buildCells();
    
    return this.getResult();
  }

  /**
   * Construit le tableau de cellules pour le client
   */
  buildCells() {
    this.cells = [];
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        
        if (cell === null) {
          // Case vide - devenir case de remplissage grise
          this.cells.push({
            row: r,
            col: c,
            type: 'empty'
          });
        } else if (cell.type === 'clue') {
          this.cells.push({
            row: r,
            col: c,
            type: 'clue',
            clue: cell.clue,
            direction: cell.direction,
            entryId: cell.entryId
          });
        } else if (cell.type === 'letter') {
          this.cells.push({
            row: r,
            col: c,
            type: 'letter',
            entryIds: cell.entryIds,
            entryId: cell.entryIds.join(',')
          });
        }
      }
    }
  }

  /**
   * Retourne le resultat final
   */
  getResult() {
    // Construire les reponses
    const answers = {};
    for (const word of this.words) {
      answers[word.entryId] = {
        answer: word.word,
        cells: word.cells,
        length: word.word.length
      };
    }

    return {
      gridData: {
        rows: this.rows,
        cols: this.cols,
        cells: this.cells
      },
      answers
    };
  }
}

/**
 * Genere une nouvelle grille pour une partie
 */
export function generateCrossword(theme = 'general', difficulty = 'easy') {
  const rows = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;
  const cols = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 15;
  
  const generator = new CrosswordGenerator(rows, cols);
  const { gridData, answers } = generator.generate();
  
  return {
    gridData,
    clues: {}, // Les clues sont dans la grille
    answers
  };
}

/**
 * Verifie si une entry est complete
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
 */
export function isCorrectAnswer(word, answer) {
  return word.toUpperCase() === answer.toUpperCase();
}
