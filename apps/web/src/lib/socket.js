/**
 * Client Socket.IO
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Connecte au serveur Socket.IO
 */
export function connect() {
  if (socket?.connected) {
    return socket;
  }
  
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });
  
  socket.on('connect', () => {
    console.log('🔌 Socket connecté:', socket.id);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket déconnecté:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('🔌 Erreur connexion socket:', error.message);
  });
  
  return socket;
}

/**
 * Recupere l'instance socket
 */
export function getSocket() {
  if (!socket) {
    return connect();
  }
  return socket;
}

/**
 * Deconnecte le socket
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { connect, getSocket, disconnect };
