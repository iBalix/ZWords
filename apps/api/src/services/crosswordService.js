/**
 * Service principal de gestion des grilles
 * Utilise l'API APIVerve avec fallback sur le generateur local
 */

export { 
  generateCrossword, 
  checkEntryComplete, 
  isCorrectAnswer 
} from './crosswordApiService.js';
