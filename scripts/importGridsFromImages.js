/**
 * ZWords - Import de grilles depuis des captures d'écran
 * 
 * Ce script analyse des images de grilles de mots fléchés via OpenAI Vision
 * et les importe dans la base de données.
 * 
 * Usage:
 *   node scripts/importGridsFromImages.js
 *   node scripts/importGridsFromImages.js --file=grille1.png
 *   node scripts/importGridsFromImages.js --dry-run
 * 
 * Les images doivent être placées dans le dossier: grids-to-import/
 * 
 * Prérequis:
 *   - OPENAI_API_KEY dans le fichier .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../grids-to-import');
const PROCESSED_DIR = path.join(__dirname, '../grids-to-import/processed');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// OpenAI API
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Encode une image en base64
 */
function encodeImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Détermine le type MIME d'une image
 */
function getImageMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/png';
}

/**
 * Analyse une image de grille via OpenAI Vision
 */
async function analyzeGridImage(imagePath) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY non définie dans le fichier .env');
  }

  console.log(`🔍 Analyse de l'image: ${path.basename(imagePath)}`);

  const base64Image = encodeImageToBase64(imagePath);
  const mimeType = getImageMimeType(imagePath);

  const prompt = `You are a data extraction assistant. I am building a word puzzle game for educational purposes and need to digitize this grid.

This image shows a French "mots fléchés" (arrow crossword) puzzle grid. The grid has:
- Pink/salmon colored cells: These contain clue text and small arrows pointing right (→) or down (↓)
- White cells with letters: These are the answer cells

Please extract all data from this grid into a structured JSON format:

{
  "rows": <total row count>,
  "cols": <total column count>,
  "cells": [
    {"row": 0, "col": 0, "type": "clue", "clue": "CLUE TEXT HERE", "direction": "right"},
    {"row": 0, "col": 1, "type": "letter", "value": "A"},
    {"row": 0, "col": 2, "type": "letter", "value": "B"}
  ],
  "words": [
    {"clueRow": 0, "clueCol": 0, "direction": "right", "answer": "AB", "clue": "CLUE TEXT HERE"}
  ]
}

Rules:
- "type" is either "clue" (pink cell with text) or "letter" (white cell)
- For clue cells, extract the French text and determine if arrow points right or down
- For letter cells, extract the letter shown
- In "words" array, list each word with its clue position, direction, full answer, and clue text

Return ONLY valid JSON, no explanations.`;

  try {
    console.log('   ⏳ Envoi à OpenAI (peut prendre 1-2 min)...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 16000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Pas de réponse de OpenAI');
    }

    // Parser le JSON (enlever les backticks markdown si présents)
    let jsonStr = content.trim();
    
    // Log la réponse brute pour debug
    console.log(`   📄 Réponse OpenAI (${content.length} chars):`);
    console.log(`   ${content.substring(0, 200)}...`);
    
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();
    
    // Vérifier si c'est une réponse d'erreur
    if (jsonStr.toLowerCase().startsWith("i'm sorry") || 
        jsonStr.toLowerCase().startsWith("i cannot") ||
        jsonStr.toLowerCase().startsWith("sorry")) {
      throw new Error(`OpenAI a refusé: ${content.substring(0, 200)}`);
    }

    const gridData = JSON.parse(jsonStr);
    console.log(`   ✅ Grille ${gridData.rows}x${gridData.cols} détectée`);
    console.log(`   📝 ${gridData.words?.length || 0} mots trouvés`);

    return gridData;

  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`);
    throw error;
  }
}

/**
 * Convertit les données OpenAI au format de la base de données
 */
function convertToDbFormat(gridData, source) {
  const { rows, cols, cells, words } = gridData;
  
  // Créer un mapping entryId pour chaque mot
  let entryCounter = 0;
  const wordsWithIds = (words || []).map(w => {
    entryCounter++;
    return {
      ...w,
      entryId: `${entryCounter}-${w.direction}`
    };
  });

  // Construire les cellules au format final
  const finalCells = [];
  
  for (const cell of cells) {
    const baseCell = { row: cell.row, col: cell.col, type: cell.type };
    
    if (cell.type === 'black') {
      finalCells.push(baseCell);
    } else if (cell.type === 'clue') {
      // Trouver le mot correspondant
      const word = wordsWithIds.find(w => 
        w.clueRow === cell.row && w.clueCol === cell.col
      );
      
      finalCells.push({
        ...baseCell,
        clue: cell.clue,
        clueFull: cell.clue,
        direction: cell.direction,
        entryId: word?.entryId || '',
        answer: word?.answer || ''
      });
    } else if (cell.type === 'letter') {
      // Trouver quels mots passent par cette case
      const entryIds = [];
      for (const word of wordsWithIds) {
        // Calculer si cette case fait partie du mot
        const clueR = word.clueRow;
        const clueC = word.clueCol;
        const len = word.answer?.length || 0;
        
        for (let i = 0; i < len; i++) {
          const r = word.direction === 'down' ? clueR + 1 + i : clueR;
          const c = word.direction === 'right' ? clueC + 1 + i : clueC;
          
          if (r === cell.row && c === cell.col) {
            entryIds.push(word.entryId);
            break;
          }
        }
      }
      
      finalCells.push({
        ...baseCell,
        entryIds: entryIds.join(','),
        value: cell.value || null
      });
    }
  }

  // Construire les réponses
  const answers = {};
  for (const word of wordsWithIds) {
    if (!word.answer) continue;
    
    const cells = [];
    const len = word.answer.length;
    
    for (let i = 0; i < len; i++) {
      const r = word.direction === 'down' ? word.clueRow + 1 + i : word.clueRow;
      const c = word.direction === 'right' ? word.clueCol + 1 + i : word.clueCol;
      cells.push([r, c]);
    }
    
    answers[word.entryId] = {
      word: word.answer.toUpperCase(),
      cells
    };
  }

  return {
    name: path.basename(source, path.extname(source)),
    difficulty: 'medium',
    source,
    rows,
    cols,
    grid_data: { rows, cols, cells: finalCells },
    answers,
    is_active: true
  };
}

/**
 * Insère une grille dans la base de données
 */
async function insertGrid(gridRecord) {
  const { data, error } = await supabase
    .from('zwords_stock_grids')
    .insert(gridRecord)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erreur insertion: ${error.message}`);
  }

  return data.id;
}

