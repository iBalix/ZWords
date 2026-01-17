/**
 * Modal de selection du pseudo
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import { PRESET_COLORS } from '../../hooks/useLocalPlayer';

export default function PseudoModal({
  isOpen,
  onClose,
  onSave,
  initialPseudo = '',
  initialColor = '',
}) {
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [color, setColor] = useState(initialColor || PRESET_COLORS[0]);
  
  useEffect(() => {
    setPseudo(initialPseudo);
    setColor(initialColor || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  }, [initialPseudo, initialColor, isOpen]);
  
  const handleSave = () => {
    if (pseudo.trim()) {
      onSave(pseudo.trim(), color);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && pseudo.trim()) {
      handleSave();
    }
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
            <div className="glass rounded-2xl p-6 w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-zwords-accent" />
                  Votre profil
                </h2>
                {initialPseudo && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Pseudo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pseudo
                </label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Entrez votre pseudo..."
                  maxLength={50}
                  autoFocus
                  className="input-field"
                />
              </div>
              
              {/* Couleur */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Couleur
                </label>
                <ColorPicker
                  value={color}
                  onChange={setColor}
                  colors={PRESET_COLORS}
                />
              </div>
              
              {/* Preview */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Apercu :</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-lg">
                    {pseudo || 'Votre pseudo'}
                  </span>
                </div>
              </div>
              
              {/* Bouton */}
              <button
                onClick={handleSave}
                disabled={!pseudo.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initialPseudo ? 'Mettre à jour' : 'Commencer à jouer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
