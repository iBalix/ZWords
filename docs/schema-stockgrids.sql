-- =====================================================
-- ZWords - Schéma pour grilles pré-stockées
-- =====================================================

-- Table des grilles en stock (prêtes à jouer)
CREATE TABLE IF NOT EXISTS zwords_stock_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Métadonnées
  name VARCHAR(100),                    -- Nom optionnel de la grille
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  source VARCHAR(100),                  -- Source (fichier image, etc.)
  
  -- Dimensions
  rows INTEGER NOT NULL,
  cols INTEGER NOT NULL,
  
  -- Données de la grille (format JSON)
  -- cells: [{ row, col, type, clue?, clueFull?, answer?, direction?, entryId?, entryIds? }]
  grid_data JSONB NOT NULL,
  
  -- Réponses (format JSON) - côté serveur uniquement
  -- { "entryId": { word: "MOT", cells: [[r,c], [r,c], ...] } }
  answers JSONB NOT NULL,
  
  -- Statistiques
  times_used INTEGER DEFAULT 0,         -- Nombre de fois utilisée
  avg_completion_time INTEGER,          -- Temps moyen de complétion (secondes)
  
  -- État
  is_active BOOLEAN DEFAULT true,       -- Grille disponible pour utilisation
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour sélection aléatoire efficace
CREATE INDEX IF NOT EXISTS idx_stock_grids_active ON zwords_stock_grids(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stock_grids_difficulty ON zwords_stock_grids(difficulty, is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION zwords_update_stock_grids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_grids_updated_at ON zwords_stock_grids;
CREATE TRIGGER trigger_stock_grids_updated_at
  BEFORE UPDATE ON zwords_stock_grids
  FOR EACH ROW
  EXECUTE FUNCTION zwords_update_stock_grids_updated_at();

-- Vue pour stats
CREATE OR REPLACE VIEW zwords_stock_stats AS
SELECT 
  COUNT(*) FILTER (WHERE is_active) as active_grids,
  COUNT(*) FILTER (WHERE NOT is_active) as inactive_grids,
  COUNT(*) FILTER (WHERE difficulty = 'easy' AND is_active) as easy_grids,
  COUNT(*) FILTER (WHERE difficulty = 'medium' AND is_active) as medium_grids,
  COUNT(*) FILTER (WHERE difficulty = 'hard' AND is_active) as hard_grids,
  AVG(times_used) as avg_times_used
FROM zwords_stock_grids;

-- =====================================================
-- IMPORTANT: Exécuter ce script dans Supabase SQL Editor
-- =====================================================
