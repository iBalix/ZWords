/**
 * Composant cellule de grille
 */

import { motion } from 'framer-motion';

const cellVariants = {
  idle: { scale: 1 },
  active: { scale: 1.02 },
  typing: { scale: [1, 1.08, 1] },
  incorrect: { 
    x: [0, -4, 4, -4, 4, 0],
    backgroundColor: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.3)']
  },
};

export default function GridCell({
  row,
  col,
  value,
  number,
  isBlack,
  isSelected,
  isClaimed,
  isIncorrect,
  presence,
  direction,
  onClick,
}) {
  if (isBlack) {
    return (
      <div className="grid-cell black" />
    );
  }
  
  // Determiner la variante d'animation
  const variant = isIncorrect ? 'incorrect' : isSelected ? 'active' : 'idle';
  
  // Presence (max 3 autres joueurs)
  const displayedPresence = presence.slice(0, 3);
  
  return (
    <motion.div
      variants={cellVariants}
      animate={variant}
      transition={{ duration: isIncorrect ? 0.4 : 0.15 }}
      onClick={onClick}
      className={`
        grid-cell relative cursor-pointer
        ${isSelected ? 'ring-2 ring-zwords-accent bg-gray-800/80 z-10' : 'hover:bg-gray-800/60'}
        ${isClaimed ? 'bg-green-900/20 border-green-700/50' : ''}
      `}
    >
      {/* Numero de case */}
      {number && (
        <span className="cell-number">{number}</span>
      )}
      
      {/* Valeur */}
      <span className={`
        text-xl font-bold font-mono
        ${value ? 'text-white' : 'text-transparent'}
      `}>
        {value || '.'}
      </span>
      
      {/* Indicateur de direction */}
      {isSelected && direction && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-zwords-accent"
        >
          {direction === 'across' ? '→' : '↓'}
        </motion.div>
      )}
      
      {/* Halos de presence des autres joueurs */}
      {displayedPresence.map((p, i) => (
        <motion.div
          key={p.pseudo}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-sm pointer-events-none"
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
          className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span 
            className="text-[10px] px-1 py-0.5 rounded"
            style={{ backgroundColor: displayedPresence[0].color }}
          >
            {displayedPresence[0].pseudo.slice(0, 8)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
