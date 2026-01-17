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
  claimColors, // Array of colors for claimed entries on this cell
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
    const clueColor = claimColors?.[0]; // Couleur du joueur qui a trouve ce mot
    
    return (
      <motion.div 
        onClick={() => onClueClick && onClueClick(row, col, direction, entryId)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          grid-cell-clue relative flex flex-col items-center justify-center p-0.5
          border cursor-pointer transition-colors
          ${isClaimed 
            ? 'border-2' 
            : 'border-gray-400 bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400'
          }
        `}
        style={isClaimed && clueColor ? {
          background: `linear-gradient(135deg, ${clueColor}40 0%, ${clueColor}60 100%)`,
          borderColor: clueColor,
        } : {}}
      >
        {/* Texte de la definition */}
        <span className={`
          text-[8px] leading-tight text-center font-medium uppercase
          ${isClaimed ? 'text-gray-900' : 'text-gray-700'}
        `}>
          {clue}
        </span>
        
        {/* Fleche de direction */}
        {direction === 'right' && (
          <ArrowRight 
            className="absolute bottom-0 right-0.5 w-3 h-3" 
            style={{ color: isClaimed && clueColor ? clueColor : '#6b7280' }}
          />
        )}
        {direction === 'down' && (
          <ArrowDown 
            className="absolute bottom-0 right-0.5 w-3 h-3"
            style={{ color: isClaimed && clueColor ? clueColor : '#6b7280' }}
          />
        )}
      </motion.div>
    );
  }
  
  // Cellule de lettre
  const displayedPresence = (presence || []).slice(0, 3);
  
  // Determiner le style de fond en fonction des couleurs claim
  const getBackgroundStyle = () => {
    if (!isLocked || !claimColors || claimColors.length === 0) {
      return {};
    }
    
    if (claimColors.length === 1) {
      // Une seule couleur
      return {
        background: `${claimColors[0]}30`,
        borderColor: claimColors[0],
      };
    } else {
      // Deux couleurs ou plus - biseau diagonal
      const color1 = claimColors[0];
      const color2 = claimColors[1] || claimColors[0];
      return {
        background: `linear-gradient(135deg, ${color1}40 0%, ${color1}40 50%, ${color2}40 50%, ${color2}40 100%)`,
        borderColor: color1,
        borderRightColor: color2,
        borderBottomColor: color2,
      };
    }
  };
  
  const bgStyle = getBackgroundStyle();
  
  return (
    <motion.div
      variants={cellVariants}
      animate={isIncorrect ? 'incorrect' : isClaimed ? 'claimed' : isSelected ? 'active' : 'idle'}
      onClick={() => !isLocked && onCellClick && onCellClick(row, col)}
      className={`
        grid-cell-letter relative flex items-center justify-center
        border transition-all
        ${isLocked 
          ? 'cursor-default border-2' 
          : 'bg-white cursor-pointer hover:bg-gray-50 border-gray-400'
        }
        ${isSelected && !isLocked ? 'ring-2 ring-blue-500 bg-blue-50 z-10' : ''}
        ${isIncorrect ? 'bg-red-100 border-red-400' : ''}
      `}
      style={isLocked ? bgStyle : {}}
    >
      {/* Valeur */}
      <span className={`
        text-xl font-bold font-mono uppercase
        ${isLocked ? 'text-gray-800' : value ? 'text-gray-900' : 'text-transparent'}
      `}>
        {value || '.'}
      </span>
      
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
