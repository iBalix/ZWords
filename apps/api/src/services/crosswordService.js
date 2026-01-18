/**
 * Service principal de gestion des grilles
 * 
 * Utilise l'API APIVerve pour générer des grilles en anglais.
 * Gère la difficulté (easy, medium, hard).
 */

import { generateCrossword as generateFromApi, checkEntryComplete as checkEntry, isCorrectAnswer as checkAnswer } from './crosswordApiService.js';

/**
 * Génère une grille via l'API
 * @param {string} theme - IGNORÉ (toujours random)
 * @param {string} difficulty - Difficulté (easy, medium, hard)
 * @returns {Promise<{gridData, clues, answers}>}
 */
export async function generateCrossword(theme = 'general', difficulty = 'easy') {
  console.log('🎲 Génération de grille via API - difficulté:', difficulty);
  
  // Toujours utiliser 'random' comme thème
  const result = await generateFromApi('random', difficulty);
  
  if (!result || !result.gridData) {
    throw new Error('API_ERROR: Impossible de générer une grille. Vérifiez votre clé API.');
  }
  
  console.log('✅ Grille générée avec succès');
  console.log(`   Dimensions: ${result.gridData.rows}x${result.gridData.cols}`);
  console.log(`   Mots: ${Object.keys(result.answers || {}).length}`);
  
  return result;
}

/**
 * Vérifie si une entrée est complète
 */
export function checkEntryComplete(gridData, entryId, cells) {
  return checkEntry(gridData, entryId, cells);
}

/**
 * Vérifie si la réponse est correcte
 */
export function isCorrectAnswer(answers, entryId, cells) {
  return checkAnswer(answers, entryId, cells);
}
