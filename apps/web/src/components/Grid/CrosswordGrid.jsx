/**
 * Composant grille de mots fleches
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import GridCell from './GridCell';

export default function CrosswordGrid({
  gridData,
  cells,
  claims,
  selectedCell,
  direction,
  presence,
  myPseudo,
  incorrectCells,
  onCellClick,
  onClueClick,
}) {
  if (!gridData) return null;
  
  const { rows, cols, cells: gridCells } = gridData;
  
  // Construire la map des claims par entryId
  const claimedEntries = useMemo(() => {
    const set = new Set();
    for (const claim of claims) {
      set.add(claim.entryId);
    }
    return set;
  }, [claims]);
  
  // Construire la map des cellules verrouillees (font partie d'un mot claim)
  const lockedCells = useMemo(() => {
    const locked = new Set();
    for (const cell of gridCells) {
      if (cell.type === 'letter') {
        const entryIds = Array.isArray(cell.entryIds) ? cell.entryIds : (cell.entryId || '').split(',').filter(Boolean);
        // Si AU MOINS UNE entry de cette cellule est claim, elle est verrouillee
        const anyClaimed = entryIds.some(id => claimedEntries.has(id));
        if (anyClaimed) {
          locked.add(`${cell.row}-${cell.col}`);
        }
      }
    }
    return locked;
  }, [gridCells, claimedEntries]);
  
  // Construire la map des presences par cellule (autres joueurs)
  const presenceByCell = useMemo(() => {
    const map = {};
    for (const [playerPseudo, data] of Object.entries(presence)) {
      if (playerPseudo !== myPseudo && data.row !== null && data.col !== null) {
        const key = `${data.row}-${data.col}`;
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(data);
      }
    }
    return map;
  }, [presence, myPseudo]);
  
  // Construire la map des cellules incorrectes
  const incorrectMap = useMemo(() => {
    const map = {};
    for (const cell of incorrectCells) {
      map[`${cell.row}-${cell.col}`] = true;
    }
    return map;
  }, [incorrectCells]);
  
  // Verifier si une cellule fait partie d'un mot claim
  const isCellClaimed = (cell) => {
    if (cell.type !== 'letter') return false;
    const entryIds = Array.isArray(cell.entryIds) ? cell.entryIds : (cell.entryId || '').split(',');
    return entryIds.some(id => claimedEntries.has(id));
  };
  
  // Verifier si une clue est pour un mot claim
  const isClueClaimed = (cell) => {
    if (cell.type !== 'clue') return false;
    return claimedEntries.has(cell.entryId);
  };
  
  // Taille des cellules
  const cellSize = 55;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg shadow-xl p-2 overflow-auto"
    >
      <div 
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        }}
      >
        {gridCells.map((cell) => {
          const key = `${cell.row}-${cell.col}`;
          const value = cells[key] || '';
          const isSelected = selectedCell?.row === cell.row && selectedCell?.col === cell.col;
          const cellPresence = presenceByCell[key] || [];
          const isIncorrect = incorrectMap[key];
          const isClaimed = cell.type === 'letter' ? isCellClaimed(cell) : isClueClaimed(cell);
          const isLocked = lockedCells.has(key);
          
          return (
            <GridCell
              key={key}
              row={cell.row}
              col={cell.col}
              type={cell.type}
              clue={cell.clue}
              direction={cell.direction}
              entryId={cell.entryId}
              value={value}
              isSelected={isSelected && cell.type === 'letter' && !isLocked}
              isClaimed={isClaimed}
              isLocked={isLocked}
              isIncorrect={isIncorrect}
              presence={cellPresence}
              onCellClick={onCellClick}
              onClueClick={onClueClick}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
