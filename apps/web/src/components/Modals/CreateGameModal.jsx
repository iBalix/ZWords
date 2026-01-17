/**
 * Modal de creation de partie
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles } from 'lucide-react';

const THEMES = [
  { value: 'general', label: 'Général', icon: '🎯' },
  { value: 'cinema', label: 'Cinéma', icon: '🎬' },
  { value: 'sport', label: 'Sport', icon: '⚽' },
  { value: 'histoire', label: 'Histoire', icon: '📜' },
  { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'musique', label: 'Musique', icon: '🎵' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Facile', color: 'text-green-400' },
  { value: 'medium', label: 'Moyen', color: 'text-yellow-400' },
  { value: 'hard', label: 'Difficile', color: 'text-red-400' },
];

export default function CreateGameModal({ isOpen, onClose, onCreate }) {
  const [theme, setTheme] = useState('general');
  const [difficulty, setDifficulty] = useState('easy');
  
  const handleCreate = () => {
    onCreate(theme, difficulty);
    onClose();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="glass rounded-2xl p-6 w-full max-w-lg">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-zwords-accent" />
                  Nouvelle partie
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Theme */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Thème
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`
                        p-3 rounded-lg border transition-all text-center
                        ${theme === t.value 
                          ? 'border-zwords-accent bg-zwords-accent/10' 
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }
                      `}
                    >
                      <span className="text-2xl block mb-1">{t.icon}</span>
                      <span className="text-sm">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Difficulte */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Difficulté
                </label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={`
                        flex-1 py-3 rounded-lg border transition-all
                        ${difficulty === d.value 
                          ? 'border-zwords-accent bg-zwords-accent/10' 
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }
                      `}
                    >
                      <span className={`font-medium ${d.color}`}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bouton */}
              <button
                onClick={handleCreate}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer la partie
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
