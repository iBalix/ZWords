/**
 * ZWords - Import automatique depuis Lexique 3
 * 
 * Lexique 3 est une base de données lexicale française contenant ~140 000 mots
 * avec leur fréquence d'usage, catégorie grammaticale, etc.
 * 
 * Source: http://www.lexique.org/
 * 
 * Usage:
 *   node scripts/importLexique3.js
 *   node scripts/importLexique3.js --limit=10000  (limiter le nombre de mots)
 *   node scripts/importLexique3.js --min-freq=5   (fréquence minimum)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Utils
const textNormalization = require('./lib/textNormalization.cjs');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// URL du fichier Lexique 3.83 (format TSV)
const LEXIQUE_URL = 'http://www.lexique.org/databases/Lexique383/Lexique383.tsv';
const LOCAL_CACHE = path.join(__dirname, '../data/Lexique383.tsv');

// Mapping des catégories grammaticales vers des tags
const CATEGORY_TAGS = {
  'NOM': ['nom'],
  'VER': ['verbe'],
  'ADJ': ['adjectif'],
  'ADV': ['adverbe'],
  'PRE': ['preposition'],
  'CON': ['conjonction'],
  'PRO': ['pronom'],
  'ART': ['article'],
  'ONO': ['onomatopee'],
  'AUX': ['verbe', 'auxiliaire']
};

/**
 * Télécharge le fichier Lexique 3
 */
