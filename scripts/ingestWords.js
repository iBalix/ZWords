/**
 * ZWords - Script d'import de mots
 * 
 * Usage:
 *   node scripts/ingestWords.js --file=data/words.csv
 *   node scripts/ingestWords.js --file=data/words.json
 *   node scripts/ingestWords.js --demo (charge des mots de démonstration)
 * 
 * Format CSV attendu:
 *   lemma,frequency,difficulty,tags
 *   "chat",85,30,"animaux,quotidien"
 *   "château",60,45,"histoire,architecture"
 * 
 * Format JSON attendu:
 *   [
 *     { "lemma": "chat", "frequency": 85, "difficulty": 30, "tags": ["animaux", "quotidien"] }
 *   ]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Utils
const textNormalization = require('./lib/textNormalization.cjs');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Mots de démonstration français (base pour tests)
const DEMO_WORDS = [
  { lemma: 'chat', frequency: 90, difficulty: 20, tags: ['animaux', 'quotidien'] },
  { lemma: 'chien', frequency: 90, difficulty: 20, tags: ['animaux', 'quotidien'] },
  { lemma: 'maison', frequency: 85, difficulty: 25, tags: ['quotidien', 'architecture'] },
  { lemma: 'soleil', frequency: 85, difficulty: 25, tags: ['nature', 'quotidien'] },
  { lemma: 'lune', frequency: 80, difficulty: 30, tags: ['nature', 'astronomie'] },
  { lemma: 'arbre', frequency: 80, difficulty: 25, tags: ['nature', 'quotidien'] },
  { lemma: 'fleur', frequency: 80, difficulty: 25, tags: ['nature', 'quotidien'] },
  { lemma: 'eau', frequency: 95, difficulty: 15, tags: ['nature', 'quotidien'] },
  { lemma: 'feu', frequency: 85, difficulty: 20, tags: ['nature', 'quotidien'] },
  { lemma: 'terre', frequency: 85, difficulty: 20, tags: ['nature', 'géographie'] },
  { lemma: 'ciel', frequency: 85, difficulty: 20, tags: ['nature', 'quotidien'] },
  { lemma: 'mer', frequency: 85, difficulty: 20, tags: ['nature', 'géographie'] },
  { lemma: 'montagne', frequency: 70, difficulty: 30, tags: ['nature', 'géographie'] },
  { lemma: 'forêt', frequency: 75, difficulty: 30, tags: ['nature', 'géographie'] },
  { lemma: 'rivière', frequency: 70, difficulty: 35, tags: ['nature', 'géographie'] },
  { lemma: 'ville', frequency: 85, difficulty: 25, tags: ['géographie', 'quotidien'] },
  { lemma: 'pays', frequency: 85, difficulty: 20, tags: ['géographie', 'quotidien'] },
  { lemma: 'roi', frequency: 75, difficulty: 25, tags: ['histoire', 'quotidien'] },
  { lemma: 'reine', frequency: 75, difficulty: 25, tags: ['histoire', 'quotidien'] },
  { lemma: 'prince', frequency: 70, difficulty: 30, tags: ['histoire', 'quotidien'] },
  { lemma: 'château', frequency: 65, difficulty: 35, tags: ['histoire', 'architecture'] },
  { lemma: 'guerre', frequency: 70, difficulty: 30, tags: ['histoire', 'quotidien'] },
  { lemma: 'paix', frequency: 75, difficulty: 25, tags: ['quotidien'] },
  { lemma: 'amour', frequency: 90, difficulty: 20, tags: ['quotidien', 'sentiments'] },
  { lemma: 'joie', frequency: 80, difficulty: 25, tags: ['sentiments', 'quotidien'] },
  { lemma: 'peur', frequency: 80, difficulty: 25, tags: ['sentiments', 'quotidien'] },
  { lemma: 'homme', frequency: 95, difficulty: 15, tags: ['quotidien'] },
  { lemma: 'femme', frequency: 95, difficulty: 15, tags: ['quotidien'] },
  { lemma: 'enfant', frequency: 90, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'père', frequency: 90, difficulty: 20, tags: ['famille', 'quotidien'] },
  { lemma: 'mère', frequency: 90, difficulty: 20, tags: ['famille', 'quotidien'] },
  { lemma: 'frère', frequency: 85, difficulty: 25, tags: ['famille', 'quotidien'] },
  { lemma: 'sœur', frequency: 85, difficulty: 25, tags: ['famille', 'quotidien'] },
  { lemma: 'ami', frequency: 85, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'main', frequency: 90, difficulty: 20, tags: ['corps', 'quotidien'] },
  { lemma: 'pied', frequency: 85, difficulty: 20, tags: ['corps', 'quotidien'] },
  { lemma: 'tête', frequency: 90, difficulty: 20, tags: ['corps', 'quotidien'] },
  { lemma: 'cœur', frequency: 85, difficulty: 25, tags: ['corps', 'sentiments'] },
  { lemma: 'œil', frequency: 80, difficulty: 30, tags: ['corps', 'quotidien'] },
  { lemma: 'oreille', frequency: 70, difficulty: 35, tags: ['corps', 'quotidien'] },
  { lemma: 'bouche', frequency: 80, difficulty: 25, tags: ['corps', 'quotidien'] },
  { lemma: 'nez', frequency: 85, difficulty: 20, tags: ['corps', 'quotidien'] },
  { lemma: 'pain', frequency: 90, difficulty: 15, tags: ['nourriture', 'quotidien'] },
  { lemma: 'vin', frequency: 85, difficulty: 20, tags: ['nourriture', 'quotidien'] },
  { lemma: 'fromage', frequency: 75, difficulty: 30, tags: ['nourriture', 'quotidien'] },
  { lemma: 'viande', frequency: 75, difficulty: 25, tags: ['nourriture', 'quotidien'] },
  { lemma: 'fruit', frequency: 80, difficulty: 25, tags: ['nourriture', 'nature'] },
  { lemma: 'légume', frequency: 70, difficulty: 30, tags: ['nourriture', 'nature'] },
  { lemma: 'table', frequency: 85, difficulty: 20, tags: ['mobilier', 'quotidien'] },
  { lemma: 'chaise', frequency: 80, difficulty: 25, tags: ['mobilier', 'quotidien'] },
  { lemma: 'lit', frequency: 85, difficulty: 15, tags: ['mobilier', 'quotidien'] },
  { lemma: 'porte', frequency: 85, difficulty: 20, tags: ['architecture', 'quotidien'] },
  { lemma: 'fenêtre', frequency: 75, difficulty: 30, tags: ['architecture', 'quotidien'] },
  { lemma: 'mur', frequency: 85, disability: 20, tags: ['architecture', 'quotidien'] },
  { lemma: 'toit', frequency: 80, difficulty: 25, tags: ['architecture', 'quotidien'] },
  { lemma: 'route', frequency: 80, difficulty: 25, tags: ['transport', 'quotidien'] },
  { lemma: 'voiture', frequency: 85, difficulty: 25, tags: ['transport', 'quotidien'] },
  { lemma: 'train', frequency: 80, difficulty: 25, tags: ['transport', 'quotidien'] },
  { lemma: 'avion', frequency: 75, difficulty: 30, tags: ['transport', 'quotidien'] },
  { lemma: 'bateau', frequency: 75, difficulty: 25, tags: ['transport', 'quotidien'] },
  { lemma: 'vélo', frequency: 80, difficulty: 25, tags: ['transport', 'sport'] },
  { lemma: 'livre', frequency: 85, difficulty: 20, tags: ['culture', 'quotidien'] },
  { lemma: 'musique', frequency: 80, difficulty: 30, tags: ['culture', 'quotidien'] },
  { lemma: 'film', frequency: 80, difficulty: 25, tags: ['culture', 'quotidien'] },
  { lemma: 'art', frequency: 80, difficulty: 25, tags: ['culture', 'quotidien'] },
  { lemma: 'sport', frequency: 80, difficulty: 25, tags: ['sport', 'quotidien'] },
  { lemma: 'foot', frequency: 80, difficulty: 20, tags: ['sport', 'quotidien'] },
  { lemma: 'tennis', frequency: 70, difficulty: 30, tags: ['sport', 'quotidien'] },
  { lemma: 'jeu', frequency: 85, difficulty: 20, tags: ['gaming', 'quotidien'] },
  { lemma: 'jouer', frequency: 80, difficulty: 25, tags: ['gaming', 'quotidien'] },
  { lemma: 'gagner', frequency: 75, difficulty: 30, tags: ['gaming', 'quotidien'] },
  { lemma: 'perdre', frequency: 75, difficulty: 30, tags: ['gaming', 'quotidien'] },
  { lemma: 'score', frequency: 70, difficulty: 30, tags: ['gaming', 'sport'] },
  { lemma: 'niveau', frequency: 75, difficulty: 30, tags: ['gaming', 'quotidien'] },
  { lemma: 'temps', frequency: 90, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'jour', frequency: 95, difficulty: 15, tags: ['quotidien'] },
  { lemma: 'nuit', frequency: 90, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'matin', frequency: 85, difficulty: 25, tags: ['quotidien'] },
  { lemma: 'soir', frequency: 85, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'année', frequency: 90, difficulty: 25, tags: ['quotidien'] },
  { lemma: 'mois', frequency: 85, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'semaine', frequency: 80, difficulty: 30, tags: ['quotidien'] },
  { lemma: 'heure', frequency: 90, difficulty: 25, tags: ['quotidien'] },
  { lemma: 'minute', frequency: 80, difficulty: 30, tags: ['quotidien'] },
  { lemma: 'vie', frequency: 95, difficulty: 15, tags: ['quotidien'] },
  { lemma: 'mort', frequency: 85, difficulty: 20, tags: ['quotidien'] },
  { lemma: 'travail', frequency: 85, difficulty: 30, tags: ['quotidien'] },
  { lemma: 'école', frequency: 85, difficulty: 25, tags: ['éducation', 'quotidien'] },
  { lemma: 'classe', frequency: 80, difficulty: 25, tags: ['éducation', 'quotidien'] },
  { lemma: 'élève', frequency: 75, difficulty: 30, tags: ['éducation', 'quotidien'] },
  { lemma: 'prof', frequency: 75, difficulty: 25, tags: ['éducation', 'quotidien'] },
  { lemma: 'leçon', frequency: 70, difficulty: 30, tags: ['éducation', 'quotidien'] },
  { lemma: 'examen', frequency: 70, difficulty: 35, tags: ['éducation', 'quotidien'] },
  { lemma: 'note', frequency: 80, difficulty: 25, tags: ['éducation', 'quotidien'] },
  { lemma: 'lettre', frequency: 80, difficulty: 25, tags: ['quotidien'] },
  { lemma: 'mot', frequency: 90, difficulty: 15, tags: ['quotidien'] },
  { lemma: 'phrase', frequency: 75, difficulty: 30, tags: ['quotidien'] },
  { lemma: 'texte', frequency: 75, difficulty: 25, tags: ['quotidien'] },
  { lemma: 'langue', frequency: 75, difficulty: 30, tags: ['quotidien'] },
  { lemma: 'français', frequency: 80, difficulty: 35, tags: ['langue', 'quotidien'] },
  // Mots gaming/tech
  { lemma: 'écran', frequency: 75, difficulty: 30, tags: ['gaming', 'tech'] },
  { lemma: 'souris', frequency: 75, difficulty: 30, tags: ['gaming', 'tech', 'animaux'] },
  { lemma: 'clavier', frequency: 70, difficulty: 35, tags: ['gaming', 'tech'] },
  { lemma: 'manette', frequency: 65, difficulty: 40, tags: ['gaming'] },
  { lemma: 'console', frequency: 70, difficulty: 35, tags: ['gaming', 'tech'] },
  { lemma: 'partie', frequency: 80, difficulty: 25, tags: ['gaming', 'quotidien'] },
  { lemma: 'boss', frequency: 65, difficulty: 35, tags: ['gaming'] },
  { lemma: 'quête', frequency: 60, difficulty: 40, tags: ['gaming'] },
  { lemma: 'héros', frequency: 70, difficulty: 35, tags: ['gaming', 'histoire'] },
  { lemma: 'arme', frequency: 75, difficulty: 30, tags: ['gaming', 'histoire'] },
  { lemma: 'épée', frequency: 70, difficulty: 35, tags: ['gaming', 'histoire'] },
  { lemma: 'magie', frequency: 70, difficulty: 30, tags: ['gaming', 'fantaisie'] },
  { lemma: 'sort', frequency: 70, difficulty: 25, tags: ['gaming', 'fantaisie'] },
  { lemma: 'dragon', frequency: 65, difficulty: 35, tags: ['gaming', 'fantaisie', 'animaux'] },
  { lemma: 'monstre', frequency: 70, difficulty: 35, tags: ['gaming', 'fantaisie'] },
];

/**
 * Parse le fichier CSV
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^,]+)/g) || [];
    const obj = {};
    
    headers.forEach((header, i) => {
      let value = (values[i] || '').trim().replace(/^"|"$/g, '');
      
      if (header === 'frequency' || header === 'difficulty') {
        value = parseInt(value, 10) || 50;
      } else if (header === 'tags') {
        value = value ? value.split(',').map(t => t.trim()) : [];
      }
      
      obj[header] = value;
    });
    
    return obj;
  });
}

/**
 * Parse le fichier JSON
 */
