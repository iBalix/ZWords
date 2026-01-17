/**
 * Composant Scoreboard
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';

export default function Scoreboard({ scores, myPseudo }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold">Classement</h3>
      </div>
      
      <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
        <AnimatePresence>
          {scores.map((player, index) => (
            <motion.div
              key={player.pseudo}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg
                ${player.pseudo === myPseudo ? 'bg-zwords-accent/10 ring-1 ring-zwords-accent/30' : 'hover:bg-gray-800/30'}
              `}
            >
              {/* Rang */}
              <span className={`
                w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold
                ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${index === 1 ? 'bg-gray-400/20 text-gray-300' : ''}
                ${index === 2 ? 'bg-amber-600/20 text-amber-500' : ''}
                ${index > 2 ? 'text-gray-500' : ''}
              `}>
                {index + 1}
              </span>
              
              {/* Couleur + Pseudo */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <span className={`
                  truncate
                  ${player.pseudo === myPseudo ? 'font-semibold text-white' : 'text-gray-200'}
                `}>
                  {player.pseudo}
                </span>
              </div>
              
              {/* Score */}
              <motion.span
                key={player.score}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                className="font-mono font-bold text-zwords-accent"
              >
                {player.score}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {scores.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Medal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">En attente de joueurs...</p>
          </div>
        )}
      </div>
    </div>
  );
}
