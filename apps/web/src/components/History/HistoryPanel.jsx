/**
 * Panneau historique des grilles
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Eye, RefreshCw } from 'lucide-react';
import { historyApi } from '../../lib/api';
import HistoryGridView from './HistoryGridView';

export default function HistoryPanel({ gameCode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  
  // Charger l'historique
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await historyApi.list(gameCode);
        setHistory(data);
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gameCode]);
  
  // Charger les details d'une grille
  const loadDetail = async (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }
    
    try {
      const data = await historyApi.get(gameCode, id);
      setSelectedId(id);
      setSelectedDetail(data);
    } catch (error) {
      console.error('Erreur chargement detail:', error);
    }
  };
  
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <History className="w-5 h-5 text-zwords-accent" />
        <h3 className="font-semibold">Historique</h3>
      </div>
      
      <div className="p-2 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-6 text-gray-500">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            Aucune grille terminée
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <motion.div key={item.id} layout>
                <button
                  onClick={() => loadDetail(item.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-colors
                    flex items-center justify-between
                    ${selectedId === item.id 
                      ? 'bg-zwords-accent/20 ring-1 ring-zwords-accent' 
                      : 'hover:bg-gray-800/50'
                    }
                  `}
                >
                  <span className="text-sm">
                    Grille #{item.indexNumber}
                  </span>
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
                
                {selectedId === item.id && selectedDetail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-2 bg-gray-800/30 rounded-lg"
                  >
                    <HistoryGridView
                      crossword={selectedDetail.crossword}
                      claims={selectedDetail.claims}
                    />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
