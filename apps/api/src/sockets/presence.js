/**
 * Gestion de la presence des joueurs
 */

// Map des presences par partie: { gameCode: { pseudo: presenceData } }
const gamePresences = new Map();

// Map socket -> game info: { socketId: { gameCode, pseudo, color } }
const socketToGame = new Map();

/**
 * Ajoute ou met a jour la presence d'un joueur
 */
export function setPresence(socketId, gameCode, pseudo, color, cursorData = {}) {
  // Stocker le mapping socket -> game
  socketToGame.set(socketId, { gameCode, pseudo, color });
  
  // Initialiser la map de la partie si necessaire
  if (!gamePresences.has(gameCode)) {
    gamePresences.set(gameCode, new Map());
  }
  
  const gameMap = gamePresences.get(gameCode);
  gameMap.set(pseudo, {
    socketId,
    pseudo,
    color,
    row: cursorData.row ?? null,
    col: cursorData.col ?? null,
    direction: cursorData.direction ?? 'across',
    entryId: cursorData.entryId ?? null,
    lastUpdate: Date.now()
  });
}

/**
 * Met a jour le curseur d'un joueur
 */
export function updateCursor(socketId, row, col, direction, entryId) {
  const gameInfo = socketToGame.get(socketId);
  if (!gameInfo) return null;
  
  const { gameCode, pseudo } = gameInfo;
  const gameMap = gamePresences.get(gameCode);
  if (!gameMap) return null;
  
  const presence = gameMap.get(pseudo);
  if (!presence) return null;
  
  // Mettre a jour
  presence.row = row;
  presence.col = col;
  presence.direction = direction;
  presence.entryId = entryId;
  presence.lastUpdate = Date.now();
  
  return {
    gameCode,
    pseudo,
    color: gameInfo.color,
    row,
    col,
    direction,
    entryId
  };
}

/**
 * Supprime la presence d'un joueur
 */
export function removePresence(socketId) {
  const gameInfo = socketToGame.get(socketId);
  if (!gameInfo) return null;
  
  const { gameCode, pseudo } = gameInfo;
  
  // Supprimer de la map de la partie
  const gameMap = gamePresences.get(gameCode);
  if (gameMap) {
    gameMap.delete(pseudo);
    
    // Nettoyer si partie vide
    if (gameMap.size === 0) {
      gamePresences.delete(gameCode);
    }
  }
  
  // Supprimer le mapping socket
  socketToGame.delete(socketId);
  
  return { gameCode, pseudo };
}

/**
 * Recupere les infos de game d'un socket
 */
export function getSocketGameInfo(socketId) {
  return socketToGame.get(socketId);
}

/**
 * Recupere toutes les presences d'une partie
 */
export function getGamePresences(gameCode) {
  const gameMap = gamePresences.get(gameCode);
  if (!gameMap) return [];
  
  return Array.from(gameMap.values());
}

/**
 * Recupere le nombre de joueurs dans une partie
 */
export function getPlayerCount(gameCode) {
  const gameMap = gamePresences.get(gameCode);
  return gameMap ? gameMap.size : 0;
}