/**
 * Déplace une image vers le dossier processed
 */
function moveToProcessed(imagePath) {
  if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  }
  
  const destPath = path.join(PROCESSED_DIR, path.basename(imagePath));
  fs.renameSync(imagePath, destPath);
}

/**
 * Liste les images dans le dossier
 */
function getImageFiles() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    return [];
  }
  
  const files = fs.readdirSync(IMAGES_DIR);
  return files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
  }).map(f => path.join(IMAGES_DIR, f));
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const singleFile = args.find(a => a.startsWith('--file='));

  console.log('');
  console.log('🎯 ZWords - Import de grilles depuis images');
  console.log('==========================================');
  console.log('');

  if (!OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY non définie !');
    console.log('   Ajoutez OPENAI_API_KEY=sk-... dans apps/api/.env');
    process.exit(1);
  }

  // Récupérer les images à traiter
  let images;
  if (singleFile) {
    const filePath = singleFile.split('=')[1];
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(IMAGES_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Fichier non trouvé: ${fullPath}`);
      process.exit(1);
    }
    images = [fullPath];
  } else {
    images = getImageFiles();
  }

  if (images.length === 0) {
    console.log('📭 Aucune image à traiter.');
    console.log(`   Placez vos captures d'écran dans: ${IMAGES_DIR}`);
    console.log('   Formats supportés: PNG, JPG, GIF, WEBP');
    process.exit(0);
  }

  console.log(`📸 ${images.length} image(s) à traiter`);
  if (dryRun) {
    console.log('🔍 Mode dry-run (pas d\'insertion en base)');
  }
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const imagePath of images) {
    console.log(`\n📷 Traitement: ${path.basename(imagePath)}`);
    console.log('─'.repeat(50));

    try {
      // Analyser l'image
      const gridData = await analyzeGridImage(imagePath);

      // Convertir au format DB
      const dbRecord = convertToDbFormat(gridData, path.basename(imagePath));

      console.log(`   📊 ${dbRecord.rows}x${dbRecord.cols}, ${Object.keys(dbRecord.answers).length} mots`);

      if (!dryRun) {
        // Insérer en base
        const gridId = await insertGrid(dbRecord);
        console.log(`   💾 Grille insérée: ${gridId}`);

        // Déplacer l'image
        moveToProcessed(imagePath);
        console.log(`   📁 Image déplacée vers processed/`);
      } else {
        console.log('   ⏭️ Dry-run: pas d\'insertion');
        console.log('   Données:', JSON.stringify(dbRecord.grid_data, null, 2).slice(0, 500) + '...');
      }

      successCount++;
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      errorCount++;
    }
  }

  console.log('');
  console.log('==========================================');
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log('');

  // Afficher stats stock
  if (!dryRun && successCount > 0) {
    const { data: stats } = await supabase
      .from('zwords_stock_grids')
      .select('id', { count: 'exact' })
      .eq('is_active', true);
    
    console.log(`📦 Total grilles en stock: ${stats?.length || 0}`);
  }
}

main().catch(console.error);
