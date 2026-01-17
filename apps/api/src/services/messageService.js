/**
 * Service de gestion des messages (chat + logs)
 */

import { supabase } from '../config/supabase.js';

/**
 * Types de messages
 */
export const MESSAGE_TYPES = {
  CHAT: 'chat',
  LOG_ATTEMPT: 'log_attempt',
  LOG_SUCCESS: 'log_success',
  LOG_FAIL: 'log_fail',
  LOG_JOIN: 'log_join',
  LOG_LEAVE: 'log_leave',
  LOG_NEXT: 'log_next'
};

/**
 * Ajoute un message
 */
export async function addMessage(gameId, type, pseudo, color, content, payload = null) {
  const { data, error } = await supabase
    .from('zwords_messages')
    .insert({
      game_id: gameId,
      type,
      pseudo,
      color,
      content,
      payload
    })
    .select()
    .single();
  
  if (error) {
    console.error('Erreur ajout message:', error);
    throw error;
  }
  
  return data;
}

/**
 * Recupere les derniers messages d'une partie
 */
export async function getMessages(gameId, limit = 100) {
  const { data: messages } = await supabase
    .from('zwords_messages')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  // Inverser pour avoir l'ordre chronologique
  return (messages || []).reverse();
}

/**
 * Cree un message de chat
 */
export async function sendChatMessage(gameId, pseudo, color, content) {
  return addMessage(gameId, MESSAGE_TYPES.CHAT, pseudo, color, content);
}

/**
 * Log une tentative de mot
 */
export async function logAttempt(gameId, pseudo, color, entryId, word) {
  return addMessage(
    gameId,
    MESSAGE_TYPES.LOG_ATTEMPT,
    pseudo,
    color,
    `${pseudo} tente ${word}`,
    { entryId, word }
  );
}

/**
 * Log un mot trouve
 */
export async function logSuccess(gameId, pseudo, color, entryId, word) {
  return addMessage(
    gameId,
    MESSAGE_TYPES.LOG_SUCCESS,
    pseudo,
    color,
    `${pseudo} a trouvé ${word} !`,
    { entryId, word }
  );
}

/**
 * Log un mot incorrect
 */
export async function logFail(gameId, pseudo, color, entryId, word) {
  return addMessage(
    gameId,
    MESSAGE_TYPES.LOG_FAIL,
    pseudo,
    color,
    `${pseudo} ${word} incorrect`,
    { entryId, word }
  );
}

/**
 * Log un joueur qui rejoint
 */
export async function logJoin(gameId, pseudo, color) {
  return addMessage(
    gameId,
    MESSAGE_TYPES.LOG_JOIN,
    pseudo,
    color,
    `${pseudo} a rejoint la partie`
  );
}

/**
 * Log un joueur qui quitte
 */
export async function logLeave(gameId, pseudo, color) {
  return addMessage(
    gameId,
    MESSAGE_TYPES.LOG_LEAVE,
    pseudo,
    color,
    `${pseudo} a quitté la partie`
  );
}

/**
 * Log une nouvelle grille
 */
export async function logNextGrid(gameId, ownerPseudo) {
  return addMessage(
    gameId,
    MESSAGE_TYPES.LOG_NEXT,
    null,
    null,
    `Nouvelle grille lancée par ${ownerPseudo}`
  );
}
