/**
 * ZWords - Générateur de grilles mots fléchés (Arrowwords)
 * 
 * Génère des grilles avec cases-définition intégrées.
 * Approche simplifiée: placement itératif de mots avec croisements.
 */

import { createClient } from '@supabase/supabase-js';

// Types de cellules
const CELL_TYPE = {
  EMPTY: 'empty',
  BLACK: 'black',
  LETTER: 'letter',
  CLUE: 'clue'
};

const DIRECTION = {
  RIGHT: 'right',
  DOWN: 'down'
};

/**
 * Classe représentant une grille en construction
 */
class Grid {
  constructor(size) {
    this.size = size;
    this.grid = [];
    this.words = [];
    this.entryCounter = 0;
    
    // Initialiser la grille vide
    for (let r = 0; r < size; r++) {
      this.grid[r] = [];
      for (let c = 0; c < size; c++) {
        this.grid[r][c] = { type: CELL_TYPE.EMPTY, letter: null, clues: [], entryIds: [] };
      }
    }
  }
  
  getCell(r, c) {
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return null;
    return this.grid[r][c];
  }
  
  /**
   * Vérifie si on peut placer un mot à une position
   */
  canPlaceWord(word, startR, startC, direction) {
    const len = word.length;
    
    for (let i = 0; i < len; i++) {
      const r = direction === DIRECTION.DOWN ? startR + i : startR;
      const c = direction === DIRECTION.RIGHT ? startC + i : startC;
      
      const cell = this.getCell(r, c);
      if (!cell) return false;
      
      // La cellule doit être vide ou avoir la même lettre
      if (cell.type === CELL_TYPE.CLUE || cell.type === CELL_TYPE.BLACK) return false;
      if (cell.type === CELL_TYPE.LETTER && cell.letter !== word[i]) return false;
    }
    
    // Vérifier qu'il y a de la place pour la case CLUE avant le mot
    const clueR = direction === DIRECTION.DOWN ? startR - 1 : startR;
    const clueC = direction === DIRECTION.RIGHT ? startC - 1 : startC;
    const clueCell = this.getCell(clueR, clueC);
    
    if (!clueCell) return false;
    if (clueCell.type === CELL_TYPE.LETTER) return false; // Ne peut pas mettre clue sur une lettre
    
    return true;
  }
  
  /**
   * Place un mot dans la grille
   */
  placeWord(wordData, startR, startC, direction) {
    const word = wordData.normalized.toUpperCase();
    const len = word.length;
    
    // Vérifier qu'on peut placer
    if (!this.canPlaceWord(word, startR, startC, direction)) return false;
    
    // Créer l'ID d'entrée
    this.entryCounter++;
    const entryId = `${this.entryCounter}-${direction}`;
    
    // Placer la case CLUE
    const clueR = direction === DIRECTION.DOWN ? startR - 1 : startR;
    const clueC = direction === DIRECTION.RIGHT ? startC - 1 : startC;
    const clueCell = this.getCell(clueR, clueC);
    
    clueCell.type = CELL_TYPE.CLUE;
    clueCell.clues.push({
      direction,
      text: wordData.clue || 'Définition',
      textFull: wordData.clueFull || wordData.clue || 'Définition',
      entryId
    });
    
    // Placer les lettres
    const wordCells = [];
    for (let i = 0; i < len; i++) {
      const r = direction === DIRECTION.DOWN ? startR + i : startR;
      const c = direction === DIRECTION.RIGHT ? startC + i : startC;
      
      const cell = this.getCell(r, c);
      cell.type = CELL_TYPE.LETTER;
      cell.letter = word[i];
      if (!cell.entryIds.includes(entryId)) {
        cell.entryIds.push(entryId);
      }
      wordCells.push([r, c]);
    }
    
    // Enregistrer le mot
    this.words.push({
      word,
      lemma: wordData.lemma,
      clue: wordData.clue,
      direction,
      startR,
      startC,
      clueR,
      clueC,
      entryId,
      cells: wordCells
    });
    
    return true;
  }
  
  /**
   * Trouve toutes les positions possibles pour placer un mot d'une longueur donnée
   */
  findPossiblePositions(length) {
    const positions = [];
    
    // Mots horizontaux (RIGHT)
    for (let r = 0; r < this.size; r++) {
      for (let c = 1; c < this.size - length + 1; c++) {
        positions.push({ r, c, direction: DIRECTION.RIGHT });
      }
    }
    
    // Mots verticaux (DOWN)
    for (let r = 1; r < this.size - length + 1; r++) {
      for (let c = 0; c < this.size; c++) {
        positions.push({ r, c, direction: DIRECTION.DOWN });
      }
    }
    
    return positions;
  }
  
