/**
 * ZWords - Import du dictionnaire français Kartmaan
 * 
 * Source: https://github.com/Kartmaan/french-language-tools
 * Dataset: https://www.kaggle.com/datasets/kartmaan/dictionnaire-francais
 * 
 * Le fichier CSV contient +900 000 mots français avec leurs définitions.
 * 
 * Usage:
 *   1. Télécharge le CSV depuis Kaggle ou GitHub
 *   2. Place-le dans data/dictionnaire_francais.csv
 *   3. Lance: node scripts/importFrenchDictionary.js
 * 
 * Options:
 *   --file=chemin/vers/fichier.csv
 *   --limit=50000  (limiter le nombre de mots)
 *   --min-length=2 (longueur minimum)
 *   --max-length=12 (longueur maximum)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Utils
const textNormalization = require('./lib/textNormalization.cjs');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Chemin par défaut du fichier
const DEFAULT_FILE = path.join(__dirname, '../data/dictionnaire_francais.csv');

/**
 * Parse une ligne CSV (gère les guillemets et virgules dans les champs)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Extrait la première définition valide d'une chaîne de définitions
 */
function extractFirstDefinition(definitionsStr, word) {
  if (!definitionsStr) return null;
  
  try {
    // Le format est une liste Python: ["def1", "def2", ...]
    // On va parser ça simplement
    let cleaned = definitionsStr
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .trim();
    
    if (!cleaned) return null;
    
    // Extraire les définitions entre guillemets
    const matches = cleaned.match(/'([^']+)'|"([^"]+)"/g);
    
    if (!matches || matches.length === 0) {
      // Essayer sans guillemets
      if (cleaned.length > 5 && cleaned.length < 150) {
        return cleaned;
      }
      return null;
    }
    
    // Chercher la première définition valide
    for (const match of matches) {
      let def = match.replace(/^['"]|['"]$/g, '').trim();
      
      // Ignorer les définitions trop courtes ou trop longues
      if (def.length < 5 || def.length > 200) continue;
      
      // Ignorer les définitions de conjugaison/grammaire
      if (/^(Du verbe|Première personne|Deuxième personne|Troisième personne|Participe|Pluriel de|Féminin de|Masculin de)/i.test(def)) {
        continue;
      }
      
      // Ignorer si contient le mot
      if (textNormalization.clueContainsWord(def, word)) {
        continue;
      }
      
      return def;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Lit et parse le fichier CSV en streaming
 */
async function* readCSVStream(filePath, options = {}) {
  const { minLength = 2, maxLength = 12, limit = Infinity } = options;
  
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let lineNumber = 0;
  let yielded = 0;
  let headers = null;
  
  for await (const line of rl) {
    lineNumber++;
    
    // Première ligne = headers
    if (lineNumber === 1) {
      headers = parseCSVLine(line);
      console.log(`   Headers: ${headers.join(', ')}`);
      continue;
    }
    
    if (yielded >= limit) break;
    
    const cols = parseCSVLine(line);
    if (cols.length < 2) continue;
    
    // Trouver les colonnes (le CSV a "Mot" et "Définitions")
    const motIndex = headers.findIndex(h => h.toLowerCase().includes('mot'));
    const defIndex = headers.findIndex(h => h.toLowerCase().includes('finition'));
    
    if (motIndex === -1 || defIndex === -1) {
      console.error('❌ Colonnes non trouvées. Headers:', headers);
      break;
    }
    
    const mot = cols[motIndex];
    const definitions = cols[defIndex];
    
    if (!mot) continue;
    
    // Normaliser le mot
    const normalized = textNormalization.normalizeWord(mot);
    
    // Filtrer par longueur
    if (normalized.length < minLength || normalized.length > maxLength) continue;
    
    // Vérifier que le mot ne contient que des lettres
    if (!/^[A-Z]+$/.test(normalized)) continue;
    
    // Ignorer les mots composés (avec tiret ou espace)
    if (mot.includes('-') || mot.includes(' ') || mot.includes("'")) continue;
    
    // Extraire la première définition valide
    const definition = extractFirstDefinition(definitions, mot);
    
    yielded++;
    
    yield {
      lemma: mot.toLowerCase(),
      normalized,
      definition,
      lineNumber
    };
    
    // Progression
    if (yielded % 10000 === 0) {
      console.log(`   📊 ${yielded} mots lus (ligne ${lineNumber})...`);
    }
  }
}

/**
 * Import les mots et définitions dans Supabase
 */
async function importToSupabase(filePath, options = {}) {
  const { limit = 50000 } = options;
  
  console.log(`📖 Lecture de ${filePath}...`);
  
  const startTime = Date.now();
  const words = [];
  const definitions = [];
  
  // Lire le fichier
  for await (const entry of readCSVStream(filePath, { ...options, limit })) {
    words.push({
      lemma: entry.lemma,
      normalized: entry.normalized,
      length: entry.normalized.length,
      frequency: 50, // Par défaut
      difficulty_score: textNormalization.estimateWordDifficulty(entry.lemma, 50),
      theme_tags: [],
      source: 'kartmaan-dict'
    });
    
    if (entry.definition) {
      definitions.push({
        lemma: entry.lemma,
        clue_text: textNormalization.cleanClue(entry.definition),
        clue_short: textNormalization.shortenClue(entry.definition),
        quality_score: textNormalization.calculateClueQuality(entry.definition, entry.lemma)
      });
    }
  }
  
  console.log(`✅ ${words.length} mots lus, ${definitions.length} avec définition`);
  
  // Upsert les mots
  console.log(`📝 Import des mots dans Supabase...`);
  
  const batchSize = 500;
  let insertedWords = 0;
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('zwords_words')
      .upsert(batch, { onConflict: 'lemma', ignoreDuplicates: false })
      .select('id, lemma');
    
    if (error) {
      console.error(`❌ Erreur batch mots:`, error.message);
    } else {
      insertedWords += data?.length || 0;
      
      // Stocker les IDs pour les définitions
      for (const word of data || []) {
        const defEntry = definitions.find(d => d.lemma === word.lemma);
        if (defEntry) {
          defEntry.word_id = word.id;
        }
      }
    }
    
    const processed = Math.min(i + batchSize, words.length);
    if (processed % 5000 === 0 || processed === words.length) {
      const percent = Math.round((processed / words.length) * 100);
      console.log(`   📊 Mots: ${processed}/${words.length} (${percent}%)`);
    }
  }
  
  console.log(`✅ ${insertedWords} mots importés`);
  
  // Upsert les définitions
  console.log(`📝 Import des définitions...`);
  
  const validDefs = definitions.filter(d => d.word_id);
  let insertedDefs = 0;
  
  for (let i = 0; i < validDefs.length; i += batchSize) {
    const batch = validDefs.slice(i, i + batchSize).map(d => ({
      word_id: d.word_id,
      clue_text: d.clue_text,
      clue_short: d.clue_short,
      quality_score: d.quality_score,
      source: 'kartmaan-dict',
      difficulty_level: 'medium'
    }));
    
    const { data, error } = await supabase
      .from('zwords_clues')
      .insert(batch)
      .select('id');
    
    if (error) {
      // Ignorer les doublons
      if (error.code !== '23505') {
        console.error(`❌ Erreur batch définitions:`, error.message);
      }
    } else {
      insertedDefs += data?.length || 0;
    }
    
    const processed = Math.min(i + batchSize, validDefs.length);
    if (processed % 5000 === 0 || processed === validDefs.length) {
      const percent = Math.round((processed / validDefs.length) * 100);
      console.log(`   📊 Définitions: ${processed}/${validDefs.length} (${percent}%)`);
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('');
  console.log(`🎉 Import terminé en ${totalTime}s !`);
  console.log(`   📝 Mots importés: ${insertedWords}`);
  console.log(`   💬 Définitions importées: ${insertedDefs}`);
  
  return { words: insertedWords, definitions: insertedDefs };
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  const fileArg = args.find(a => a.startsWith('--file='));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const minLengthArg = args.find(a => a.startsWith('--min-length='));
  const maxLengthArg = args.find(a => a.startsWith('--max-length='));
  
  const filePath = fileArg ? fileArg.split('=')[1] : DEFAULT_FILE;
  const options = {
    limit: limitArg ? parseInt(limitArg.split('=')[1]) : 50000,
    minLength: minLengthArg ? parseInt(minLengthArg.split('=')[1]) : 2,
    maxLength: maxLengthArg ? parseInt(maxLengthArg.split('=')[1]) : 12
  };
  
  console.log('📚 Import du dictionnaire français Kartmaan');
  console.log('   Source: https://github.com/Kartmaan/french-language-tools');
  console.log(`   Fichier: ${filePath}`);
  console.log(`   Options: limit=${options.limit}, longueur=${options.minLength}-${options.maxLength}`);
  console.log('');
  
  // Vérifier que le fichier existe
  if (!fs.existsSync(filePath)) {
    console.log('❌ Fichier non trouvé !');
    console.log('');
    console.log('📥 Instructions pour télécharger le dictionnaire :');
    console.log('');
    console.log('   Option 1 - Kaggle (recommandé) :');
    console.log('   1. Va sur https://www.kaggle.com/datasets/kartmaan/dictionnaire-francais');
    console.log('   2. Télécharge le fichier CSV');
    console.log('   3. Place-le dans: C:\\_DEV\\ZWords\\data\\dictionnaire_francais.csv');
    console.log('');
    console.log('   Option 2 - GitHub :');
    console.log('   1. Clone https://github.com/Kartmaan/french-language-tools');
    console.log('   2. Le fichier est dans le dossier "files"');
    console.log('');
    process.exit(1);
  }
  
  await importToSupabase(filePath, options);
}

main().catch(console.error);
