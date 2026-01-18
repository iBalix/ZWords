/**
 * ZWords - Correction des définitions
 * 
 * Ce script relie correctement les définitions aux mots existants.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const textNormalization = require('./lib/textNormalization.cjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const CSV_FILE = path.join(__dirname, '../data/dico.csv');

/**
 * Parse une ligne CSV
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
 * Extrait les définitions valides
 */
function extractDefinitions(definitionsStr, word) {
  if (!definitionsStr) return [];
  
  try {
    let cleaned = definitionsStr.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!cleaned) return [];
    
    const matches = cleaned.match(/'([^']+)'|"([^"]+)"/g);
    if (!matches) return [];
    
    const validDefs = [];
    
    for (const match of matches) {
      let def = match.replace(/^['"]|['"]$/g, '').trim();
      
      // Filtres
      if (def.length < 5 || def.length > 150) continue;
      if (/^(Du verbe|Première personne|Deuxième personne|Troisième personne|Participe|Pluriel de|Féminin de|Masculin de)/i.test(def)) continue;
      if (textNormalization.clueContainsWord(def, word)) continue;
      
      // Nettoyer
      def = textNormalization.cleanClue(def);
      if (def.length < 5) continue;
      
      validDefs.push(def);
      
      // Max 3 définitions par mot
      if (validDefs.length >= 3) break;
    }
    
    return validDefs;
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log('🔧 Correction des définitions');
  console.log('');
  
  // 1. Charger tous les mots existants
  console.log('📥 Chargement des mots existants...');
  
  const wordMap = new Map(); // lemma -> id
  let offset = 0;
  const pageSize = 5000;
  
  while (true) {
    const { data, error } = await supabase
      .from('zwords_words')
      .select('id, lemma')
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('❌ Erreur:', error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    for (const word of data) {
      wordMap.set(word.lemma, word.id);
    }
    
    offset += pageSize;
    console.log(`   ${wordMap.size} mots chargés...`);
    
    if (data.length < pageSize) break;
  }
  
  console.log(`✅ ${wordMap.size} mots en base`);
  console.log('');
  
  // 2. Supprimer les anciennes définitions
  console.log('🗑️ Suppression des anciennes définitions...');
  
  const { error: deleteError } = await supabase
    .from('zwords_clues')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('❌ Erreur suppression:', deleteError.message);
  } else {
    console.log('✅ Anciennes définitions supprimées');
  }
  console.log('');
  
  // 3. Lire le CSV et créer les définitions
  console.log('📖 Lecture du CSV et création des définitions...');
  
  const fileStream = fs.createReadStream(CSV_FILE, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let lineNumber = 0;
  const clues = [];
  let matchedWords = 0;
  
  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1) continue; // Skip header
    
    const cols = parseCSVLine(line);
    if (cols.length < 2) continue;
    
    const mot = cols[0];
    const definitions = cols[1];
    
    if (!mot) continue;
    
    // Chercher le mot dans la base
    const lemma = mot.toLowerCase();
    const wordId = wordMap.get(lemma);
    
    if (!wordId) continue;
    
    // Extraire les définitions
    const defs = extractDefinitions(definitions, mot);
    
    if (defs.length === 0) continue;
    
    matchedWords++;
    
    for (const def of defs) {
      clues.push({
        word_id: wordId,
        clue_text: def,
        clue_short: textNormalization.shortenClue(def),
        quality_score: textNormalization.calculateClueQuality(def, mot),
        source: 'dico-csv',
        difficulty_level: 'medium'
      });
    }
    
    // Progression
    if (lineNumber % 50000 === 0) {
      console.log(`   Ligne ${lineNumber}: ${matchedWords} mots avec définitions, ${clues.length} définitions totales`);
    }
  }
  
  console.log(`✅ ${matchedWords} mots matchés, ${clues.length} définitions à insérer`);
  console.log('');
  
  // 4. Insérer les définitions par batch
  console.log('📝 Insertion des définitions...');
  
  const batchSize = 500;
  let inserted = 0;
  
  for (let i = 0; i < clues.length; i += batchSize) {
    const batch = clues.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('zwords_clues')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Erreur batch ${i}:`, error.message);
    } else {
      inserted += data?.length || 0;
    }
    
    const processed = Math.min(i + batchSize, clues.length);
    if (processed % 5000 === 0 || processed === clues.length) {
      console.log(`   ${processed}/${clues.length} définitions insérées`);
    }
  }
  
  console.log('');
  console.log(`🎉 Terminé ! ${inserted} définitions insérées`);
  
  // 5. Stats finales
  console.log('');
  console.log('📊 Statistiques finales:');
  
  const { count: finalWordCount } = await supabase.from('zwords_words').select('*', { count: 'exact', head: true });
  const { count: finalClueCount } = await supabase.from('zwords_clues').select('*', { count: 'exact', head: true });
  
  console.log(`   Mots en base: ${finalWordCount}`);
  console.log(`   Définitions en base: ${finalClueCount}`);
  
  // Mots avec définitions
  const { data: sample } = await supabase
    .from('zwords_words')
    .select('id, lemma, length, zwords_clues(id)')
    .limit(10000);
  
  const wordsWithClues = (sample || []).filter(w => w.zwords_clues && w.zwords_clues.length > 0);
  console.log(`   Mots avec définitions: ${wordsWithClues.length}`);
  
  // Distribution par longueur
  const byLength = {};
  for (const w of wordsWithClues) {
    byLength[w.length] = (byLength[w.length] || 0) + 1;
  }
  console.log('   Distribution:', byLength);
}

main().catch(console.error);
