/**
 * Page de jeu - Grille de mots fleches
 */

import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { useLocalPlayer } from '../hooks/useLocalPlayer';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';

import CrosswordGrid from '../components/Grid/CrosswordGrid';
import Scoreboard from '../components/Scoreboard/Scoreboard';
import ChatPanel from '../components/Chat/ChatPanel';
import HistoryPanel from '../components/History/HistoryPanel';

export default function GamePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { pseudo, color, hasPseudo, isLoaded: playerLoaded, ensureColor } = useLocalPlayer();
  
  const [showHistory, setShowHistory] = useState(false);
  
  // State de la partie
  const gameState = useGameState();
  const {
    isLoaded,
    game,
    crossword,
    cells,
    claims,
    presence,
    scoreboard,
    messages,
    selectedCell,
    direction,
    incorrectCells,
    gridCompleted,
    podium,
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
  } = gameState;
  
  // Rediriger si pas de pseudo (attendre que le localStorage soit charge)
  useEffect(() => {
    if (playerLoaded && !hasPseudo) {
      navigate('/');
      toast.error('Veuillez choisir un pseudo');
    }
  }, [playerLoaded, hasPseudo, navigate]);
  
  // Handler d'evenements socket
  const handleSocketEvent = useCallback((event, data) => {
    switch (event) {
      case 'game_state':
        setInitialState(data);
        break;
        
      case 'cell_update':
        updateCell(data.row, data.col, data.value, data.pseudo);
        break;
        
      case 'presence_update':
        updatePresence(data);
        break;
        
      case 'presence_remove':
        removePresence(data.pseudo);
        break;
        
      case 'entry_claimed':
        claimEntry(data.entryId, data.pseudo, data.color);
        if (data.pseudo === pseudo) {
          toast.success(`+1 point ! Vous avez trouvé ${data.word}`);
        }
        break;
        
      case 'entry_incorrect':
        markCellsIncorrect(data.cells);
        break;
        
      case 'scoreboard_update':
        updateScoreboard(data.scores);
        break;
        
      case 'message_broadcast':
        addMessage(data);
        break;
        
      case 'grid_completed':
        setGridCompleted(data.finalScores, data.podium);
        toast.success('Grille terminée !');
        break;
        
      case 'grid_next':
        setNewGrid(data.crossword);
        toast.success('Nouvelle grille !');
        break;
        
      case 'error':
        toast.error(data.message);
        break;
    }
  }, [pseudo, setInitialState, updateCell, updatePresence, removePresence, claimEntry, addMessage, updateScoreboard, setGridCompleted, setNewGrid, markCellsIncorrect]);
  
  // Connexion socket
  const playerColor = ensureColor();
  const { connected, sendCursorUpdate, sendCellInput, sendChatMessage, sendNextGrid } = useSocket(
    code,
    pseudo,
    playerColor,
    handleSocketEvent
  );
  
  // Trouver la prochaine cellule de type "letter" dans une direction
  const findNextLetterCell = useCallback((fromRow, fromCol, rowDelta, colDelta) => {
    if (!crossword) return null;
    
    const { rows, cols, cells: gridCells } = crossword.gridData;
    let r = fromRow + rowDelta;
    let c = fromCol + colDelta;
    
    while (r >= 0 && r < rows && c >= 0 && c < cols) {
      const cell = gridCells.find(cell => cell.row === r && cell.col === c);
      if (cell && cell.type === 'letter') {
        return { row: r, col: c };
      }
      r += rowDelta;
      c += colDelta;
    }
    
    return null;
  }, [crossword]);
  
  // Gerer la saisie clavier
  const handleKeyDown = useCallback((e) => {
    if (!selectedCell || !crossword) return;
    
    const { row, col } = selectedCell;
    const { rows, cols, cells: gridCells } = crossword.gridData;
    
    // Trouver la cellule actuelle
    const cell = gridCells.find(c => c.row === row && c.col === col);
    if (!cell || cell.type !== 'letter') return;
    
    // Lettres
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      sendCellInput(row, col, e.key.toUpperCase());
      
      // Avancer dans la direction
      const rowDelta = direction === 'down' ? 1 : 0;
      const colDelta = direction === 'across' ? 1 : 0;
      const nextCell = findNextLetterCell(row, col, rowDelta, colDelta);
      
      if (nextCell) {
        selectCell(nextCell.row, nextCell.col);
        sendCursorUpdate(nextCell.row, nextCell.col, direction, null);
      }
    }
    
    // Backspace
    else if (e.key === 'Backspace') {
      e.preventDefault();
      sendCellInput(row, col, '');
      
      // Reculer dans la direction
      const rowDelta = direction === 'down' ? -1 : 0;
      const colDelta = direction === 'across' ? -1 : 0;
      const prevCell = findNextLetterCell(row, col, rowDelta, colDelta);
      
      if (prevCell) {
        selectCell(prevCell.row, prevCell.col);
        sendCursorUpdate(prevCell.row, prevCell.col, direction, null);
      }
    }
    
    // Espace - toggle direction
    else if (e.key === ' ') {
      e.preventDefault();
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);
      sendCursorUpdate(row, col, newDir, null);
    }
    
    // Fleches
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      
      let rowDelta = 0, colDelta = 0;
      switch (e.key) {
        case 'ArrowUp': rowDelta = -1; break;
        case 'ArrowDown': rowDelta = 1; break;
        case 'ArrowLeft': colDelta = -1; break;
        case 'ArrowRight': colDelta = 1; break;
      }
      
      const nextCell = findNextLetterCell(row, col, rowDelta, colDelta);
      if (nextCell) {
        selectCell(nextCell.row, nextCell.col);
        sendCursorUpdate(nextCell.row, nextCell.col, direction, null);
      }
    }
  }, [selectedCell, crossword, direction, sendCellInput, sendCursorUpdate, selectCell, setDirection, findNextLetterCell]);
  
  // Ajouter/retirer le listener clavier
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Gerer le clic sur une cellule
  const handleCellClick = useCallback((row, col) => {
    selectCell(row, col);
    sendCursorUpdate(row, col, direction, null);
  }, [selectCell, direction, sendCursorUpdate]);
  
  // Verifier si on est l'owner
  const isOwner = game?.ownerPseudo === pseudo;
  
  // Attendre le chargement du localStorage
  if (!playerLoaded || !hasPseudo) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-game flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-display tracking-wider">
                Z<span className="text-zwords-accent">WORDS</span>
              </h1>
              <span className="px-3 py-1 font-mono text-lg bg-gray-800 rounded border border-gray-700">
                {code}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!connected && (
              <span className="text-red-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connexion...
              </span>
            )}
            
            {isOwner && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Crown className="w-4 h-4" />
                Owner
              </span>
            )}
            
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">{pseudo}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenu principal - 2 colonnes: Grille + Panel droit */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne centrale - Grille */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {!isLoaded ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-zwords-accent" />
            </div>
          ) : crossword ? (
            <>
              <CrosswordGrid
                gridData={crossword.gridData}
                cells={cells}
                claims={claims}
                selectedCell={selectedCell}
                direction={direction}
                presence={presence}
                myPseudo={pseudo}
                incorrectCells={incorrectCells}
                onCellClick={handleCellClick}
              />
              
              {/* Indication direction */}
              <div className="mt-4 text-gray-400 text-sm">
                Direction: <span className="text-white font-medium">{direction === 'across' ? '→ Horizontal' : '↓ Vertical'}</span>
                <span className="ml-2 text-gray-500">(Espace pour changer)</span>
              </div>
              
              {/* Boutons owner */}
              {isOwner && gridCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <button
                    onClick={sendNextGrid}
                    className="btn-primary flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Nouvelle grille
                  </button>
                </motion.div>
              )}
              
              {/* Podium si grille terminee */}
              {gridCompleted && podium && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 glass rounded-xl p-6 text-center"
                >
                  <h3 className="text-xl font-semibold mb-4">Grille terminée !</h3>
                  <div className="flex justify-center gap-6">
                    {podium.map((player, i) => (
                      <div key={player.pseudo} className="text-center">
                        <div className="text-3xl mb-2">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </div>
                        <div 
                          className="w-8 h-8 rounded-full mx-auto mb-1"
                          style={{ backgroundColor: player.color }}
                        />
                        <p className="font-medium">{player.pseudo}</p>
                        <p className="text-sm text-gray-400">{player.score} pts</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Chargement de la grille...
            </div>
          )}
        </div>
        
        {/* Colonne droite - Scoreboard + Chat + History */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          <Scoreboard 
            scores={scoreboard} 
            myPseudo={pseudo}
          />
          
          <div className="flex-1 min-h-0">
            <ChatPanel
              messages={messages}
              onSendMessage={sendChatMessage}
              myPseudo={pseudo}
              myColor={color}
            />
          </div>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary text-sm py-2"
          >
            {showHistory ? 'Masquer' : 'Afficher'} l'historique
          </button>
          
          {showHistory && (
            <HistoryPanel
              gameCode={code}
            />
          )}
        </div>
      </main>
    </div>
  );
}
