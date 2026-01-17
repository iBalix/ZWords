/**
 * Modal pour rejoindre une partie
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn } from 'lucide-react';

export default function JoinGameModal({ isOpen, onClose, onJoin }) {
  const [code, setCode] = useState('');
  
  const handleJoin = () => {
    if (code.length === 4) {
      onJoin(code.toUpperCase());
      onClose();
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && code.length === 4) {
      handleJoin();
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
            <div className="glass rounded-2xl p-6 w-full max-w-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-zwords-accent" />
                  Rejoindre
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Code input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Code de la partie
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX"
                  maxLength={4}
                  autoFocus
                  className="input-field code-input"
                />
              </div>
              
              {/* Bouton */}
              <button
                onClick={handleJoin}
                disabled={code.length !== 4}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rejoindre la partie
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
