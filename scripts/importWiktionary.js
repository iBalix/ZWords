/**
 * ZWords - Import de définitions depuis le Wiktionnaire français
 * 
 * Utilise l'API du Wiktionnaire pour récupérer les définitions
 * des mots déjà présents dans la base.
 * 
 * Usage:
 *   node scripts/importWiktionary.js
 *   node scripts/importWiktionary.js --limit=1000
 *   node scripts/importWiktionary.js --batch=50
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Utils
const textNormalization = require('./lib/textNormalization.cjs');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// API Wiktionnaire
const WIKTIONARY_API = 'https://fr.wiktionary.org/w/api.php';

/**
 * Récupère la définition d'un mot depuis le Wiktionnaire
 */
async function fetchDefinition(word) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      action: 'query',
      titles: word,
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      format: 'json',
      redirects: '1'
    });
    
    const url = `${WIKTIONARY_API}?${params}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query?.pages;
          
          if (!pages) {
            resolve(null);
            return;
          }
          
          // Récupérer le premier (et unique) résultat
          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];
          
          if (pageId === '-1' || !page.extract) {
            resolve(null);
            return;
          }
          
          // Extraire la première phrase comme définition
          let extract = page.extract;
          
          // Nettoyer le texte
          extract = extract
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Prendre la première phrase significative
          const sentences = extract.split(/[.!?]+/);
          let definition = null;
          
          for (const sentence of sentences) {
            const clean = sentence.trim();
            if (clean.length >= 10 && clean.length <= 100) {
              // Éviter les définitions qui contiennent le mot
              if (!textNormalization.clueContainsWord(clean, word)) {
                definition = clean;
                break;
              }
            }
          }
          
          resolve(definition);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Pause pour respecter les limites de l'API
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Récupère les mots sans définition depuis la base
 */
async function getWordsWithoutDefinitions(limit = 1000) {
  console.log(`📖 Récupération des mots sans définition (max ${limit})...`);
  
  // Récupérer les mots qui n'ont pas de définition
  const { data: words, error } = await supabase
    .from('zwords_words')
    .select(`
      id,
      lemma,
      normalized,
      zwords_clues(id)
    `)
    .order('frequency', { ascending: false })
    .limit(limit * 2); // Prendre plus pour filtrer ensuite
  
  if (error) {
    console.error('❌ Erreur:', error.message);
    return [];
  }
  
  // Filtrer ceux qui n'ont pas de définition
  const withoutDef = words
    .filter(w => !w.zwords_clues || w.zwords_clues.length === 0)
    .slice(0, limit);
  
  console.log(`✅ ${withoutDef.length} mots trouvés sans définition`);
  return withoutDef;
}

/**
 * Importe les définitions du Wiktionnaire
 */
async function importDefinitions(words, batchSize = 20) {
  console.log(`💬 Récupération des définitions depuis le Wiktionnaire...`);
  console.log(`   ⚠️ Limite de l'API: ~50 requêtes/sec max`);
  
  const startTime = Date.now();
  let found = 0;
  let notFound = 0;
  let inserted = 0;
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    
    // Traiter le batch en parallèle (avec limite)
    const promises = batch.map(async (word) => {
      const definition = await fetchDefinition(word.lemma);
      
      if (definition) {
        // Insérer dans la base
        const clueText = textNormalization.cleanClue(definition);
        const clueShort = textNormalization.shortenClue(definition);
        const quality = textNormalization.calculateClueQuality(definition, word.lemma);
        
        const { error } = await supabase
          .from('zwords_clues')
          .insert({
            word_id: word.id,
            clue_text: clueText,
            clue_short: clueShort,
            quality_score: quality,
            source: 'wiktionary',
            difficulty_level: 'medium'
          });
        
        if (!error) {
          return { success: true };
        }
      }
      return { success: false };
    });
    
    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.success) {
        found++;
        inserted++;
      } else {
        notFound++;
      }
    }
    
    // Progression
    const processed = Math.min(i + batchSize, words.length);
    const percent = Math.round((processed / words.length) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = Math.round(processed / (elapsed || 1));
    
    console.log(`   📊 ${processed}/${words.length} (${percent}%) - ${found} trouvées, ${rate} mots/sec`);
    
    // Pause pour respecter les limites de l'API
    await sleep(500);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log(`✅ Import terminé en ${totalTime}s`);
  console.log(`   📊 Définitions trouvées: ${found}`);
  console.log(`   📊 Mots sans définition: ${notFound}`);
  console.log(`   📊 Définitions insérées: ${inserted}`);
  
  return inserted;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  const limitArg = args.find(a => a.startsWith('--limit='));
  const batchArg = args.find(a => a.startsWith('--batch='));
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 20;
  
  console.log('📚 Import de définitions depuis le Wiktionnaire français');
  console.log(`   Options: limit=${limit}, batch=${batchSize}`);
  console.log('');
  
  try {
    // 1. Récupérer les mots sans définition
    const words = await getWordsWithoutDefinitions(limit);
    
    if (words.length === 0) {
      console.log('✅ Tous les mots ont déjà des définitions !');
      return;
    }
    
    // 2. Importer les définitions
    await importDefinitions(words, batchSize);
    
    console.log('');
    console.log('🎉 Import terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
