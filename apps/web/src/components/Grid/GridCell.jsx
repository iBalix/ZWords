/**
 * Composant cellule de grille - Style Mots Fleches
 * - Cellules "clue": contiennent la definition + fleche
 * - Cellules "letter": pour ecrire les lettres
 */

import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';

const cellVariants = {
  idle: { scale: 1 },
  active: { scale: 1.02 },
  typing: { 
    scale: [1, 1.08, 1],
    transition: { duration: 0.15 }
  },
  incorrect: {
    x: [0, -4, 4, -4, 4, 0],
    backgroundColor: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.3)'],
    transition: { duration: 0.4 }
  }
};

export default function GridCell({
  row,
  col,
  type,
  clue,
  direction,
  value,
  isSelected,
  isClaimed,
  isIncorrect,
  presence,
  onClick,
}) {
  // Cellule de definition (clue)
  if (type === 'clue') {
    return (
      <div 
        className="grid-cell-clue relative flex flex-col items-center justify-center p-1
                   bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-400
                   text-gray-800"
      >
        {/* Texte de la definition */}
        <span className="text-[9px] leading-tight text-center font-medium uppercase">
          {clue}
        </span>
        
        {/* Fleche de direction */}
        {direction === 'right' && (
          <ArrowRight className="absolute bottom-0.5 right-0.5 w-3 h-3 text-gray-600" />
        )}
        {direction === 'down' && (
          <ArrowDown className="absolute bottom-0.5 right-0.5 w-3 h-3 text-gray-600" />
        )}
        {direction === 'down-right' && (
          <>
            <ArrowRight className="absolute bottom-0.5 right-3 w-3 h-3 text-gray-600" />
            <ArrowDown className="absolute bottom-0.5 right-0.5 w-3 h-3 text-gray-600" />
          </>
        )}
      </div>
    );
  }
  
  // Cellule de lettre
  const variant = isIncorrect ? 'incorrect' : isSelected ? 'active' : 'idle';
  
  // Presence (max 3 autres joueurs)
  const displayedPresence = (presence || []).slice(0, 3);
  
  return (
    <motion.div
      variants={cellVariants}
      animate={variant}
      transition={{ duration: isIncorrect ? 0.4 : 0.15 }}
      onClick={onClick}
      className={`
        grid-cell-letter relative flex items-center justify-center cursor-pointer
        bg-white border border-gray-400
        ${isSelected ? 'ring-2 ring-zwords-accent bg-blue-50 z-10' : 'hover:bg-gray-50'}
        ${isClaimed ? 'bg-green-100 border-green-500' : ''}
      `}
    >
      {/* Valeur */}
      <span className={`
        text-2xl font-bold font-mono uppercase
        ${value ? 'text-gray-900' : 'text-transparent'}
        ${isClaimed ? 'text-green-700' : ''}
      `}>
        {value || '.'}
      </span>
      
      {/* Halos de presence des autres joueurs */}
      {displayedPresence.map((p, i) => (
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
      {displayedPresence.length > 0 && (
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
