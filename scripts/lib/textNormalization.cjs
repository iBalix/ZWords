/**
 * ZWords - Utilitaires de normalisation de texte (CommonJS version pour scripts)
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

function normalizeAccents(text) {
  if (!text) return '';
  return text
    .split('')
    .map(char => ACCENT_MAP[char] || char)
    .join('');
}

function normalizeWord(word) {
  if (!word) return '';
  return normalizeAccents(word)
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function isValidWord(word, minLength = 2, maxLength = 15) {
  const normalized = normalizeWord(word);
  return normalized.length >= minLength && normalized.length <= maxLength;
}

function cleanClue(clue, maxLength = 80) {
  if (!clue) return '';
  
  let cleaned = clue
    .replace(/\s*\([^)]{1,20}\)/g, '')
    .replace(/\s*[Ee]x\s*:\s*.*/g, '')
    .replace(/\s*([Vv]oir aussi|[Cc]f\.)\s*.*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      cleaned = cleaned.substring(0, lastSpace);
    }
    cleaned = cleaned.replace(/[,;:\s]+$/, '') + '...';
  }
  
  return cleaned;
}

function shortenClue(clue, maxLength = 40) {
  const cleaned = cleanClue(clue, maxLength);
  if (cleaned.length <= maxLength) return cleaned;
  
  const parts = cleaned.split(/[,;:]/);
  if (parts[0].length <= maxLength) {
    return parts[0].trim();
  }
  
  return cleaned.substring(0, maxLength - 3).trim() + '...';
}

function clueContainsWord(clue, word) {
  if (!clue || !word) return false;
  const normalizedClue = normalizeWord(clue);
  const normalizedWord = normalizeWord(word);
  return normalizedClue.includes(normalizedWord);
}

function calculateClueQuality(clue, word) {
  if (!clue || !word) return 0;
  
  let score = 50;
  const cleanedClue = cleanClue(clue, 200);
  
  if (clueContainsWord(cleanedClue, word)) {
    score -= 50;
  }
  
  if (cleanedClue.length >= 15 && cleanedClue.length <= 50) {
    score += 20;
  } else if (cleanedClue.length < 10 || cleanedClue.length > 80) {
    score -= 10;
  }
  
  const technicalTerms = /\b(cf\.|voir|terme|dérivé|variante|ancien|archaïque|littéraire)\b/i;
  if (technicalTerms.test(cleanedClue)) {
    score -= 15;
  }
  
  if (/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÇ][a-zàâäéèêëïîôùûüç\s]+[.!?]?$/.test(cleanedClue)) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

function estimateWordDifficulty(word, frequency = 50) {
  let difficulty = 50;
  
  const normalized = normalizeWord(word);
  const length = normalized.length;
  
  if (length >= 10) difficulty += 20;
  else if (length >= 7) difficulty += 10;
  else if (length <= 3) difficulty -= 10;
  
  difficulty += Math.round((100 - frequency) * 0.3);
  
  const rareLetters = (normalized.match(/[WXYZK]/g) || []).length;
  difficulty += rareLetters * 5;
  
  return Math.max(1, Math.min(100, difficulty));
}

module.exports = {
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
