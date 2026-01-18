/**
 * ZWords - Utilitaires de normalisation de texte
 * Gestion des accents et nettoyage pour mots fléchés français
 */

/**
 * Table de correspondance accents -> ASCII
 */
const ACCENT_MAP = {
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
  'Ç': 'C',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
  'Ñ': 'N',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Œ': 'OE',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
  'Ý': 'Y', 'Ÿ': 'Y',
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
  'ç': 'c',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ñ': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'œ': 'oe',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ý': 'y', 'ÿ': 'y'
};

/**
 * Normalise un texte en remplaçant les accents par leur équivalent ASCII
 * @param {string} text - Texte à normaliser
 * @returns {string} - Texte normalisé sans accents
 */
function normalizeAccents(text) {
  if (!text) return '';
  return text
    .split('')
    .map(char => ACCENT_MAP[char] || char)
    .join('');
}

/**
 * Normalise un mot pour la grille (majuscules, sans accents)
 * @param {string} word - Mot à normaliser
 * @returns {string} - Mot normalisé pour la grille
 */
function normalizeWord(word) {
  if (!word) return '';
  return normalizeAccents(word)
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/**
 * Vérifie si un mot est valide pour une grille
 * @param {string} word - Mot à vérifier
 * @param {number} minLength - Longueur minimum (défaut: 2)
 * @param {number} maxLength - Longueur maximum (défaut: 15)
 * @returns {boolean}
 */
function isValidWord(word, minLength = 2, maxLength = 15) {
  const normalized = normalizeWord(word);
  return normalized.length >= minLength && normalized.length <= maxLength;
}

/**
 * Nettoie une définition pour l'affichage
 * - Supprime les parenthèses avec contenu court
 * - Limite la longueur
 * - Supprime les exemples
 * @param {string} clue - Définition brute
 * @param {number} maxLength - Longueur max (défaut: 80)
 * @returns {string} - Définition nettoyée
 */
function cleanClue(clue, maxLength = 80) {
  if (!clue) return '';
  
  let cleaned = clue
    // Supprimer les parenthèses courtes (indications grammaticales)
    .replace(/\s*\([^)]{1,20}\)/g, '')
    // Supprimer les exemples (après "Ex:" ou "ex:")
    .replace(/\s*[Ee]x\s*:\s*.*/g, '')
    // Supprimer les références (voir aussi, cf., etc.)
    .replace(/\s*([Vv]oir aussi|[Cc]f\.)\s*.*/g, '')
    // Supprimer les doubles espaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Limiter la longueur
  if (cleaned.length > maxLength) {
    // Couper au dernier mot complet
    cleaned = cleaned.substring(0, maxLength);
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      cleaned = cleaned.substring(0, lastSpace);
    }
    cleaned = cleaned.replace(/[,;:\s]+$/, '') + '...';
  }
  
  return cleaned;
}

/**
 * Génère une version courte de la définition (pour cases étroites)
 * @param {string} clue - Définition complète
 * @param {number} maxLength - Longueur max (défaut: 40)
 * @returns {string}
 */
function shortenClue(clue, maxLength = 40) {
  const cleaned = cleanClue(clue, maxLength);
  if (cleaned.length <= maxLength) return cleaned;
  
  // Essayer de garder le premier segment significatif
  const parts = cleaned.split(/[,;:]/);
  if (parts[0].length <= maxLength) {
    return parts[0].trim();
  }
  
  // Couper au mot
  return cleaned.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Vérifie si une définition contient le mot lui-même (anti-triche)
 * @param {string} clue - Définition
 * @param {string} word - Mot
 * @returns {boolean} - true si la définition contient le mot
 */
function clueContainsWord(clue, word) {
  if (!clue || !word) return false;
  const normalizedClue = normalizeWord(clue);
  const normalizedWord = normalizeWord(word);
  return normalizedClue.includes(normalizedWord);
}

/**
 * Calcule un score de qualité pour une définition
 * @param {string} clue - Définition
 * @param {string} word - Mot correspondant
 * @returns {number} - Score de 0 à 100
 */
function calculateClueQuality(clue, word) {
  if (!clue || !word) return 0;
  
  let score = 50; // Score de base
  
  const cleanedClue = cleanClue(clue, 200);
  
  // Pénaliser si contient le mot
  if (clueContainsWord(cleanedClue, word)) {
    score -= 50;
  }
  
  // Longueur idéale entre 15 et 50 caractères
  if (cleanedClue.length >= 15 && cleanedClue.length <= 50) {
    score += 20;
  } else if (cleanedClue.length < 10 || cleanedClue.length > 80) {
    score -= 10;
  }
  
  // Pénaliser les définitions trop techniques
  const technicalTerms = /\b(cf\.|voir|terme|dérivé|variante|ancien|archaïque|littéraire)\b/i;
  if (technicalTerms.test(cleanedClue)) {
    score -= 15;
  }
  
  // Bonus pour les définitions concises et claires
  if (/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÇ][a-zàâäéèêëïîôùûüç\s]+[.!?]?$/.test(cleanedClue)) {
    score += 10;
  }
  
  // Limiter entre 0 et 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Estime la difficulté d'un mot
 * @param {string} word - Mot
 * @param {number} frequency - Fréquence (1-100)
 * @returns {number} - Score de difficulté (1-100, 100 = très difficile)
 */
function estimateWordDifficulty(word, frequency = 50) {
  let difficulty = 50;
  
  const normalized = normalizeWord(word);
  const length = normalized.length;
  
  // Plus le mot est long, plus il est difficile
  if (length >= 10) difficulty += 20;
  else if (length >= 7) difficulty += 10;
  else if (length <= 3) difficulty -= 10;
  
  // Fréquence inversée
  difficulty += Math.round((100 - frequency) * 0.3);
  
  // Lettres rares (W, X, Y, Z, K)
  const rareLetters = (normalized.match(/[WXYZK]/g) || []).length;
  difficulty += rareLetters * 5;
  
  return Math.max(1, Math.min(100, difficulty));
}

export {
  normalizeAccents,
  normalizeWord,
  isValidWord,
  cleanClue,
  shortenClue,
  clueContainsWord,
  calculateClueQuality,
  estimateWordDifficulty,
  ACCENT_MAP
};
