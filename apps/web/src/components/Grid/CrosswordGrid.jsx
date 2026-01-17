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
  
  // Construire la map des claims par entryId avec couleur
  const claimsByEntryId = useMemo(() => {
    const map = {};
    for (const claim of claims) {
      map[claim.entryId] = {
        pseudo: claim.pseudo,
        color: claim.color
      };
    }
    return map;
  }, [claims]);
  
  // Set des entryIds claim
  const claimedEntries = useMemo(() => {
    return new Set(claims.map(c => c.entryId));
  }, [claims]);
  
  // Construire la map des cellules verrouillees et leurs couleurs
  const lockedCellsData = useMemo(() => {
    const data = {};
    for (const cell of gridCells) {
      if (cell.type === 'letter') {
        const entryIds = Array.isArray(cell.entryIds) ? cell.entryIds : (cell.entryId || '').split(',').filter(Boolean);
        const colors = [];
        let anyLocked = false;
        
        for (const id of entryIds) {
          if (claimsByEntryId[id]) {
            anyLocked = true;
            const color = claimsByEntryId[id].color;
            if (color && !colors.includes(color)) {
              colors.push(color);
            }
          }
        }
        
        if (anyLocked) {
          data[`${cell.row}-${cell.col}`] = colors;
        }
      }
    }
    return data;
  }, [gridCells, claimsByEntryId]);
  
  // Construire la map des presences par cellule (autres joueurs)
  const presenceByCell = useMemo(() => {
    const map = {};
    for (const [playerPseudo, pData] of Object.entries(presence)) {
      if (playerPseudo !== myPseudo && pData.row !== null && pData.col !== null) {
        const key = `${pData.row}-${pData.col}`;
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(pData);
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
    const entryIds = Array.isArray(cell.entryIds) ? cell.entryIds : (cell.entryId || '').split(',').filter(Boolean);
    return entryIds.some(id => claimedEntries.has(id));
  };
  
  // Verifier si une clue est pour un mot claim et obtenir sa couleur
  const getClueClaimData = (cell) => {
    if (cell.type !== 'clue') return { isClaimed: false, colors: [] };
    const claim = claimsByEntryId[cell.entryId];
    if (claim) {
      return { isClaimed: true, colors: [claim.color] };
    }
    return { isClaimed: false, colors: [] };
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
          
          let isClaimed = false;
          let claimColors = [];
          let isLocked = false;
          
          if (cell.type === 'letter') {
            isClaimed = isCellClaimed(cell);
            claimColors = lockedCellsData[key] || [];
            isLocked = claimColors.length > 0;
          } else if (cell.type === 'clue') {
            const clueData = getClueClaimData(cell);
            isClaimed = clueData.isClaimed;
            claimColors = clueData.colors;
          }
          
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
              claimColors={claimColors}
              onCellClick={onCellClick}
              onClueClick={onClueClick}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