async function downloadLexique() {
  // Créer le dossier data s'il n'existe pas
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Vérifier si le fichier existe déjà
  if (fs.existsSync(LOCAL_CACHE)) {
    const stats = fs.statSync(LOCAL_CACHE);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`📁 Fichier cache trouvé: ${LOCAL_CACHE} (${sizeMB} MB)`);
    return LOCAL_CACHE;
  }
  
  console.log(`📥 Téléchargement de Lexique 3 depuis ${LEXIQUE_URL}...`);
  console.log('   (Cela peut prendre quelques minutes, le fichier fait ~25 MB)');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(LOCAL_CACHE);
    
    const request = http.get(LEXIQUE_URL, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Suivre la redirection
        http.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('✅ Téléchargement terminé');
            resolve(LOCAL_CACHE);
          });
        });
      } else {
        response.pipe(file);
        
        let downloaded = 0;
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const mb = (downloaded / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r   📊 ${mb} MB téléchargés...`);
        });
        
        file.on('finish', () => {
          file.close();
          console.log('\n✅ Téléchargement terminé');
          resolve(LOCAL_CACHE);
        });
      }
    });
    
    request.on('error', (err) => {
      fs.unlink(LOCAL_CACHE, () => {});
      reject(err);
    });
  });
}

/**
 * Parse le fichier Lexique 3 TSV
 */
function parseLexique(filePath, options = {}) {
  const { minFreq = 0.1, limit = Infinity, minLength = 2, maxLength = 12 } = options;
  
  console.log(`📖 Lecture de ${filePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Première ligne = headers
  const headers = lines[0].split('\t');
  
  // Trouver les indices des colonnes importantes
  const colIndex = {
    ortho: headers.indexOf('ortho'),           // Orthographe
    lemme: headers.indexOf('lemme'),           // Lemme (forme de base)
    cgram: headers.indexOf('cgram'),           // Catégorie grammaticale
    freqlivres: headers.indexOf('freqlivres'), // Fréquence dans les livres
    freqfilms2: headers.indexOf('freqfilms2'), // Fréquence dans les films
    nblettres: headers.indexOf('nblettres')    // Nombre de lettres
  };
  
  console.log(`   Colonnes trouvées: ortho=${colIndex.ortho}, lemme=${colIndex.lemme}, cgram=${colIndex.cgram}, freqlivres=${colIndex.freqlivres}`);
  
  const words = new Map(); // lemme -> { frequency, categories, forms }
  
  for (let i = 1; i < lines.length && words.size < limit; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 5) continue;
    
    const ortho = cols[colIndex.ortho]?.trim();
    const lemme = cols[colIndex.lemme]?.trim() || ortho;
    const cgram = cols[colIndex.cgram]?.trim();
    const freqLivres = parseFloat(cols[colIndex.freqlivres]) || 0;
    const freqFilms = parseFloat(cols[colIndex.freqfilms2]) || 0;
    
    // Calculer une fréquence moyenne
    const frequency = (freqLivres + freqFilms) / 2;
    
    // Filtrer par fréquence minimum
    if (frequency < minFreq) continue;
    
    // Normaliser le lemme
    const normalized = textNormalization.normalizeWord(lemme);
    
    // Filtrer par longueur
    if (normalized.length < minLength || normalized.length > maxLength) continue;
    
    // Vérifier que le mot ne contient que des lettres
    if (!/^[A-Z]+$/.test(normalized)) continue;
    
    // Ajouter ou mettre à jour le mot
    if (!words.has(lemme.toLowerCase())) {
      const tags = CATEGORY_TAGS[cgram] || [];
      words.set(lemme.toLowerCase(), {
        lemma: lemme.toLowerCase(),
        frequency: Math.min(100, Math.round(frequency * 2)), // Normaliser 0-100
        difficulty: null, // Sera calculé
        tags,
        cgram
      });
    } else {
      // Mettre à jour la fréquence si plus haute
      const existing = words.get(lemme.toLowerCase());
      if (frequency > existing.frequency / 2) {
        existing.frequency = Math.min(100, Math.round(frequency * 2));
      }
    }
    
    // Progression
    if (i % 50000 === 0) {
      console.log(`   📊 ${i} lignes lues, ${words.size} mots uniques...`);
    }
  }
  
  console.log(`✅ ${words.size} mots extraits de Lexique 3`);
  
  return Array.from(words.values());
}

/**
 * Upsert les mots dans la base
 */
async function upsertWords(words) {
  console.log(`📝 Import de ${words.length} mots dans Supabase...`);
  
  const startTime = Date.now();
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    
    const records = batch.map(w => ({
      lemma: w.lemma,
      normalized: textNormalization.normalizeWord(w.lemma),
      length: textNormalization.normalizeWord(w.lemma).length,
      frequency: w.frequency,
      difficulty_score: w.difficulty || textNormalization.estimateWordDifficulty(w.lemma, w.frequency),
      theme_tags: w.tags,
      source: 'lexique3'
    }));
    
    const { data, error } = await supabase
      .from('zwords_words')
      .upsert(records, { 
        onConflict: 'lemma',
        ignoreDuplicates: false 
      })
      .select('id');
    
    if (error) {
      console.error(`❌ Erreur batch ${i}:`, error.message);
      errors++;
    } else {
      inserted += data?.length || 0;
    }
    
    // Progression
    const processed = Math.min(i + batchSize, words.length);
    if (processed % 5000 === 0 || processed === words.length) {
      const percent = Math.round((processed / words.length) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   📊 ${processed}/${words.length} (${percent}%) - ${elapsed}s`);
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ ${inserted} mots importés en ${totalTime}s`);
  
  return inserted;
}

/**
 * Génère des définitions basiques à partir des catégories
 */
async function generateBasicDefinitions(words) {
  console.log(`💬 Génération de définitions basiques pour ${words.length} mots...`);
  
  // Templates de définitions par catégorie
  const templates = {
    'NOM': [
      (w) => `Nom commun`,
      (w) => `Substantif français`
    ],
    'VER': [
      (w) => `Verbe français`,
      (w) => `Action de ${w.lemma.replace(/er$|ir$|re$/, '')}`
    ],
    'ADJ': [
      (w) => `Adjectif qualificatif`,
      (w) => `Qualité ou caractéristique`
    ],
    'ADV': [
      (w) => `Adverbe de manière`
    ]
  };
  
  const definitions = [];
  
  for (const word of words) {
    const tpls = templates[word.cgram];
    if (!tpls) continue;
    
    // Prendre un template aléatoire
    const template = tpls[Math.floor(Math.random() * tpls.length)];
    
    definitions.push({
      word: word.lemma,
      clue: template(word),
      source: 'auto-generated',
      difficulty: 'medium'
    });
  }
  
  console.log(`✅ ${definitions.length} définitions générées`);
  console.log(`   ⚠️ Note: Ces définitions sont génériques. Pour de vraies définitions,`);
  console.log(`   utilise le script importWiktionary.js ou fournis un fichier CSV.`);
  
  return definitions;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Options
  const limitArg = args.find(a => a.startsWith('--limit='));
  const minFreqArg = args.find(a => a.startsWith('--min-freq='));
  const skipDefinitions = args.includes('--no-definitions');
  
  const options = {
    limit: limitArg ? parseInt(limitArg.split('=')[1]) : 50000, // Par défaut 50k mots
    minFreq: minFreqArg ? parseFloat(minFreqArg.split('=')[1]) : 0.5, // Fréquence min
    minLength: 2,
    maxLength: 12
  };
  
  console.log('🇫🇷 Import Lexique 3 - Base lexicale française');
  console.log(`   Options: limit=${options.limit}, minFreq=${options.minFreq}`);
  console.log('');
  
  try {
    // 1. Télécharger Lexique 3
    const filePath = await downloadLexique();
    
    // 2. Parser le fichier
    const words = parseLexique(filePath, options);
    
    // 3. Importer dans Supabase
    await upsertWords(words);
    
    // 4. Générer des définitions basiques (optionnel)
    if (!skipDefinitions && words.length > 0) {
      console.log('');
      console.log('📌 Les mots sont importés mais sans définitions utiles.');
      console.log('   Pour ajouter de vraies définitions, tu peux :');
      console.log('   1. Exécuter: node scripts/importWiktionary.js');
      console.log('   2. Fournir un fichier CSV avec: node scripts/ingestDefinitions.js --file=definitions.csv');
    }
    
    console.log('');
    console.log('🎉 Import terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
