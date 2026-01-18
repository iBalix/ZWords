/**
 * Raccourcit les définitions en base à max 35 caractères
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

function shortenClue(clue) {
  if (!clue) return '';
  
  // Supprimer les parenthèses et leur contenu
  let cleaned = clue
    .replace(/\s*\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Max 35 caractères
  if (cleaned.length > 35) {
    cleaned = cleaned.substring(0, 35);
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > 20) {
      cleaned = cleaned.substring(0, lastSpace);
    }
    cleaned = cleaned.replace(/[,;:\s]+$/, '');
  }
  
  return cleaned;
}

async function main() {
  console.log('📝 Raccourcissement des définitions...');
  
  const { data: clues, error } = await supabase
    .from('zwords_clues')
    .select('id, clue_text, clue_short');
  
  if (error) {
    console.error('Erreur:', error.message);
    return;
  }
  
  console.log('Clues à traiter:', clues.length);
  
  let updated = 0;
  const batchSize = 100;
  
  for (let i = 0; i < clues.length; i += batchSize) {
    const batch = clues.slice(i, i + batchSize);
    
    for (const clue of batch) {
      const newShort = shortenClue(clue.clue_text);
      
      if (newShort && newShort !== clue.clue_short) {
        const { error: updateError } = await supabase
          .from('zwords_clues')
          .update({ clue_short: newShort })
          .eq('id', clue.id);
        
        if (!updateError) {
          updated++;
        }
      }
    }
    
    console.log(`   Traité: ${Math.min(i + batchSize, clues.length)}/${clues.length}`);
  }
  
  console.log('✅ Mis à jour:', updated);
  
  // Afficher quelques exemples
  const { data: samples } = await supabase
    .from('zwords_clues')
    .select('clue_short')
    .limit(15);
  
  console.log('\nExemples de clues courtes:');
  for (const s of samples || []) {
    console.log(' -', s.clue_short, `(${s.clue_short?.length || 0} chars)`);
  }
}

main().catch(console.error);
