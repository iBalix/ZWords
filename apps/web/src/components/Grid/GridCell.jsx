/**
 * Composant cellule de grille - Style Mots Fleches
 * - Cellules "clue": contiennent la definition + fleche
 * - Cellules "letter": pour ecrire les lettres
 * - Cellules "empty": cases grises de remplissage
 */

import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';

const cellVariants = {
  idle: { scale: 1 },
  active: { scale: 1.02 },
  incorrect: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 }
  },
  claimed: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.3 }
  }
};

export default function GridCell({
  row,
  col,
  type,
  clue,
  direction,
  entryId,
  value,
  isSelected,
  isClaimed,
  isLocked,
  isIncorrect,
  presence,
  onCellClick,
  onClueClick,
}) {
  // Cellule vide (remplissage)
  if (type === 'empty') {
    return (
      <div className="grid-cell-empty bg-gray-300 border border-gray-400" />
    );
  }

  // Cellule de definition (clue)
  if (type === 'clue') {
    const isClueForClaimed = isClaimed;
    
    return (
      <motion.div 
        onClick={() => onClueClick && onClueClick(row, col, direction, entryId)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          grid-cell-clue relative flex flex-col items-center justify-center p-0.5
          border border-gray-400 cursor-pointer transition-colors
          ${isClueForClaimed 
            ? 'bg-gradient-to-br from-green-200 to-green-300 border-green-500' 
            : 'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400'
          }
        `}
      >
        {/* Texte de la definition */}
        <span className={`
          text-[8px] leading-tight text-center font-medium uppercase
          ${isClueForClaimed ? 'text-green-800' : 'text-gray-700'}
        `}>
          {clue}
        </span>
        
        {/* Fleche de direction */}
        {direction === 'right' && (
          <ArrowRight className={`absolute bottom-0 right-0.5 w-3 h-3 ${isClueForClaimed ? 'text-green-600' : 'text-gray-500'}`} />
        )}
        {direction === 'down' && (
          <ArrowDown className={`absolute bottom-0 right-0.5 w-3 h-3 ${isClueForClaimed ? 'text-green-600' : 'text-gray-500'}`} />
        )}
      </motion.div>
    );
  }
  
  // Cellule de lettre
  const displayedPresence = (presence || []).slice(0, 3);
  
  return (
    <motion.div
      variants={cellVariants}
      animate={isIncorrect ? 'incorrect' : isClaimed ? 'claimed' : isSelected ? 'active' : 'idle'}
      onClick={() => !isLocked && onCellClick && onCellClick(row, col)}
      className={`
        grid-cell-letter relative flex items-center justify-center
        border border-gray-400 transition-all
        ${isLocked 
          ? 'bg-green-100 border-green-400 cursor-default' 
          : 'bg-white cursor-pointer hover:bg-gray-50'
        }
        ${isSelected && !isLocked ? 'ring-2 ring-blue-500 bg-blue-50 z-10' : ''}
        ${isIncorrect ? 'bg-red-100 border-red-400' : ''}
      `}
    >
      {/* Valeur */}
      <span className={`
        text-xl font-bold font-mono uppercase
        ${isLocked ? 'text-green-700' : value ? 'text-gray-900' : 'text-transparent'}
      `}>
        {value || '.'}
      </span>
      
      {/* Indicateur de verrouillage */}
      {isLocked && (
        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full" />
      )}
      
      {/* Halos de presence des autres joueurs */}
      {!isLocked && displayedPresence.map((p, i) => (
        <motion.div
          key={p.pseudo}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `0 0 0 ${2 + i}px ${p.color}`,
            zIndex: -1 - i,
          }}
        />
      ))}
      
      {/* Badge pseudo du premier joueur present */}
      {!isLocked && displayedPresence.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-20"
        >
          <span 
            className="text-[10px] px-1 py-0.5 rounded text-white"
            style={{ backgroundColor: displayedPresence[0].color }}
          >
            {displayedPresence[0].pseudo.slice(0, 8)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
