/**
 * Hook pour gerer le pseudo et couleur du joueur local
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'zwords_player';

// Couleurs predefinies pour le picker
export const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];

/**
 * Genere une couleur aleatoire parmi les presets
 */
function getRandomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

/**
 * Hook pour gerer le joueur local
 */
export function useLocalPlayer() {
  const [pseudo, setPseudo] = useState('');
  const [color, setColor] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { pseudo: storedPseudo, color: storedColor } = JSON.parse(stored);
        if (storedPseudo) setPseudo(storedPseudo);
        if (storedColor) setColor(storedColor);
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage:', e);
    }
    setIsLoaded(true);
  }, []);
  
  // Sauvegarder dans localStorage a chaque changement
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      if (pseudo || color) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ pseudo, color }));
      }
    } catch (e) {
      console.warn('Erreur ecriture localStorage:', e);
    }
  }, [pseudo, color, isLoaded]);
  
  /**
   * Met a jour le pseudo
   */
  const updatePseudo = useCallback((newPseudo) => {
    setPseudo(newPseudo.trim());
  }, []);
  
  /**
   * Met a jour la couleur
   */
  const updateColor = useCallback((newColor) => {
    setColor(newColor);
  }, []);
  
  /**
   * Genere une couleur aleatoire si pas encore definie
   */
  const ensureColor = useCallback(() => {
    if (!color) {
      const newColor = getRandomColor();
      setColor(newColor);
      return newColor;
    }
    return color;
  }, [color]);
  
  /**
   * Verifie si le joueur a un pseudo
   */
  const hasPseudo = Boolean(pseudo);
  
  /**
   * Reinitialise le joueur
   */
  const clear = useCallback(() => {
    setPseudo('');
    setColor('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  return {
    pseudo,
    color,
    isLoaded,
    hasPseudo,
    updatePseudo,
    updateColor,
    ensureColor,
    clear
  };
}

export default useLocalPlayer;
