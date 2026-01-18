-- ============================================
-- ZWords - Schema Mots Fleches (Arrowwords)
-- Banque de mots + definitions + grilles cachees
-- ============================================

-- ============================================
-- TABLE: zwords_words
-- Banque de mots francais avec metadonnees
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Mot original avec accents
    lemma VARCHAR(50) NOT NULL UNIQUE,
    -- Version normalisee ASCII (E pour E, etc.)
    normalized VARCHAR(50) NOT NULL,
    -- Longueur du mot (pour filtrage rapide)
    length INT NOT NULL,
    -- Frequence d'usage (1-100, 100 = tres frequent)
    frequency INT DEFAULT 50,
    -- Score de difficulte (1-100, 100 = tres difficile)
    difficulty_score INT DEFAULT 50,
    -- Tags thematiques (ex: ["gaming", "sport", "histoire"])
    theme_tags TEXT[] DEFAULT '{}',
    -- Source d'import
    source VARCHAR(100),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_zwords_words_normalized ON zwords_words(normalized);
CREATE INDEX IF NOT EXISTS idx_zwords_words_length ON zwords_words(length);
CREATE INDEX IF NOT EXISTS idx_zwords_words_difficulty ON zwords_words(difficulty_score);
CREATE INDEX IF NOT EXISTS idx_zwords_words_frequency ON zwords_words(frequency);
CREATE INDEX IF NOT EXISTS idx_zwords_words_theme_tags ON zwords_words USING GIN(theme_tags);

-- ============================================
-- TABLE: zwords_clues
-- Definitions/indices pour chaque mot
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_clues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_id UUID REFERENCES zwords_words(id) ON DELETE CASCADE,
    -- Texte complet de la definition
    clue_text TEXT NOT NULL,
    -- Version courte (max 40 chars) pour affichage compact
    clue_short VARCHAR(80),
    -- Score de qualite (1-100)
    quality_score INT DEFAULT 50,
    -- Source de la definition
    source VARCHAR(100),
    -- Niveau de difficulte de l'indice (easy/medium/hard)
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_clues_word ON zwords_clues(word_id);
CREATE INDEX IF NOT EXISTS idx_zwords_clues_quality ON zwords_clues(quality_score);
CREATE INDEX IF NOT EXISTS idx_zwords_clues_difficulty ON zwords_clues(difficulty_level);

-- ============================================
-- TABLE: zwords_word_stats
-- Statistiques d'utilisation pour ameliorer la selection
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_word_stats (
    word_id UUID PRIMARY KEY REFERENCES zwords_words(id) ON DELETE CASCADE,
    times_used INT DEFAULT 0,
    times_solved INT DEFAULT 0,
    avg_solve_time_ms INT,
    last_used_at TIMESTAMPTZ
);

-- ============================================
-- TABLE: zwords_generated_grids
-- Cache de grilles pre-generees
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_generated_grids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Taille de la grille (10-15)
    size INT NOT NULL,
    -- Difficulte (easy/medium/hard)
    difficulty VARCHAR(20) NOT NULL,
    -- Theme (general, gaming, histoire, etc.)
    theme VARCHAR(50) DEFAULT 'general',
    -- Grille complete en JSON (voir structure ci-dessous)
    grid_json JSONB NOT NULL,
    -- Seed utilise pour la generation
    seed VARCHAR(100),
    -- Metriques de qualite
    quality_metrics JSONB,
    -- Etat: available, used, invalid
    status VARCHAR(20) DEFAULT 'available',
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

-- Index pour selection rapide
CREATE INDEX IF NOT EXISTS idx_zwords_generated_grids_lookup 
    ON zwords_generated_grids(size, difficulty, theme, status);

-- ============================================
-- TABLE: zwords_grid_words
-- Mots utilises dans chaque grille (pour stats)
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_grid_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grid_id UUID REFERENCES zwords_generated_grids(id) ON DELETE CASCADE,
    word_id UUID REFERENCES zwords_words(id) ON DELETE SET NULL,
    -- Position de la case definition
    clue_cell_row INT NOT NULL,
    clue_cell_col INT NOT NULL,
    -- Direction: right, down
    direction VARCHAR(10) NOT NULL,
    -- Position debut du mot (premiere lettre)
    start_row INT NOT NULL,
    start_col INT NOT NULL,
    -- Longueur
    length INT NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_zwords_grid_words_grid ON zwords_grid_words(grid_id);
