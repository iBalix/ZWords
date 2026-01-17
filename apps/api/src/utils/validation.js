/**
 * Utilitaires de validation
 */

/**
 * Valide un pseudo
 * @param {string} pseudo
 * @returns {boolean}
 */
export function isValidPseudo(pseudo) {
  if (!pseudo || typeof pseudo !== 'string') return false;
  const trimmed = pseudo.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
}

/**
 * Valide une couleur hexadecimale
 * @param {string} color - Format #RRGGBB
 * @returns {boolean}
 */
export function isValidColor(color) {
  if (!color || typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Valide un code de partie
 * @param {string} code - 4 caracteres [A-Z0-9]
 * @returns {boolean}
 */
export function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z0-9]{4}$/.test(code.toUpperCase());
}

/**
 * Valide une position de cellule
 * @param {number} row
 * @param {number} col
 * @param {number} maxRows
 * @param {number} maxCols
 * @returns {boolean}
 */
export function isValidCellPosition(row, col, maxRows = 20, maxCols = 20) {
  return (
    typeof row === 'number' &&
    typeof col === 'number' &&
    row >= 0 && row < maxRows &&
    col >= 0 && col < maxCols
  );
}

/**
 * Valide une valeur de cellule (lettre unique)
 * @param {string} value
 * @returns {boolean}
 */
export function isValidCellValue(value) {
  if (value === '' || value === null) return true; // Vide autorise
  if (typeof value !== 'string') return false;
  return /^[A-Za-z]$/.test(value);
}

/**
 * Normalise une valeur de cellule (majuscule)
 * @param {string} value
 * @returns {string}
 */
export function normalizeCellValue(value) {
  if (!value) return '';
  return value.toUpperCase();
}
