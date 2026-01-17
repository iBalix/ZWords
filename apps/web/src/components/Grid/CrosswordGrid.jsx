/**
 * Composant grille de mots fleches
 */

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
}) {
  if (!gridData) return null;
  
  const { rows, cols, cells: gridCells } = gridData;
  
  // Construire la map des claims par entryId
  const claimedEntries = new Set();
  for (const claim of claims) {
    claimedEntries.add(claim.entryId);
  }
  
  // Construire la map des presences par cellule (autres joueurs)
  const presenceByCell = {};
  for (const [playerPseudo, data] of Object.entries(presence)) {
    if (playerPseudo !== myPseudo && data.row !== null && data.col !== null) {
      const key = `${data.row}-${data.col}`;
      if (!presenceByCell[key]) {
        presenceByCell[key] = [];
      }
      presenceByCell[key].push(data);
    }
  }
  
  // Construire la map des cellules incorrectes
  const incorrectMap = {};
  for (const cell of incorrectCells) {
    incorrectMap[`${cell.row}-${cell.col}`] = true;
  }
  
  // Verifier si une cellule fait partie d'un mot claim
  const isCellClaimed = (cell) => {
    if (cell.type !== 'letter') return false;
    const entryIds = cell.entryIds || [];
    return entryIds.some(id => claimedEntries.has(id));
  };
  
  // Taille des cellules
  const cellSize = 50;
  
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
          const isClaimed = isCellClaimed(cell);
          
          return (
            <GridCell
              key={key}
              row={cell.row}
              col={cell.col}
              type={cell.type}
              clue={cell.clue}
              direction={cell.direction}
              value={value}
              isSelected={isSelected && cell.type === 'letter'}
              isClaimed={isClaimed}
              isIncorrect={isIncorrect}
              presence={cellPresence}
              onClick={() => cell.type === 'letter' && onCellClick(cell.row, cell.col)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
