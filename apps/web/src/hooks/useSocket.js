/**
 * Hook pour gerer la connexion Socket.IO a une partie
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, disconnect } from '../lib/socket';

/**
 * Hook pour gerer la connexion a une partie
 */
export function useSocket(gameCode, pseudo, color, onEvent) {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const socketRef = useRef(null);
  const joinedRef = useRef(false);
  
  // Connecter et rejoindre la partie
  useEffect(() => {
    if (!gameCode || !pseudo || !color) return;
    
    const socket = getSocket();
    socketRef.current = socket;
    
    // Handlers d'evenements
    const handleConnect = () => {
      setConnected(true);
      console.log('✅ Socket connecté, envoi join_game...');
      
      // Rejoindre la partie
      if (!joinedRef.current) {
        socket.emit('join_game', { code: gameCode, pseudo, color });
        joinedRef.current = true;
      }
    };
    
    const handleDisconnect = () => {
      setConnected(false);
      joinedRef.current = false;
    };
    
    const handleGameState = (state) => {
      console.log('📦 game_state reçu');
      setGameState(state);
      onEvent?.('game_state', state);
    };
    
    const handleCellUpdate = (data) => {
      onEvent?.('cell_update', data);
    };
    
    const handlePresenceUpdate = (data) => {
      onEvent?.('presence_update', data);
    };
    
    const handlePresenceRemove = (data) => {
      onEvent?.('presence_remove', data);
    };
    
    const handleEntryClaimed = (data) => {
      onEvent?.('entry_claimed', data);
    };
    
    const handleEntryIncorrect = (data) => {
      onEvent?.('entry_incorrect', data);
    };
    
    const handleScoreboardUpdate = (data) => {
      onEvent?.('scoreboard_update', data);
    };
    
    const handleMessageBroadcast = (data) => {
      onEvent?.('message_broadcast', data);
    };
    
    const handleGridCompleted = (data) => {
      onEvent?.('grid_completed', data);
    };
    
    const handleGridNext = (data) => {
      onEvent?.('grid_next', data);
    };
    
    const handleError = (data) => {
      console.error('❌ Socket error:', data);
      onEvent?.('error', data);
    };
    
    // Enregistrer les handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game_state', handleGameState);
    socket.on('cell_update', handleCellUpdate);
    socket.on('presence_update', handlePresenceUpdate);
    socket.on('presence_remove', handlePresenceRemove);
    socket.on('entry_claimed', handleEntryClaimed);
    socket.on('entry_incorrect', handleEntryIncorrect);
    socket.on('scoreboard_update', handleScoreboardUpdate);
    socket.on('message_broadcast', handleMessageBroadcast);
    socket.on('grid_completed', handleGridCompleted);
    socket.on('grid_next', handleGridNext);
    socket.on('error', handleError);
    
    // Si deja connecte, rejoindre directement
    if (socket.connected && !joinedRef.current) {
      socket.emit('join_game', { code: gameCode, pseudo, color });
      joinedRef.current = true;
      setConnected(true);
    }
    
    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game_state', handleGameState);
      socket.off('cell_update', handleCellUpdate);
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('presence_remove', handlePresenceRemove);
      socket.off('entry_claimed', handleEntryClaimed);
      socket.off('entry_incorrect', handleEntryIncorrect);
      socket.off('scoreboard_update', handleScoreboardUpdate);
      socket.off('message_broadcast', handleMessageBroadcast);
      socket.off('grid_completed', handleGridCompleted);
      socket.off('grid_next', handleGridNext);
      socket.off('error', handleError);
      
      // Quitter la partie
      if (joinedRef.current) {
        socket.emit('leave_game');
        joinedRef.current = false;
      }
    };
  }, [gameCode, pseudo, color, onEvent]);
  
  // Envoyer un cursor update
  const sendCursorUpdate = useCallback((row, col, direction, entryId) => {
    socketRef.current?.emit('cursor_update', { row, col, direction, entryId });
  }, []);
  
  // Envoyer une saisie de cellule
  const sendCellInput = useCallback((row, col, value) => {
    socketRef.current?.emit('cell_input', { row, col, value });
  }, []);
  
  // Envoyer un message de chat
  const sendChatMessage = useCallback((content) => {
    socketRef.current?.emit('chat_message', { content });
  }, []);
  
  // Demander une nouvelle grille
  const sendNextGrid = useCallback(() => {
    socketRef.current?.emit('next_grid');
  }, []);
  
  return {
    connected,
    gameState,
    sendCursorUpdate,
    sendCellInput,
    sendChatMessage,
    sendNextGrid
  };
}

export default useSocket;
