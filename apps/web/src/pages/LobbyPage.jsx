/**
 * Page Lobby - Accueil et liste des parties
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogIn, Users, RefreshCw, Copy, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { gamesApi } from '../lib/api';
import { useLocalPlayer, PRESET_COLORS } from '../hooks/useLocalPlayer';
import PseudoModal from '../components/Modals/PseudoModal';
import CreateGameModal from '../components/Modals/CreateGameModal';
import ColorPicker from '../components/common/ColorPicker';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { pseudo, color, isLoaded, hasPseudo, updatePseudo, updateColor, ensureColor } = useLocalPlayer();
  
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPseudoModal, setShowPseudoModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  
  // Charger les parties
  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await gamesApi.list();
      setGames(data);
    } catch (error) {
      console.error('Erreur chargement parties:', error);
      toast.error('Erreur lors du chargement des parties');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadGames();
    // Refresh toutes les 10 secondes
    const interval = setInterval(loadGames, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Afficher le modal pseudo si pas de pseudo
  useEffect(() => {
    if (isLoaded && !hasPseudo) {
      setShowPseudoModal(true);
    }
  }, [isLoaded, hasPseudo]);
  
  // Creer une partie
  const handleCreateGame = async (theme, difficulty) => {
    if (!hasPseudo) {
      setShowPseudoModal(true);
      return;
    }
    
    try {
      const playerColor = ensureColor();
      const result = await gamesApi.create(pseudo, theme, difficulty);
      toast.success(`Partie créée ! Code: ${result.code}`);
      navigate(`/game/${result.code}`);
    } catch (error) {
      console.error('Erreur creation partie:', error);
      
      // Gérer l'erreur de stock vide
      if (error.response?.status === 503 || error.message?.includes('grille')) {
        toast.error('⚠️ Aucune grille disponible ! Importez des grilles pour jouer.', {
          duration: 5000
        });
      } else {
        toast.error('Erreur lors de la création de la partie');
      }
    }
  };
  
  // Rejoindre une partie
  const handleJoinGame = async (code) => {
    if (!hasPseudo) {
      setShowPseudoModal(true);
      return;
    }
    
    if (!code || code.length !== 4) {
      toast.error('Code invalide (4 caractères)');
      return;
    }
    
    try {
      setJoiningCode(true);
      const playerColor = ensureColor();
      await gamesApi.join(code.toUpperCase(), pseudo, playerColor);
      navigate(`/game/${code.toUpperCase()}`);
    } catch (error) {
      console.error('Erreur join partie:', error);
      if (error.response?.status === 404) {
        toast.error('Partie non trouvée');
      } else {
        toast.error('Erreur lors de la connexion à la partie');
      }
    } finally {
      setJoiningCode(false);
    }
  };
  
  // Sauvegarder le pseudo
  const handleSavePseudo = (newPseudo, newColor) => {
    updatePseudo(newPseudo);
    updateColor(newColor);
    setShowPseudoModal(false);
    toast.success(`Bienvenue ${newPseudo} !`);
  };
  
  // Supprimer une partie
  const handleDeleteGame = async (code) => {
    if (!confirm('Supprimer cette partie ?')) return;
    
    try {
      await gamesApi.delete(code, pseudo);
      toast.success('Partie supprimée');
      loadGames();
    } catch (error) {
      console.error('Erreur suppression:', error);
      if (error.response?.status === 403) {
        toast.error('Vous n\'êtes pas le créateur de cette partie');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-game">
      {/* Header - Responsive */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-display text-white tracking-wider">
            Z<span className="text-zwords-accent">WORDS</span>
          </h1>
          
          {hasPseudo && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-gray-400 text-xs sm:text-base hidden sm:inline">Connecté en tant que</span>
              <button 
                onClick={() => setShowPseudoModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" 
                  style={{ backgroundColor: color || '#6366f1' }}
                />
                <span className="font-medium text-sm sm:text-base truncate max-w-[80px] sm:max-w-none">{pseudo}</span>
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Colonne gauche - Actions */}
          <div className="space-y-6">
            {/* Creer une partie */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-zwords-accent" />
                Créer une partie
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouvelle partie
              </button>
            </motion.div>
            
            {/* Rejoindre une partie */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-zwords-accent" />
                Rejoindre une partie
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="CODE"
                  maxLength={4}
                  className="input-field code-input"
                />
                <button
                  onClick={() => handleJoinGame(joinCode)}
                  disabled={joiningCode || joinCode.length !== 4}
                  className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joiningCode ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  Rejoindre
                </button>
              </div>
            </motion.div>
          </div>
          
          {/* Colonne droite - Liste des parties */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-zwords-accent" />
                  Parties actives
                </h2>
                <button
                  onClick={loadGames}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {loading && games.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  Chargement...
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune partie en cours</p>
                  <p className="text-sm mt-1">Créez-en une !</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {games.map((game) => (
                      <GameCard 
                        key={game.code} 
                        game={game} 
                        currentPseudo={pseudo}
                        onJoin={handleJoinGame}
                        onDelete={handleDeleteGame}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      
      {/* Modals */}
      <PseudoModal
        isOpen={showPseudoModal}
        onClose={() => hasPseudo && setShowPseudoModal(false)}
        onSave={handleSavePseudo}
        initialPseudo={pseudo}
        initialColor={color}
      />
      
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateGame}
      />
    </div>
  );
}

// Composant carte de partie - Responsive
function GameCard({ game, currentPseudo, onJoin, onDelete }) {
  const [copied, setCopied] = useState(false);
  
  const ownerPseudo = game.ownerPseudo || game.owner_pseudo;
  const isOwner = currentPseudo && ownerPseudo === currentPseudo;
  
  const copyCode = async () => {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors gap-3 sm:gap-4"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={copyCode}
          className="px-2 sm:px-3 py-1 sm:py-1.5 font-mono text-base sm:text-lg bg-gray-900 rounded border border-gray-700 hover:border-zwords-accent transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          ) : (
            game.code
          )}
        </button>
        
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm sm:text-base truncate">
            {ownerPseudo}
            {isOwner && <span className="ml-2 text-xs text-zwords-accent">(vous)</span>}
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            {game.difficulty}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
          {game.playerCount || 0}
        </span>
        
        {isOwner && (
          <button
            onClick={() => onDelete(game.code)}
            className="p-1.5 sm:p-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors"
            title="Supprimer la partie"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={() => onJoin(game.code)}
          className="btn-primary py-1.5 sm:py-2 px-3 sm:px-4 text-sm sm:text-base"
        >
          Rejoindre
        </button>
      </div>
    </motion.div>
  );
}
