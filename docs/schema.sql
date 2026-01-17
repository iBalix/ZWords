-- ============================================
-- ZWords - Schema Base de Donnees Supabase
-- Jeu de mots croises multijoueur temps reel
-- ============================================

-- Activer l'extension UUID si pas deja fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: zwords_games
-- Parties actives et terminees
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(4) UNIQUE NOT NULL,
    owner_pseudo VARCHAR(50) NOT NULL,
    theme VARCHAR(50) DEFAULT 'general',
    difficulty VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
    current_crossword_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par code
CREATE INDEX IF NOT EXISTS idx_zwords_games_code ON zwords_games(code);
CREATE INDEX IF NOT EXISTS idx_zwords_games_status ON zwords_games(status);

-- ============================================
-- TABLE: zwords_crosswords
-- Grilles de mots croises (historique inclus)
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_crosswords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES zwords_games(id) ON DELETE CASCADE,
    index_number INT NOT NULL DEFAULT 1,
    grid_data JSONB NOT NULL, -- structure grille sans reponses
    clues JSONB NOT NULL, -- indices across/down
    answers_encrypted JSONB NOT NULL, -- reponses (JAMAIS envoyees au client)
    final_grid_state JSONB, -- etat final pour historique
    final_scores JSONB, -- snapshot scores pour historique
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(game_id, index_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_crosswords_game ON zwords_crosswords(game_id);

-- ============================================
-- TABLE: zwords_grid_cells
-- Etat temps reel des cellules de la grille
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_grid_cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crossword_id UUID REFERENCES zwords_crosswords(id) ON DELETE CASCADE,
    row INT NOT NULL,
    col INT NOT NULL,
    value VARCHAR(1),
    updated_by_pseudo VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crossword_id, row, col)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_grid_cells_crossword ON zwords_grid_cells(crossword_id);

-- ============================================
-- TABLE: zwords_players
-- Joueurs par partie (score cumule)
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES zwords_games(id) ON DELETE CASCADE,
    pseudo VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL, -- #RRGGBB
    score_total INT DEFAULT 0,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, pseudo)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_players_game ON zwords_players(game_id);

-- ============================================
-- TABLE: zwords_entry_claims
-- Mots trouves (anti-double score)
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_entry_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crossword_id UUID REFERENCES zwords_crosswords(id) ON DELETE CASCADE,
    entry_id VARCHAR(20) NOT NULL, -- ex: "1-across", "5-down"
    claimed_by_pseudo VARCHAR(50) NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crossword_id, entry_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_entry_claims_crossword ON zwords_entry_claims(crossword_id);

-- ============================================
-- TABLE: zwords_messages
-- Chat + Logs unifies
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES zwords_games(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- chat, log_attempt, log_success, log_fail, log_join, log_leave, log_next
    pseudo VARCHAR(50),
    color VARCHAR(7),
    content TEXT,
    payload JSONB, -- donnees additionnelles (entry_id, word, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_messages_game ON zwords_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_zwords_messages_created ON zwords_messages(created_at DESC);

-- ============================================
-- FONCTION: Incrementer le score d'un joueur
-- ============================================
CREATE OR REPLACE FUNCTION zwords_increment_player_score(
    p_game_id UUID,
    p_pseudo VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    UPDATE zwords_players
    SET score_total = score_total + 1
    WHERE game_id = p_game_id AND pseudo = p_pseudo;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Mettre a jour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION zwords_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_zwords_games_updated_at
    BEFORE UPDATE ON zwords_games
    FOR EACH ROW
    EXECUTE FUNCTION zwords_update_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- Pour le moment, desactive car pas d'auth
-- A activer en V2 avec auth
-- ============================================

-- ALTER TABLE zwords_games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE zwords_crosswords ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE zwords_grid_cells ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE zwords_players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE zwords_entry_claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE zwords_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICY: Lecture publique pour V1
-- ============================================

-- CREATE POLICY "Allow public read" ON zwords_games FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON zwords_crosswords FOR SELECT USING (true);
-- etc.

-- ============================================
-- DONNEES DE TEST (optionnel)
-- ============================================

-- INSERT INTO zwords_games (code, owner_pseudo, theme, difficulty)
-- VALUES ('TEST', 'TestPlayer', 'general', 'easy');
