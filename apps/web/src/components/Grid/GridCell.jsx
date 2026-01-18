/**
 * Composant cellule de grille - Style Mots Fleches
 */

import { useState, useEffect } from 'react';
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
    scale: [1, 1.05, 1],
    transition: { duration: 0.2 }
  }
};

// Tronquer le texte
function truncateClue(text, maxLength = 24) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1).trim() + '…';
}

export default function GridCell({
  row,
  col,
  type,
  clue,
  clueFull,
  answer,
  direction,
  entryId,
  value,
  isSelected,
  isClaimed,
  isLocked,
  isIncorrect,
  presence,
  claimColors,
  onCellClick,
  onClueClick,
}) {
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Cellule noire
  if (type === 'black' || type === 'empty') {
    return (
      <div className="grid-cell-empty bg-gray-800 border border-gray-900" />
    );
  }

  const handleMouseMove = (e) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = (e) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Cellule de definition (clue)
  if (type === 'clue') {
    const clueColor = claimColors?.[0];
    const displayText = truncateClue(clue, 22);
    const tooltipText = clueFull || clue || '';
    
    return (
      <>
        <motion.div 
          onClick={() => onClueClick && onClueClick(row, col, direction, entryId)}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileTap={{ scale: 0.98 }}
          className={`
            grid-cell-clue relative flex flex-col items-center justify-center p-0.5
            border cursor-pointer transition-colors overflow-hidden
            ${isClaimed 
              ? 'border-2' 
              : 'border-gray-400 bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400'
            }
          `}
          style={isClaimed && clueColor ? {
            background: `linear-gradient(135deg, ${clueColor}50 0%, ${clueColor}70 100%)`,
            borderColor: clueColor,
          } : {}}
        >
          <span className={`
            text-[6px] sm:text-[7px] leading-[1.1] text-center font-medium uppercase
            ${isClaimed ? 'text-gray-900' : 'text-gray-700'}
            line-clamp-4 overflow-hidden
          `}>
            {displayText}
          </span>
          
          {direction === 'right' && (
            <ArrowRight 
              className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3" 
              style={{ color: isClaimed && clueColor ? clueColor : '#6b7280' }}
            />
          )}
          {direction === 'down' && (
            <ArrowDown 
              className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3"
              style={{ color: isClaimed && clueColor ? clueColor : '#6b7280' }}
            />
          )}
        </motion.div>
        
        {/* Tooltip qui suit le curseur */}
        {showTooltip && (
          <div 
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: tooltipPos.x + 15,
              top: tooltipPos.y + 15,
            }}
          >
            <div className="bg-gray-900/95 text-white text-xs p-2 rounded shadow-lg max-w-[200px]">
              <div className="leading-tight">{tooltipText}</div>
              {answer && (
                <div className="text-green-400 font-bold mt-1 pt-1 border-t border-gray-700">
                  → {answer}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Cellule de lettre
  const displayedPresence = (presence || []).slice(0, 3);
  
  // Style de fond pour les cases verrouillées (avec biseau si 2 couleurs)
  const getBackgroundStyle = () => {
    if (!claimColors || claimColors.length === 0) {
      return {};
    }
    
    if (claimColors.length === 1) {
      return {
        background: `${claimColors[0]}40`,
        borderColor: claimColors[0],
        borderWidth: '2px',
      };
    } else {
      // Biseau diagonal pour 2 couleurs
      const color1 = claimColors[0];
      const color2 = claimColors[1];
      return {
        background: `linear-gradient(135deg, ${color1}50 0%, ${color1}50 50%, ${color2}50 50%, ${color2}50 100%)`,
        borderColor: color1,
        borderWidth: '2px',
      };
    }
  };
  
  const bgStyle = getBackgroundStyle();
  const hasColors = claimColors && claimColors.length > 0;
  
  return (
    <motion.div
      variants={cellVariants}
      animate={isIncorrect ? 'incorrect' : isClaimed ? 'claimed' : isSelected ? 'active' : 'idle'}
      onClick={() => !isLocked && onCellClick && onCellClick(row, col)}
      className={`
        grid-cell-letter relative flex items-center justify-center
        border transition-all
        ${isLocked || hasColors
          ? 'cursor-default' 
          : 'bg-white cursor-pointer hover:bg-gray-50 border-gray-400'
        }
        ${isSelected && !isLocked && !hasColors ? 'ring-2 ring-blue-500 bg-blue-50 z-10' : ''}
        ${isIncorrect ? 'bg-red-100 border-red-400' : ''}
      `}
      style={hasColors ? bgStyle : {}}
    >
      <span className={`
        text-base sm:text-lg md:text-xl font-bold font-mono uppercase
        ${hasColors ? 'text-gray-900' : value ? 'text-gray-900' : 'text-transparent'}
      `}>
        {value || '.'}
      </span>
      
      {!isLocked && !hasColors && displayedPresence.map((p, i) => (
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
      
      {!isLocked && !hasColors && displayedPresence.length > 0 && (
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
