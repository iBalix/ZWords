/**
 * Hook pour gerer l'etat d'une partie
 */

import { useState, useCallback, useReducer } from 'react';

// Actions
const ACTIONS = {
  SET_INITIAL_STATE: 'SET_INITIAL_STATE',
  UPDATE_CELL: 'UPDATE_CELL',
  UPDATE_PRESENCE: 'UPDATE_PRESENCE',
  REMOVE_PRESENCE: 'REMOVE_PRESENCE',
  CLAIM_ENTRY: 'CLAIM_ENTRY',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_SCOREBOARD: 'UPDATE_SCOREBOARD',
  SET_GRID: 'SET_GRID',
  SET_GRID_COMPLETED: 'SET_GRID_COMPLETED',
};

// Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_INITIAL_STATE:
      return {
        ...state,
        ...action.payload,
        isLoaded: true,
      };
      
    case ACTIONS.UPDATE_CELL: {
      const { row, col, value, pseudo } = action.payload;
      const key = `${row}-${col}`;
      return {
        ...state,
        cells: {
          ...state.cells,
          [key]: value,
        },
      };
    }
    
    case ACTIONS.UPDATE_PRESENCE: {
      const { pseudo, ...rest } = action.payload;
      return {
        ...state,
        presence: {
          ...state.presence,
          [pseudo]: { pseudo, ...rest },
        },
      };
    }
    
    case ACTIONS.REMOVE_PRESENCE: {
      const { pseudo } = action.payload;
      const newPresence = { ...state.presence };
      delete newPresence[pseudo];
      return {
        ...state,
        presence: newPresence,
      };
    }
    
    case ACTIONS.CLAIM_ENTRY: {
      const { entryId, pseudo, color } = action.payload;
      return {
        ...state,
        claims: [
          ...state.claims,
          { entryId, claimedByPseudo: pseudo, color },
        ],
      };
    }
    
    case ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload].slice(-100), // Garder les 100 derniers
      };
    
    case ACTIONS.UPDATE_SCOREBOARD:
      return {
        ...state,
        scoreboard: action.payload.scores,
      };
    
    case ACTIONS.SET_GRID:
      return {
        ...state,
        crossword: action.payload.crossword,
        cells: {},
        claims: [],
        gridCompleted: false,
      };
    
    case ACTIONS.SET_GRID_COMPLETED:
      return {
        ...state,
        gridCompleted: true,
        finalScores: action.payload.finalScores,
        podium: action.payload.podium,
      };
    
    default:
      return state;
  }
}

// Etat initial
const initialState = {
  isLoaded: false,
  game: null,
  crossword: null,
  cells: {},
  claims: [],
  players: [],
  messages: [],
  presence: {},
  scoreboard: [],
  gridCompleted: false,
  finalScores: null,
  podium: null,
};

/**
 * Hook pour gerer l'etat de la partie
 */
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [incorrectCells, setIncorrectCells] = useState([]);
  
  // Charger l'etat initial
  const setInitialState = useCallback((gameState) => {
    // Convertir presence array en map
    const presenceMap = {};
    for (const p of gameState.presence || []) {
      presenceMap[p.pseudo] = p;
    }
    
    dispatch({
      type: ACTIONS.SET_INITIAL_STATE,
      payload: {
        game: gameState.game,
        crossword: gameState.crossword,
        cells: gameState.cells || {},
        claims: gameState.claims || [],
        players: gameState.players || [],
        messages: gameState.messages || [],
        presence: presenceMap,
        scoreboard: gameState.scoreboard || [],
      },
    });
  }, []);
  
  // Mettre a jour une cellule
  const updateCell = useCallback((row, col, value, pseudo) => {
    dispatch({
      type: ACTIONS.UPDATE_CELL,
      payload: { row, col, value, pseudo },
    });
  }, []);
  
  // Mettre a jour la presence
  const updatePresence = useCallback((data) => {
    dispatch({
      type: ACTIONS.UPDATE_PRESENCE,
      payload: data,
    });
  }, []);
  
  // Supprimer une presence
  const removePresence = useCallback((pseudo) => {
    dispatch({
      type: ACTIONS.REMOVE_PRESENCE,
      payload: { pseudo },
    });
  }, []);
  
  // Claim une entry
  const claimEntry = useCallback((entryId, pseudo, color) => {
    dispatch({
      type: ACTIONS.CLAIM_ENTRY,
      payload: { entryId, pseudo, color },
    });
  }, []);
  
  // Ajouter un message
  const addMessage = useCallback((message) => {
    dispatch({
      type: ACTIONS.ADD_MESSAGE,
      payload: message,
    });
  }, []);
  
  // Mettre a jour le scoreboard
  const updateScoreboard = useCallback((scores) => {
    dispatch({
      type: ACTIONS.UPDATE_SCOREBOARD,
      payload: { scores },
    });
  }, []);
  
  // Definir une nouvelle grille
  const setNewGrid = useCallback((crossword) => {
    dispatch({
      type: ACTIONS.SET_GRID,
      payload: { crossword },
    });
    setSelectedCell(null);
    setIncorrectCells([]);
  }, []);
  
  // Marquer la grille comme terminee
  const setGridCompleted = useCallback((finalScores, podium) => {
    dispatch({
      type: ACTIONS.SET_GRID_COMPLETED,
      payload: { finalScores, podium },
    });
  }, []);
  
  // Marquer des cellules comme incorrectes (pour animation)
  const markCellsIncorrect = useCallback((cells) => {
    setIncorrectCells(cells);
    // Reset apres l'animation
    setTimeout(() => {
      setIncorrectCells([]);
    }, 500);
  }, []);
  
  // Selectionner une cellule
  const selectCell = useCallback((row, col) => {
    if (selectedCell?.row === row && selectedCell?.col === col) {
      // Toggle direction si meme cellule
      setDirection(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ row, col });
    }
  }, [selectedCell]);
  
  // Toggle direction
  const toggleDirection = useCallback(() => {
    setDirection(d => d === 'across' ? 'down' : 'across');
  }, []);
  
  return {
    ...state,
    selectedCell,
    direction,
    incorrectCells,
    setInitialState,
    updateCell,
    updatePresence,
    removePresence,
    claimEntry,
    addMessage,
    updateScoreboard,
    setNewGrid,
    setGridCompleted,
    markCellsIncorrect,
    selectCell,
    toggleDirection,
    setDirection,
    setSelectedCell,
  };
}

export default useGameState;
