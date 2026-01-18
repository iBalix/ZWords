/**
 * ZWords - Script d'import de définitions
 * 
 * Usage:
 *   node scripts/ingestDefinitions.js --file=data/definitions.csv
 *   node scripts/ingestDefinitions.js --file=data/definitions.json
 *   node scripts/ingestDefinitions.js --demo (charge des définitions de démonstration)
 * 
 * Format CSV attendu:
 *   word,clue,source,difficulty
 *   "chat","Félin domestique","dictionnaire","easy"
 *   "château","Demeure royale","dictionnaire","medium"
 * 
 * Format JSON attendu:
 *   [
 *     { "word": "chat", "clue": "Félin domestique", "source": "dictionnaire", "difficulty": "easy" }
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

// Définitions de démonstration
const DEMO_DEFINITIONS = [
  // Animaux
  { word: 'chat', clue: 'Félin domestique', difficulty: 'easy' },
  { word: 'chat', clue: 'Animal qui miaule', difficulty: 'easy' },
  { word: 'chat', clue: 'Compagnon ronronnant', difficulty: 'medium' },
  { word: 'chien', clue: 'Meilleur ami de l\'homme', difficulty: 'easy' },
  { word: 'chien', clue: 'Animal qui aboie', difficulty: 'easy' },
  { word: 'chien', clue: 'Canidé fidèle', difficulty: 'medium' },
  { word: 'souris', clue: 'Petit rongeur', difficulty: 'easy' },
  { word: 'souris', clue: 'Périphérique de l\'ordinateur', difficulty: 'medium' },
  { word: 'dragon', clue: 'Créature crachant du feu', difficulty: 'easy' },
  { word: 'dragon', clue: 'Reptile légendaire ailé', difficulty: 'medium' },
  
  // Nature
  { word: 'maison', clue: 'Lieu d\'habitation', difficulty: 'easy' },
  { word: 'maison', clue: 'Chez soi', difficulty: 'easy' },
  { word: 'soleil', clue: 'Étoile du système solaire', difficulty: 'easy' },
  { word: 'soleil', clue: 'Il brille le jour', difficulty: 'easy' },
  { word: 'lune', clue: 'Satellite de la Terre', difficulty: 'medium' },
  { word: 'lune', clue: 'Elle brille la nuit', difficulty: 'easy' },
  { word: 'arbre', clue: 'Végétal à tronc', difficulty: 'easy' },
  { word: 'arbre', clue: 'Il porte des feuilles', difficulty: 'easy' },
  { word: 'fleur', clue: 'Organe coloré des plantes', difficulty: 'medium' },
  { word: 'fleur', clue: 'Rose ou tulipe', difficulty: 'easy' },
  { word: 'eau', clue: 'Liquide vital', difficulty: 'easy' },
  { word: 'eau', clue: 'H2O', difficulty: 'easy' },
  { word: 'feu', clue: 'Combustion visible', difficulty: 'medium' },
  { word: 'feu', clue: 'Il brûle', difficulty: 'easy' },
  { word: 'terre', clue: 'Notre planète', difficulty: 'easy' },
  { word: 'terre', clue: 'Sol où l\'on marche', difficulty: 'easy' },
  { word: 'ciel', clue: 'Voûte céleste', difficulty: 'medium' },
  { word: 'ciel', clue: 'Au-dessus de nos têtes', difficulty: 'easy' },
  { word: 'mer', clue: 'Étendue d\'eau salée', difficulty: 'easy' },
  { word: 'mer', clue: 'Océan en plus petit', difficulty: 'medium' },
  { word: 'montagne', clue: 'Relief élevé', difficulty: 'easy' },
  { word: 'montagne', clue: 'Sommet enneigé', difficulty: 'medium' },
  { word: 'forêt', clue: 'Ensemble d\'arbres', difficulty: 'easy' },
  { word: 'rivière', clue: 'Cours d\'eau', difficulty: 'easy' },
  
  // Personnes et famille
  { word: 'homme', clue: 'Être humain masculin', difficulty: 'easy' },
  { word: 'femme', clue: 'Être humain féminin', difficulty: 'easy' },
  { word: 'enfant', clue: 'Jeune humain', difficulty: 'easy' },
  { word: 'père', clue: 'Parent masculin', difficulty: 'easy' },
  { word: 'mère', clue: 'Parent féminin', difficulty: 'easy' },
  { word: 'frère', clue: 'Fils du même parent', difficulty: 'easy' },
  { word: 'sœur', clue: 'Fille du même parent', difficulty: 'easy' },
  { word: 'ami', clue: 'Proche affectueux', difficulty: 'easy' },
  { word: 'roi', clue: 'Monarque masculin', difficulty: 'easy' },
  { word: 'reine', clue: 'Monarque féminin', difficulty: 'easy' },
  { word: 'prince', clue: 'Fils du roi', difficulty: 'easy' },
  { word: 'héros', clue: 'Personnage courageux', difficulty: 'easy' },
  
  // Corps
  { word: 'main', clue: 'Extrémité du bras', difficulty: 'easy' },
  { word: 'pied', clue: 'Extrémité de la jambe', difficulty: 'easy' },
  { word: 'tête', clue: 'Partie supérieure du corps', difficulty: 'easy' },
  { word: 'cœur', clue: 'Organe qui bat', difficulty: 'easy' },
  { word: 'cœur', clue: 'Symbole de l\'amour', difficulty: 'easy' },
  { word: 'œil', clue: 'Organe de la vue', difficulty: 'easy' },
  { word: 'oreille', clue: 'Organe de l\'ouïe', difficulty: 'easy' },
  { word: 'bouche', clue: 'Organe de la parole', difficulty: 'easy' },
  { word: 'nez', clue: 'Organe de l\'odorat', difficulty: 'easy' },
  { word: 'langue', clue: 'Organe du goût', difficulty: 'easy' },
  { word: 'langue', clue: 'Moyen de communication', difficulty: 'medium' },
  
  // Nourriture
  { word: 'pain', clue: 'Aliment de base français', difficulty: 'easy' },
  { word: 'vin', clue: 'Boisson alcoolisée de raisin', difficulty: 'easy' },
  { word: 'fromage', clue: 'Produit laitier affiné', difficulty: 'easy' },
  { word: 'viande', clue: 'Chair animale comestible', difficulty: 'easy' },
  { word: 'fruit', clue: 'Produit sucré d\'un arbre', difficulty: 'easy' },
  { word: 'légume', clue: 'Plante potagère', difficulty: 'easy' },
  
  // Mobilier et architecture
  { word: 'table', clue: 'Meuble à plateau', difficulty: 'easy' },
  { word: 'chaise', clue: 'Siège à dossier', difficulty: 'easy' },
  { word: 'lit', clue: 'Meuble pour dormir', difficulty: 'easy' },
  { word: 'porte', clue: 'Ouverture dans un mur', difficulty: 'easy' },
  { word: 'fenêtre', clue: 'Ouverture vitrée', difficulty: 'easy' },
  { word: 'mur', clue: 'Paroi verticale', difficulty: 'easy' },
  { word: 'toit', clue: 'Couverture d\'un bâtiment', difficulty: 'easy' },
  { word: 'château', clue: 'Demeure fortifiée', difficulty: 'easy' },
  { word: 'ville', clue: 'Agglomération urbaine', difficulty: 'easy' },
  { word: 'pays', clue: 'Nation, territoire', difficulty: 'easy' },
  
  // Transport
  { word: 'route', clue: 'Voie de circulation', difficulty: 'easy' },
  { word: 'voiture', clue: 'Véhicule à moteur', difficulty: 'easy' },
  { word: 'train', clue: 'Transport ferroviaire', difficulty: 'easy' },
  { word: 'avion', clue: 'Aéronef motorisé', difficulty: 'easy' },
  { word: 'bateau', clue: 'Embarcation', difficulty: 'easy' },
  { word: 'vélo', clue: 'Deux-roues à pédales', difficulty: 'easy' },
  
  // Culture et éducation
  { word: 'livre', clue: 'Ouvrage imprimé', difficulty: 'easy' },
  { word: 'musique', clue: 'Art des sons', difficulty: 'easy' },
  { word: 'film', clue: 'Œuvre cinématographique', difficulty: 'easy' },
  { word: 'art', clue: 'Expression créative', difficulty: 'medium' },
  { word: 'école', clue: 'Lieu d\'enseignement', difficulty: 'easy' },
  { word: 'classe', clue: 'Salle de cours', difficulty: 'easy' },
  { word: 'élève', clue: 'Apprenant', difficulty: 'easy' },
  { word: 'prof', clue: 'Enseignant', difficulty: 'easy' },
  { word: 'leçon', clue: 'Enseignement', difficulty: 'easy' },
  { word: 'examen', clue: 'Épreuve scolaire', difficulty: 'easy' },
  { word: 'note', clue: 'Évaluation chiffrée', difficulty: 'easy' },
  
  // Sport et jeux
  { word: 'sport', clue: 'Activité physique', difficulty: 'easy' },
  { word: 'foot', clue: 'Sport avec ballon rond', difficulty: 'easy' },
  { word: 'tennis', clue: 'Sport de raquette', difficulty: 'easy' },
  { word: 'jeu', clue: 'Activité ludique', difficulty: 'easy' },
  { word: 'jouer', clue: 'S\'amuser', difficulty: 'easy' },
  { word: 'gagner', clue: 'Remporter la victoire', difficulty: 'easy' },
  { word: 'perdre', clue: 'Ne pas gagner', difficulty: 'easy' },
  { word: 'score', clue: 'Nombre de points', difficulty: 'easy' },
  { word: 'niveau', clue: 'Étage d\'un jeu', difficulty: 'medium' },
  { word: 'partie', clue: 'Session de jeu', difficulty: 'easy' },
  
  // Gaming
  { word: 'écran', clue: 'Surface d\'affichage', difficulty: 'easy' },
  { word: 'clavier', clue: 'Touches pour écrire', difficulty: 'easy' },
  { word: 'manette', clue: 'Contrôleur de jeu', difficulty: 'easy' },
  { word: 'console', clue: 'Plateforme de jeu', difficulty: 'easy' },
  { word: 'boss', clue: 'Ennemi puissant de fin', difficulty: 'medium' },
  { word: 'quête', clue: 'Mission à accomplir', difficulty: 'easy' },
  { word: 'arme', clue: 'Outil de combat', difficulty: 'easy' },
  { word: 'épée', clue: 'Arme blanche longue', difficulty: 'easy' },
  { word: 'magie', clue: 'Pouvoir surnaturel', difficulty: 'easy' },
  { word: 'sort', clue: 'Enchantement magique', difficulty: 'easy' },
  { word: 'monstre', clue: 'Créature effrayante', difficulty: 'easy' },
  
  // Temps
  { word: 'temps', clue: 'Durée qui s\'écoule', difficulty: 'easy' },
  { word: 'jour', clue: 'Période de 24 heures', difficulty: 'easy' },
  { word: 'nuit', clue: 'Période sombre', difficulty: 'easy' },
  { word: 'matin', clue: 'Début du jour', difficulty: 'easy' },
  { word: 'soir', clue: 'Fin du jour', difficulty: 'easy' },
  { word: 'année', clue: 'Période de 12 mois', difficulty: 'easy' },
  { word: 'mois', clue: 'Période de 30 jours', difficulty: 'easy' },
  { word: 'semaine', clue: 'Période de 7 jours', difficulty: 'easy' },
  { word: 'heure', clue: 'Période de 60 minutes', difficulty: 'easy' },
  { word: 'minute', clue: 'Période de 60 secondes', difficulty: 'easy' },
  
  // Concepts
  { word: 'vie', clue: 'Existence', difficulty: 'easy' },
  { word: 'mort', clue: 'Fin de la vie', difficulty: 'easy' },
  { word: 'amour', clue: 'Sentiment fort', difficulty: 'easy' },
  { word: 'joie', clue: 'Bonheur', difficulty: 'easy' },
  { word: 'peur', clue: 'Crainte', difficulty: 'easy' },
  { word: 'paix', clue: 'Absence de guerre', difficulty: 'easy' },
  { word: 'guerre', clue: 'Conflit armé', difficulty: 'easy' },
  { word: 'travail', clue: 'Activité professionnelle', difficulty: 'easy' },
  
  // Langage
  { word: 'lettre', clue: 'Caractère alphabétique', difficulty: 'easy' },
  { word: 'mot', clue: 'Unité de langage', difficulty: 'easy' },
  { word: 'phrase', clue: 'Suite de mots', difficulty: 'easy' },
  { word: 'texte', clue: 'Ensemble de phrases', difficulty: 'easy' },
  { word: 'français', clue: 'Langue de Molière', difficulty: 'easy' },
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
      obj[header] = (values[i] || '').trim().replace(/^"|"$/g, '');
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
 * Charge tous les mots en cache pour éviter les requêtes individuelles
 */
