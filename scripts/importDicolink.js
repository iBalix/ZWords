/**
 * ZWords - Import de définitions depuis Dicolink API
 * 
 * Dicolink est une API de dictionnaire français gratuite
 * https://dicolink.com/
 * 
 * Usage:
 *   node scripts/importDicolink.js
 *   node scripts/importDicolink.js --limit=1000
 *   node scripts/importDicolink.js --api-key=YOUR_KEY
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

// API Dicolink (gratuite avec limite)
const DICOLINK_API = 'https://api.dicolink.com/v1/mot';

/**
 * Récupère la définition d'un mot depuis Dicolink
 */
async function fetchDefinition(word, apiKey) {
  return new Promise((resolve) => {
    const url = `${DICOLINK_API}/${encodeURIComponent(word)}/definitions?limite=3&api_key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          
          const definitions = JSON.parse(data);
          
          if (!Array.isArray(definitions) || definitions.length === 0) {
            resolve(null);
            return;
          }
          
          // Prendre la première définition valide
          for (const def of definitions) {
            const text = def.definition;
            if (text && text.length >= 5 && text.length <= 150) {
              // Vérifier que la définition ne contient pas le mot
              if (!textNormalization.clueContainsWord(text, word)) {
                resolve({
                  text: text,
                  nature: def.nature || 'unknown',
                  source: 'dicolink'
                });
                return;
              }
            }
          }
          
          resolve(null);
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
  
  const { data: words, error } = await supabase
    .from('zwords_words')
    .select(`
      id,
      lemma,
      normalized,
      frequency,
      zwords_clues(id)
    `)
    .order('frequency', { ascending: false })
    .limit(limit * 2);
  
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
 * Importe les définitions depuis Dicolink
 */
async function importDefinitions(words, apiKey) {
  console.log(`💬 Récupération des définitions depuis Dicolink...`);
  console.log(`   ⏱️  Temps estimé: ~${Math.round(words.length / 60)} minutes`);
  
  const startTime = Date.now();
  let found = 0;
  let notFound = 0;
  let inserted = 0;
  let rateLimited = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    const definition = await fetchDefinition(word.lemma, apiKey);
    
    if (definition) {
      // Nettoyer et insérer
      const clueText = textNormalization.cleanClue(definition.text);
      const clueShort = textNormalization.shortenClue(definition.text);
      const quality = textNormalization.calculateClueQuality(definition.text, word.lemma);
      
      const { error } = await supabase
        .from('zwords_clues')
        .insert({
          word_id: word.id,
          clue_text: clueText,
          clue_short: clueShort,
          quality_score: quality,
          source: 'dicolink',
          difficulty_level: 'medium'
        });
      
      if (!error) {
        found++;
        inserted++;
      }
    } else {
      notFound++;
    }
    
    // Progression
    const processed = i + 1;
    if (processed % 50 === 0 || processed === words.length) {
      const percent = Math.round((processed / words.length) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(processed / (elapsed || 1) * 60);
      console.log(`   📊 ${processed}/${words.length} (${percent}%) - ${found} trouvées - ${rate}/min`);
    }
    
    // Pause pour respecter les limites de l'API (1 req/sec environ)
    await sleep(1000);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('');
  console.log(`✅ Import terminé en ${totalTime} minutes`);
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
  const apiKeyArg = args.find(a => a.startsWith('--api-key='));
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
  const apiKey = apiKeyArg ? apiKeyArg.split('=')[1] : process.env.DICOLINK_API_KEY;
  
  if (!apiKey) {
    console.log('❌ Clé API Dicolink requise !');
    console.log('');
    console.log('   1. Va sur https://dicolink.com/ et crée un compte gratuit');
    console.log('   2. Récupère ta clé API');
    console.log('   3. Lance: node scripts/importDicolink.js --api-key=TA_CLE');
    console.log('   ou ajoute DICOLINK_API_KEY=ta_cle dans apps/api/.env');
    console.log('');
    process.exit(1);
  }
  
  console.log('📚 Import de définitions depuis Dicolink (dictionnaire français)');
  console.log(`   Options: limit=${limit}`);
  console.log('');
  
  try {
    // 1. Récupérer les mots sans définition
    const words = await getWordsWithoutDefinitions(limit);
    
    if (words.length === 0) {
      console.log('✅ Tous les mots ont déjà des définitions !');
      return;
    }
    
    // 2. Importer les définitions
    await importDefinitions(words, apiKey);
    
    console.log('');
    console.log('🎉 Import terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
