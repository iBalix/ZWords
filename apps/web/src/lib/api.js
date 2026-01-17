/**
 * Client API HTTP
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Games API
export const gamesApi = {
  /**
   * Liste des parties actives
   */
  list: async () => {
    const { data } = await api.get('/games');
    return data.games;
  },
  
  /**
   * Creer une partie
   */
  create: async (ownerPseudo, theme = 'general', difficulty = 'easy') => {
    const { data } = await api.post('/games', { ownerPseudo, theme, difficulty });
    return data;
  },
  
  /**
   * Rejoindre une partie
   */
  join: async (code, pseudo, color) => {
    const { data } = await api.post('/games/join', { code, pseudo, color });
    return data;
  },
  
  /**
   * Recuperer une partie
   */
  get: async (code) => {
    const { data } = await api.get(`/games/${code}`);
    return data;
  },
  
  /**
   * Nouvelle grille
   */
  next: async (code, ownerPseudo) => {
    const { data } = await api.post(`/games/${code}/next`, { ownerPseudo });
    return data;
  },
  
  /**
   * Supprimer une partie
   */
  delete: async (code, ownerPseudo) => {
    const { data } = await api.delete(`/games/${code}`, { data: { ownerPseudo } });
    return data;
  }
};

// History API
export const historyApi = {
  /**
   * Liste des grilles terminees
   */
  list: async (code) => {
    const { data } = await api.get(`/games/${code}/history`);
    return data.history;
  },
  
  /**
   * Detail d'une grille historique
   */
  get: async (code, crosswordId) => {
    const { data } = await api.get(`/games/${code}/history/${crosswordId}`);
    return data;
  }
};

export default api;