async function loadAllWordIds() {
  console.log('📚 Chargement du cache de mots...');
  
  const cache = {};
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('zwords_words')
      .select('id, normalized')
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('❌ Erreur chargement cache:', error.message);
      break;
    }
    
    for (const word of data || []) {
      cache[word.normalized.toLowerCase()] = word.id;
    }
    
    offset += pageSize;
    hasMore = data?.length === pageSize;
  }
  
  console.log(`✅ ${Object.keys(cache).length} mots en cache`);
  return cache;
}

/**
 * Upsert les définitions
 * Optimisé pour gérer des centaines de milliers de définitions
 */
async function upsertDefinitions(definitions) {
  console.log(`📝 Traitement de ${definitions.length} définitions...`);
  
  const startTime = Date.now();
  
  // Charger tous les mots en cache d'abord
  const wordIdCache = await loadAllWordIds();
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let processed = 0;
  
  // Préparer les records valides
  const validRecords = [];
  
  for (const def of definitions) {
    const normalizedWord = textNormalization.normalizeWord(def.word).toLowerCase();
    const wordId = wordIdCache[normalizedWord];
    
    if (!wordId) {
      skipped++;
      continue;
    }
    
    // Vérifier que la définition ne contient pas le mot
    if (textNormalization.clueContainsWord(def.clue, def.word)) {
      skipped++;
      continue;
    }
    
    // Nettoyer et scorer
    const clueText = textNormalization.cleanClue(def.clue);
    const clueShort = textNormalization.shortenClue(def.clue);
    const qualityScore = textNormalization.calculateClueQuality(def.clue, def.word);
    
    validRecords.push({
      word_id: wordId,
      clue_text: clueText,
      clue_short: clueShort,
      quality_score: qualityScore,
      source: def.source || 'import',
      difficulty_level: def.difficulty || 'medium'
    });
  }
  
  console.log(`📊 ${validRecords.length} définitions valides à insérer`);
  
  // Insérer par batch
  const batchSize = 500;
  
  for (let i = 0; i < validRecords.length; i += batchSize) {
    const batch = validRecords.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('zwords_clues')
      .insert(batch)
      .select('id');
    
    if (error) {
      // Essayer un par un en cas d'erreur de batch (doublons possibles)
      for (const record of batch) {
        const { error: singleError } = await supabase
          .from('zwords_clues')
          .insert(record);
        
        if (!singleError) {
          inserted++;
        } else if (singleError.code !== '23505') {
          errors++;
        }
      }
    } else {
      inserted += data?.length || 0;
    }
    
    processed += batch.length;
    
    // Afficher la progression tous les 5000 définitions
    if (processed % 5000 === 0 || processed === validRecords.length) {
      const percent = Math.round((processed / validRecords.length) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(processed / (elapsed || 1));
      console.log(`   📊 ${processed}/${validRecords.length} (${percent}%) - ${rate} déf/sec`);
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ ${inserted} définitions insérées en ${totalTime}s`);
  console.log(`⏭️ ${skipped} définitions ignorées (mot manquant ou contient le mot)`);
  if (errors > 0) console.log(`❌ ${errors} erreurs`);
  
  return inserted;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  let definitions = [];
  
  // Mode démo
  if (args.includes('--demo')) {
    console.log('🎮 Mode démonstration: chargement de définitions exemples...');
    definitions = DEMO_DEFINITIONS;
  }
  // Mode fichier
  else {
    const fileArg = args.find(a => a.startsWith('--file='));
    if (!fileArg) {
      console.log('Usage: node ingestDefinitions.js --file=path/to/definitions.csv');
      console.log('       node ingestDefinitions.js --demo');
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
      definitions = parseJSON(content);
    } else {
      definitions = parseCSV(content);
    }
  }
  
  console.log(`📊 ${definitions.length} définitions à traiter`);
  
  // Upsert
  await upsertDefinitions(definitions);
  
  console.log('🎉 Import terminé!');
}

main().catch(console.error);
