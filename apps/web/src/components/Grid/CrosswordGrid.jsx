/**
 * Composant grille de mots croises
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
  
  // Construire la map des claims par entry
  const claimsMap = {};
  for (const claim of claims) {
    claimsMap[claim.entryId] = claim;
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
  
  // Trouver les cellules du mot actif
  const activeWordCells = new Set();
  // TODO: calculer les cellules du mot actif basé sur selectedCell et direction
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl p-4"
    >
      <div 
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, 40px)`,
          gridTemplateRows: `repeat(${rows}, 40px)`,
        }}
      >
        {gridCells.map((cell) => {
          const key = `${cell.row}-${cell.col}`;
          const value = cells[key] || '';
          const isSelected = selectedCell?.row === cell.row && selectedCell?.col === cell.col;
          const cellPresence = presenceByCell[key] || [];
          const isIncorrect = incorrectMap[key];
          
          // Verifier si la cellule fait partie d'un mot claim
          const isClaimed = false; // TODO: calculer
          
          return (
            <GridCell
              key={key}
              row={cell.row}
              col={cell.col}
              value={value}
              number={cell.number}
              isBlack={cell.isBlack}
              isSelected={isSelected}
              isClaimed={isClaimed}
              isIncorrect={isIncorrect}
              presence={cellPresence}
              direction={isSelected ? direction : null}
              onClick={() => !cell.isBlack && onCellClick(cell.row, cell.col)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