CREATE INDEX IF NOT EXISTS idx_zwords_grid_words_word ON zwords_grid_words(word_id);

-- ============================================
-- TABLE: zwords_banned_words (optionnel)
-- Mots a exclure de la generation
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_banned_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(50) NOT NULL UNIQUE,
    reason VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: zwords_banned_clues (optionnel)
-- Definitions a exclure
-- ============================================
CREATE TABLE IF NOT EXISTS zwords_banned_clues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clue_id UUID REFERENCES zwords_clues(id) ON DELETE CASCADE,
    reason VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VUE: Mots avec leurs meilleures definitions
-- ============================================
CREATE OR REPLACE VIEW zwords_words_with_clues AS
SELECT 
    w.id as word_id,
    w.lemma,
    w.normalized,
    w.length,
    w.frequency,
    w.difficulty_score,
    w.theme_tags,
    c.id as clue_id,
    c.clue_text,
    c.clue_short,
    c.quality_score as clue_quality,
    c.difficulty_level as clue_difficulty
FROM zwords_words w
LEFT JOIN zwords_clues c ON c.word_id = w.id
WHERE NOT EXISTS (
    SELECT 1 FROM zwords_banned_words bw 
    WHERE LOWER(w.lemma) = LOWER(bw.word)
)
ORDER BY w.frequency DESC, c.quality_score DESC NULLS LAST;

-- ============================================
-- FONCTION: Obtenir des mots candidats pour generation
-- ============================================
CREATE OR REPLACE FUNCTION zwords_get_word_candidates(
    p_length INT,
    p_difficulty VARCHAR(20) DEFAULT 'medium',
    p_theme VARCHAR(50) DEFAULT 'general',
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    word_id UUID,
    normalized VARCHAR(50),
    clue_text TEXT,
    clue_short VARCHAR(80)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.normalized,
        c.clue_text,
        c.clue_short
    FROM zwords_words w
    JOIN zwords_clues c ON c.word_id = w.id
    WHERE w.length = p_length
        AND NOT EXISTS (
            SELECT 1 FROM zwords_banned_words bw 
            WHERE LOWER(w.lemma) = LOWER(bw.word)
        )
        AND (
            p_difficulty = 'easy' AND w.difficulty_score <= 40
            OR p_difficulty = 'medium' AND w.difficulty_score BETWEEN 30 AND 70
            OR p_difficulty = 'hard' AND w.difficulty_score >= 50
        )
        AND (
            p_theme = 'general' 
            OR p_theme = ANY(w.theme_tags)
        )
    ORDER BY w.frequency DESC, c.quality_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Mettre a jour updated_at sur words
-- ============================================
CREATE TRIGGER trigger_zwords_words_updated_at
    BEFORE UPDATE ON zwords_words
    FOR EACH ROW
    EXECUTE FUNCTION zwords_update_updated_at();

-- ============================================
-- STRUCTURE GRID_JSON ATTENDUE
-- ============================================
/*
{
  "size": 10,
  "cells": [
    {
      "r": 0, "c": 0, 
      "type": "clue",
      "clues": [
        {"direction": "right", "text": "Animal domestique", "entryId": "1-right"}
      ]
    },
    {"r": 0, "c": 1, "type": "letter", "entryIds": ["1-right", "5-down"]},
    {"r": 0, "c": 2, "type": "letter", "entryIds": ["1-right"]},
    {"r": 1, "c": 3, "type": "black"},
    ...
  ],
  "answers": {
    "1-right": {"word": "CHAT", "cells": [[0,1], [0,2], [0,3], [0,4]]},
    "5-down": {"word": "CHIEN", "cells": [[0,1], [1,1], [2,1], [3,1], [4,1]]}
  },
  "wordCount": 25,
  "blackCount": 12
}
*/