  /**
   * Cherche les contraintes de lettres pour une position
   */
  getConstraints(startR, startC, length, direction) {
    const constraints = [];
    let hasIntersection = false;
    
    for (let i = 0; i < length; i++) {
      const r = direction === DIRECTION.DOWN ? startR + i : startR;
      const c = direction === DIRECTION.RIGHT ? startC + i : startC;
      
      const cell = this.getCell(r, c);
      if (cell && cell.type === CELL_TYPE.LETTER && cell.letter) {
        constraints.push(cell.letter);
        hasIntersection = true;
      } else {
        constraints.push(null);
      }
    }
    
    return { constraints, hasIntersection };
  }
  
  /**
   * Convertit la grille au format final
   */
  toResult() {
    const cells = [];
    let blackCount = 0;
    let letterCount = 0;
    let clueCount = 0;
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        
        if (cell.type === CELL_TYPE.EMPTY) {
          cells.push({ row: r, col: c, type: CELL_TYPE.BLACK });
          blackCount++;
        } else if (cell.type === CELL_TYPE.CLUE) {
          // Transformer les clues en format attendu par le frontend
          const clueData = cell.clues[0]; // Prendre la première clue
          // Trouver le mot correspondant pour avoir la solution
          const wordEntry = this.words.find(w => w.entryId === clueData?.entryId);
          cells.push({ 
            row: r, 
            col: c, 
            type: CELL_TYPE.CLUE,
            clue: clueData?.text || '',
            clueFull: clueData?.textFull || clueData?.text || '',
            answer: wordEntry?.word || '', // Solution pour debug
            direction: clueData?.direction || 'right',
            entryId: clueData?.entryId || ''
          });
          clueCount++;
        } else if (cell.type === CELL_TYPE.LETTER) {
          cells.push({ row: r, col: c, type: CELL_TYPE.LETTER, entryIds: cell.entryIds.join(',') });
          letterCount++;
        } else {
          cells.push({ row: r, col: c, type: cell.type });
        }
      }
    }
    
    const answers = {};
    for (const word of this.words) {
      answers[word.entryId] = {
        word: word.word,
        cells: word.cells
      };
    }
    
    return {
      gridData: { rows: this.size, cols: this.size, cells },
      answers,
      metrics: {
        wordCount: this.words.length,
        letterCount,
        blackCount,
        clueCount
      }
    };
  }
}

/**
 * Générateur de grilles
 */
