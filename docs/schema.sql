-- ============================================
-- ZWords - Schema Base de Donnees Supabase
-- Jeu de mots croises multijoueur temps reel
-- ============================================

-- Activer l'extension UUID si pas deja fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: games
-- Parties actives et terminees
-- ============================================
CREATE TABLE IF NOT EXISTS games (
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
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- ============================================
-- TABLE: crosswords
-- Grilles de mots croises (historique inclus)
-- ============================================
CREATE TABLE IF NOT EXISTS crosswords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_crosswords_game ON crosswords(game_id);

-- ============================================
-- TABLE: grid_cells
-- Etat temps reel des cellules de la grille
-- ============================================
CREATE TABLE IF NOT EXISTS grid_cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crossword_id UUID REFERENCES crosswords(id) ON DELETE CASCADE,
    row INT NOT NULL,
    col INT NOT NULL,
    value VARCHAR(1),
    updated_by_pseudo VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crossword_id, row, col)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_grid_cells_crossword ON grid_cells(crossword_id);

-- ============================================
-- TABLE: players
-- Joueurs par partie (score cumule)
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    pseudo VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL, -- #RRGGBB
    score_total INT DEFAULT 0,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, pseudo)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);

-- ============================================
-- TABLE: entry_claims
-- Mots trouves (anti-double score)
-- ============================================
CREATE TABLE IF NOT EXISTS entry_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crossword_id UUID REFERENCES crosswords(id) ON DELETE CASCADE,
    entry_id VARCHAR(20) NOT NULL, -- ex: "1-across", "5-down"
    claimed_by_pseudo VARCHAR(50) NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crossword_id, entry_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_entry_claims_crossword ON entry_claims(crossword_id);

-- ============================================
-- TABLE: messages
-- Chat + Logs unifies
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- chat, log_attempt, log_success, log_fail, log_join, log_leave, log_next
    pseudo VARCHAR(50),
    color VARCHAR(7),
    content TEXT,
    payload JSONB, -- donnees additionnelles (entry_id, word, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============================================
-- FONCTION: Incrementer le score d'un joueur
-- ============================================
CREATE OR REPLACE FUNCTION increment_player_score(
    p_game_id UUID,
    p_pseudo VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    UPDATE players
    SET score_total = score_total + 1
    WHERE game_id = p_game_id AND pseudo = p_pseudo;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Mettre a jour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- Pour le moment, desactive car pas d'auth
-- A activer en V2 avec auth
-- ============================================

-- ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crosswords ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE grid_cells ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE entry_claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICY: Lecture publique pour V1
-- ============================================

-- CREATE POLICY "Allow public read" ON games FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON crosswords FOR SELECT USING (true);
-- etc.

-- ============================================
-- DONNEES DE TEST (optionnel)
-- ============================================

-- INSERT INTO games (code, owner_pseudo, theme, difficulty)
-- VALUES ('TEST', 'TestPlayer', 'general', 'easy');
