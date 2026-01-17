/**
 * Generateur de codes de partie (4 caracteres alphanumeriques)
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Genere un code aleatoire de 4 caracteres
 * @returns {string} Code de 4 caracteres [A-Z0-9]
 */
export function generateCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

/**
 * Genere un code unique en verifiant qu'il n'existe pas deja
 * @param {Function} checkExists - Fonction async qui verifie si le code existe
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @returns {Promise<string>} Code unique
 */
export async function generateUniqueCode(checkExists, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    const exists = await checkExists(code);
    if (!exists) {
      return code;
    }
  }
  throw new Error('Impossible de generer un code unique apres ' + maxRetries + ' tentatives');
}