class ArrowwordGenerator {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.wordCache = null;
    this.cacheTimestamp = 0;
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
  }
  
  /**
   * Charge le cache de mots depuis la base
   */
  async loadWordCache() {
    const now = Date.now();
    if (this.wordCache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return this.wordCache;
    }
    
    console.log('📚 Chargement du cache de mots...');
    
    // Charger avec pagination
    const allWords = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data: words, error } = await this.supabase
        .from('zwords_words')
        .select(`
          id, lemma, normalized, length, frequency, difficulty_score,
          zwords_clues ( clue_text, clue_short, quality_score )
        `)
        .order('frequency', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('❌ Erreur:', error.message);
        break;
      }
      
      if (words && words.length > 0) {
        allWords.push(...words);
        offset += pageSize;
        hasMore = words.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    // Organiser par longueur
    this.wordCache = {};
    for (let len = 2; len <= 15; len++) {
      this.wordCache[len] = [];
    }
    
    let withClues = 0;
    for (const word of allWords) {
      if (!word.zwords_clues || word.zwords_clues.length === 0) continue;
      if (!this.wordCache[word.length]) continue;
      
      // Sélectionner la meilleure définition
      const bestClue = word.zwords_clues.reduce((best, current) => 
        (current.quality_score > best.quality_score) ? current : best
      );
      
      this.wordCache[word.length].push({
        normalized: word.normalized,
        lemma: word.lemma,
        frequency: word.frequency,
        clue: bestClue.clue_short || bestClue.clue_text,
        clueFull: bestClue.clue_text // Version complète pour tooltip
      });
      withClues++;
    }
    
    this.cacheTimestamp = now;
    console.log(`✅ Cache: ${withClues} mots avec définitions`);
    
    // Distribution
    const dist = {};
    for (const [len, words] of Object.entries(this.wordCache)) {
      if (words.length > 0) dist[len] = words.length;
    }
    console.log('📏 Distribution:', dist);
    
    return this.wordCache;
  }
  
  /**
   * Trouve un mot compatible avec des contraintes
   */
  findWord(length, constraints, usedWords) {
    if (!this.wordCache || !this.wordCache[length]) return null;
    
    const candidates = this.wordCache[length].filter(w => !usedWords.has(w.normalized));
    
    // Mélanger pour variété
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    
    for (const word of shuffled) {
      const normalized = word.normalized.toUpperCase();
      let compatible = true;
      
      for (let i = 0; i < constraints.length && compatible; i++) {
        if (constraints[i] && constraints[i] !== normalized[i]) {
          compatible = false;
        }
      }
      
      if (compatible) {
        return word;
      }
    }
    
    return null;
  }
  
  /**
   * Générateur pseudo-aléatoire avec seed
   */
  seededRandom(seed) {
    let s = seed;
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }
  
  /**
   * Génère une grille
   */
  async generate(options = {}) {
    const { size = 10, seed = Date.now() } = options;
    
    console.log(`🎲 Génération grille ${size}x${size}...`);
    
    await this.loadWordCache();
    if (!this.wordCache) {
      throw new Error('Cache de mots non disponible');
    }
    
    const grid = new Grid(size);
    const usedWords = new Set();
    const random = this.seededRandom(seed);
    
    // Longueurs de mots à placer
    const lengths = [4, 5, 6, 5, 4, 7, 3, 6, 8];
    
    // Nombre de mots cible
    const targetWords = Math.floor(size * 2.5);
    let attempts = 0;
    const maxAttempts = 500;
    
    // Direction alternée pour favoriser les croisements
    let preferredDirection = attempts % 2 === 0 ? DIRECTION.RIGHT : DIRECTION.DOWN;
    
    while (grid.words.length < targetWords && attempts < maxAttempts) {
      attempts++;
      
      // Alterner la direction préférée
      preferredDirection = attempts % 2 === 0 ? DIRECTION.RIGHT : DIRECTION.DOWN;
      
      // Choisir une longueur
      const length = lengths[attempts % lengths.length];
      
      // Trouver les positions possibles
      let positions = grid.findPossiblePositions(length);
      
      // Calculer un score pour chaque position
      positions = positions.map(pos => {
        const { constraints, hasIntersection } = grid.getConstraints(pos.r, pos.c, length, pos.direction);
        
        let score = 0;
        
        // Favoriser les intersections (très important)
        if (hasIntersection) score += 100;
        
        // Favoriser la direction préférée
        if (pos.direction === preferredDirection) score += 20;
        
        // Favoriser les positions vers le centre puis s'étendre
        const centerDist = Math.abs(pos.r - size/2) + Math.abs(pos.c - size/2);
        score += (size - centerDist) * 2;
        
        // Ajouter du hasard
        score += random() * 30;
        
        return { ...pos, score, constraints, hasIntersection };
      });
      
      // Trier par score décroissant
      positions.sort((a, b) => b.score - a.score);
      
      // Essayer les meilleures positions
      for (const pos of positions.slice(0, 40)) {
        // Après les 3 premiers mots, fortement préférer les intersections
        if (grid.words.length > 3 && !pos.hasIntersection) {
          if (random() > 0.15) continue; // 85% de chance de skip si pas d'intersection
        }
        
        // Trouver un mot compatible
        const word = this.findWord(length, pos.constraints, usedWords);
        
        if (word) {
          const placed = grid.placeWord(
            { normalized: word.normalized, lemma: word.lemma, clue: word.clue, clueFull: word.clueFull },
            pos.r, pos.c, pos.direction
          );
          
          if (placed) {
            usedWords.add(word.normalized);
            break;
          }
        }
      }
    }
    
    const result = grid.toResult();
    console.log(`📊 Résultat: ${result.metrics.wordCount} mots placés`);
    
    return result;
  }
  
  /**
   * Génère avec plusieurs tentatives
   */
  async generateWithRetry(options = {}) {
    const { maxRetries = 10, ...genOptions } = options;
    
    let bestResult = null;
    let baseSeed = options.seed || Date.now();
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.generate({ ...genOptions, seed: baseSeed + i * 1000 });
        
        if (!bestResult || result.metrics.wordCount > bestResult.metrics.wordCount) {
          bestResult = result;
        }
        
        // Si on a assez de mots, on arrête
        const minWords = genOptions.size >= 12 ? 8 : 6;
        if (result.metrics.wordCount >= minWords) {
          console.log(`✅ Grille acceptable: ${result.metrics.wordCount} mots`);
          return result;
        }
      } catch (error) {
        console.error(`⚠️ Tentative ${i + 1} échouée:`, error.message);
      }
    }
    
    // Retourner la meilleure même si pas parfaite
    if (bestResult && bestResult.metrics.wordCount > 0) {
      console.log(`⚠️ Meilleure grille: ${bestResult.metrics.wordCount} mots`);
      return bestResult;
    }
    
    throw new Error('Impossible de générer une grille');
  }
}

// Singleton
let generatorInstance = null;

function getGenerator() {
  if (!generatorInstance) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    generatorInstance = new ArrowwordGenerator(supabase);
  }
  return generatorInstance;
}

/**
 * Fonction principale
 */
async function generateArrowwordGrid(options = {}) {
  const generator = getGenerator();
  return generator.generateWithRetry(options);
}

export {
  generateArrowwordGrid,
  ArrowwordGenerator,
  Grid,
  CELL_TYPE,
  DIRECTION
};
