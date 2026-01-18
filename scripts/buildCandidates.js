/**
 * ZWords - Script de construction des candidats de mots
 * 
 * Construit des ensembles de candidats filtrés par difficulté/thème/taille
 * pour accélérer la génération de grilles.
 * 
 * Usage:
 *   node scripts/buildCandidates.js
 *   node scripts/buildCandidates.js --difficulty=easy
 *   node scripts/buildCandidates.js --theme=gaming
 *   node scripts/buildCandidates.js --stats
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');

// Utils
const textNormalization = require('./lib/textNormalization.cjs');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Récupère les statistiques de la banque de mots
 */
async function getStats() {
  console.log('📊 Statistiques de la banque de mots:\n');
  
  // Nombre total de mots
  const { count: wordCount } = await supabase
    .from('zwords_words')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📝 Total mots: ${wordCount}`);
  
  // Nombre total de définitions
  const { count: clueCount } = await supabase
    .from('zwords_clues')
    .select('*', { count: 'exact', head: true });
  
  console.log(`💬 Total définitions: ${clueCount}`);
  
  // Distribution par longueur
  console.log('\n📏 Distribution par longueur:');
  for (let len = 2; len <= 12; len++) {
    const { count } = await supabase
      .from('zwords_words')
      .select('*', { count: 'exact', head: true })
      .eq('length', len);
    
    if (count > 0) {
      console.log(`   ${len} lettres: ${count} mots`);
    }
  }
  
  // Distribution par difficulté
  console.log('\n🎯 Distribution par difficulté:');
  
  const { count: easyCount } = await supabase
    .from('zwords_words')
    .select('*', { count: 'exact', head: true })
    .lte('difficulty_score', 40);
  console.log(`   Easy (<=40): ${easyCount}`);
  
  const { count: mediumCount } = await supabase
    .from('zwords_words')
    .select('*', { count: 'exact', head: true })
    .gte('difficulty_score', 30)
    .lte('difficulty_score', 70);
  console.log(`   Medium (30-70): ${mediumCount}`);
  
  const { count: hardCount } = await supabase
    .from('zwords_words')
    .select('*', { count: 'exact', head: true })
    .gte('difficulty_score', 50);
  console.log(`   Hard (>=50): ${hardCount}`);
  
  // Tags les plus fréquents
  console.log('\n🏷️ Tags les plus utilisés:');
  const { data: words } = await supabase
    .from('zwords_words')
    .select('theme_tags');
  
  const tagCounts = {};
  for (const word of words || []) {
    for (const tag of word.theme_tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  for (const [tag, count] of sortedTags) {
    console.log(`   ${tag}: ${count}`);
  }
  
  // Qualité des définitions
  console.log('\n⭐ Qualité des définitions:');
  
  const { count: highQuality } = await supabase
    .from('zwords_clues')
    .select('*', { count: 'exact', head: true })
    .gte('quality_score', 70);
  console.log(`   Haute qualité (>=70): ${highQuality}`);
  
  const { count: lowQuality } = await supabase
    .from('zwords_clues')
    .select('*', { count: 'exact', head: true })
    .lte('quality_score', 30);
  console.log(`   Basse qualité (<=30): ${lowQuality}`);
}

/**
 * Construit un ensemble de candidats filtrés
 */
async function buildCandidateSet(options = {}) {
  const { difficulty = 'medium', theme = 'general', minLength = 3, maxLength = 10 } = options;
  
  console.log(`\n🔧 Construction candidats: difficulty=${difficulty}, theme=${theme}, length=${minLength}-${maxLength}`);
  
  // Construire la requête
  let query = supabase
    .from('zwords_words')
    .select(`
      id,
      lemma,
      normalized,
      length,
      frequency,
      difficulty_score,
      theme_tags,
      zwords_clues (
        id,
        clue_text,
        clue_short,
        quality_score,
        difficulty_level
      )
    `)
    .gte('length', minLength)
    .lte('length', maxLength)
    .order('frequency', { ascending: false });
  
  // Filtre par difficulté
  if (difficulty === 'easy') {
    query = query.lte('difficulty_score', 45);
  } else if (difficulty === 'hard') {
    query = query.gte('difficulty_score', 55);
  }
  // medium: pas de filtre supplémentaire
  
  const { data: words, error } = await query;
  
  if (error) {
    console.error('❌ Erreur:', error.message);
    return [];
  }
  
  // Filtrer par thème si nécessaire
  let filteredWords = words;
  if (theme !== 'general') {
    filteredWords = words.filter(w => 
      w.theme_tags && w.theme_tags.includes(theme)
    );
  }
  
  // Filtrer les mots sans définition
  filteredWords = filteredWords.filter(w => 
    w.zwords_clues && w.zwords_clues.length > 0
  );
  
  console.log(`✅ ${filteredWords.length} candidats trouvés`);
  
  // Grouper par longueur pour debug
  const byLength = {};
  for (const word of filteredWords) {
    const len = word.length;
    byLength[len] = (byLength[len] || 0) + 1;
  }
  
  console.log('   Par longueur:', byLength);
  
  return filteredWords;
}

/**
 * Vérifie la couverture pour différentes configurations
 */
async function checkCoverage() {
  console.log('\n🔍 Vérification de la couverture...\n');
  
  const difficulties = ['easy', 'medium', 'hard'];
  const themes = ['general', 'gaming', 'histoire', 'animaux', 'sport'];
  
  for (const difficulty of difficulties) {
    console.log(`\n=== Difficulté: ${difficulty.toUpperCase()} ===`);
    
    for (const theme of themes) {
      const candidates = await buildCandidateSet({
        difficulty,
        theme,
        minLength: 3,
        maxLength: 10
      });
      
      // Vérifier si on a assez de mots de chaque longueur
      const byLength = {};
      for (const word of candidates) {
        const len = word.length;
        byLength[len] = (byLength[len] || 0) + 1;
      }
      
      const hasEnough = Object.values(byLength).some(count => count >= 5);
      const status = hasEnough ? '✅' : '⚠️';
      
      console.log(`${status} ${theme}: ${candidates.length} mots`);
    }
  }
}

/**
 * Exporte les candidats vers un fichier JSON pour cache local
 */
async function exportCandidates(outputPath) {
  console.log(`\n📤 Export des candidats vers ${outputPath}...`);
  
  const { data: words, error } = await supabase
    .from('zwords_words')
    .select(`
      id,
      lemma,
      normalized,
      length,
      frequency,
      difficulty_score,
      theme_tags,
      zwords_clues (
        id,
        clue_text,
        clue_short,
        quality_score
      )
    `)
    .order('frequency', { ascending: false });
  
  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }
  
  // Organiser par longueur
  const organized = {};
  for (const word of words) {
    if (!word.zwords_clues || word.zwords_clues.length === 0) continue;
    
    const len = word.length;
    if (!organized[len]) organized[len] = [];
    
    organized[len].push({
      word: word.normalized,
      lemma: word.lemma,
      frequency: word.frequency,
      difficulty: word.difficulty_score,
      tags: word.theme_tags,
      clues: word.zwords_clues.map(c => ({
        text: c.clue_text,
        short: c.clue_short,
        quality: c.quality_score
      }))
    });
  }
  
  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(organized, null, 2));
  
  console.log(`✅ Export terminé: ${words.length} mots`);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Mode stats
  if (args.includes('--stats')) {
    await getStats();
    return;
  }
  
  // Mode coverage
  if (args.includes('--coverage')) {
    await checkCoverage();
    return;
  }
  
  // Mode export
  const exportArg = args.find(a => a.startsWith('--export='));
  if (exportArg) {
    const outputPath = exportArg.split('=')[1];
    await exportCandidates(outputPath);
    return;
  }
  
  // Mode build
  const difficultyArg = args.find(a => a.startsWith('--difficulty='));
  const themeArg = args.find(a => a.startsWith('--theme='));
  
  const options = {
    difficulty: difficultyArg ? difficultyArg.split('=')[1] : 'medium',
    theme: themeArg ? themeArg.split('=')[1] : 'general'
  };
  
  // Afficher stats d'abord
  await getStats();
  
  // Construire les candidats
  await buildCandidateSet(options);
  
  console.log('\n🎉 Terminé!');
}

main().catch(console.error);
