/**
 * Panneau des indices
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';

export default function CluePanel({
  clues,
  claims,
  selectedCell,
  direction,
  onSelectClue,
}) {
  const [activeTab, setActiveTab] = useState('across');
  
  if (!clues) return null;
  
  // Map des claims par entryId
  const claimsMap = {};
  for (const claim of claims) {
    claimsMap[claim.entryId] = claim;
  }
  
  const displayedClues = activeTab === 'across' ? clues.across : clues.down;
  
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('across')}
          className={`
            flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium
            transition-colors
            ${activeTab === 'across' 
              ? 'bg-zwords-accent/20 text-zwords-accent-light border-b-2 border-zwords-accent' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }
          `}
        >
          <ChevronRight className="w-4 h-4" />
          Horizontal
        </button>
        <button
          onClick={() => setActiveTab('down')}
          className={`
            flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium
            transition-colors
            ${activeTab === 'down' 
              ? 'bg-zwords-accent/20 text-zwords-accent-light border-b-2 border-zwords-accent' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }
          `}
        >
          <ChevronDown className="w-4 h-4" />
          Vertical
        </button>
      </div>
      
      {/* Liste des indices */}
      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {displayedClues.map((clue) => {
          const entryId = `${clue.number}-${activeTab}`;
          const claim = claimsMap[entryId];
          const isSelected = selectedCell?.row === clue.row && 
                            selectedCell?.col === clue.col &&
                            direction === activeTab;
          
          return (
            <motion.button
              key={entryId}
              onClick={() => onSelectClue(clue, activeTab)}
              whileHover={{ x: 2 }}
              className={`
                w-full text-left px-3 py-2 rounded-lg transition-colors
                ${isSelected ? 'bg-zwords-accent/20 ring-1 ring-zwords-accent' : 'hover:bg-gray-800/50'}
                ${claim ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-start gap-2">
                <span className={`
                  font-mono text-sm w-6 flex-shrink-0
                  ${claim ? 'text-green-500' : 'text-zwords-accent'}
                `}>
                  {clue.number}.
                </span>
                
                <span className={`text-sm ${claim ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {clue.clue}
                </span>
                
                {claim && (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 ml-auto" />
                )}
              </div>
              
              {claim && (
                <div className="flex items-center gap-1 mt-1 ml-8">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: claim.color }}
                  />
                  <span className="text-xs text-gray-500">
                    {claim.claimedByPseudo}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