function parseJSON(content) {
  return JSON.parse(content);
}

/**
 * Upsert un lot de mots dans la base
 * Optimisé pour gérer des centaines de milliers de mots
 */
async function upsertWords(words) {
  console.log(`📝 Upsert de ${words.length} mots...`);
  
  const startTime = Date.now();
  
  // Préparer les records en batch pour éviter de tout charger en mémoire
  const batchSize = 500; // Plus gros batch pour de meilleures performances
  let inserted = 0;
  let errors = 0;
  let processed = 0;
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batchWords = words.slice(i, i + batchSize);
    
    const records = batchWords.map(w => ({
      lemma: w.lemma,
      normalized: textNormalization.normalizeWord(w.lemma),
      length: textNormalization.normalizeWord(w.lemma).length,
      frequency: w.frequency || 50,
      difficulty_score: w.difficulty || textNormalization.estimateWordDifficulty(w.lemma, w.frequency),
      theme_tags: w.tags || [],
      source: w.source || 'import'
    }));
    
    const { data, error } = await supabase
      .from('zwords_words')
      .upsert(records, { 
        onConflict: 'lemma',
        ignoreDuplicates: false 
      })
      .select('id');
    
    if (error) {
      console.error(`❌ Erreur batch ${i}-${i + batchSize}:`, error.message);
      errors++;
    } else {
      inserted += data?.length || 0;
    }
    
    processed += batchWords.length;
    
    // Afficher la progression tous les 5000 mots
    if (processed % 5000 === 0 || processed === words.length) {
      const percent = Math.round((processed / words.length) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(processed / (elapsed || 1));
      console.log(`   📊 ${processed}/${words.length} (${percent}%) - ${rate} mots/sec`);
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ ${inserted} mots insérés/mis à jour en ${totalTime}s`);
  if (errors > 0) console.log(`⚠️ ${errors} batches en erreur`);
  
  return inserted;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  let words = [];
  
  // Mode démo
  if (args.includes('--demo')) {
    console.log('🎮 Mode démonstration: chargement de mots exemples...');
    words = DEMO_WORDS;
  }
  // Mode fichier
  else {
    const fileArg = args.find(a => a.startsWith('--file='));
    if (!fileArg) {
      console.log('Usage: node ingestWords.js --file=path/to/words.csv');
      console.log('       node ingestWords.js --demo');
      process.exit(1);
    }
    
    const filePath = fileArg.split('=')[1];
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Fichier introuvable: ${fullPath}`);
      process.exit(1);
    }
    
    console.log(`📂 Lecture du fichier: ${fullPath}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    if (filePath.endsWith('.json')) {
      words = parseJSON(content);
    } else {
      words = parseCSV(content);
    }
  }
  
  console.log(`📊 ${words.length} mots à traiter`);
  
  // Filtrer les mots invalides
  words = words.filter(w => {
    if (!w.lemma) return false;
    const normalized = textNormalization.normalizeWord(w.lemma);
    if (normalized.length < 2 || normalized.length > 15) {
      console.log(`⚠️ Mot ignoré (longueur): ${w.lemma}`);
      return false;
    }
    return true;
  });
  
  console.log(`📊 ${words.length} mots valides`);
  
  // Upsert
  await upsertWords(words);
  
  console.log('🎉 Import terminé!');
}

main().catch(console.error);
