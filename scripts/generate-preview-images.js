/**
 * Script to generate jewelry type and surface finish preview images using Google Imagen 4
 * 
 * Usage: 
 *   set GEMINI_API_KEY=your_api_key_here
 *   node scripts/generate-preview-images.js
 * 
 * Or pass as argument:
 *   node scripts/generate-preview-images.js YOUR_API_KEY
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Error: Please provide GEMINI_API_KEY as environment variable or command line argument');
  console.error('Usage: node scripts/generate-preview-images.js YOUR_API_KEY');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '..', 'apps', 'web', 'public', 'previews');

// Jewelry types to generate
const JEWELRY_TYPES = [
  { id: 'ring', prompt: 'A beautiful gold ring on a white studio background, professional jewelry photography, elegant and minimalist, high quality product shot, 22k yellow gold, simple solitaire design' },
  { id: 'necklace', prompt: 'An elegant gold necklace with delicate chain on white studio background, professional jewelry photography, 22k yellow gold, minimalist design, high quality product shot' },
  { id: 'bracelet', prompt: 'A stylish gold bracelet on white studio background, professional jewelry photography, 22k yellow gold chain bracelet, elegant and minimalist, high quality product shot' },
  { id: 'earring', prompt: 'A pair of beautiful gold earrings on white studio background, professional jewelry photography, 22k yellow gold drop earrings, elegant design, high quality product shot' },
  { id: 'pendant', prompt: 'An elegant gold pendant on white studio background, professional jewelry photography, 22k yellow gold, ornate design without chain, high quality product shot' },
  { id: 'bangle', prompt: 'A beautiful gold bangle bracelet on white studio background, professional jewelry photography, 22k yellow gold, traditional Indian design, high quality product shot' },
  { id: 'chain', prompt: 'A gold chain necklace on white studio background, professional jewelry photography, 22k yellow gold rope chain, minimalist, high quality product shot' },
  { id: 'anklet', prompt: 'A delicate gold anklet on white studio background, professional jewelry photography, 22k yellow gold chain with small charms, high quality product shot' },
  { id: 'brooch', prompt: 'An ornate gold brooch on white studio background, professional jewelry photography, 22k yellow gold, vintage floral design, high quality product shot' },
];

// Surface finishes to generate
const SURFACE_FINISHES = [
  { id: 'polished', prompt: 'Close-up of highly polished mirror finish gold surface, reflective, shiny, professional macro photography, studio lighting, showing smooth mirror-like reflection' },
  { id: 'matte', prompt: 'Close-up of matte brushed gold surface texture, non-reflective, soft appearance, professional macro photography, studio lighting, showing brushed metal finish' },
  { id: 'satin', prompt: 'Close-up of satin finish gold surface, subtle sheen, between matte and polish, professional macro photography, studio lighting, silk-like luster' },
  { id: 'hammered', prompt: 'Close-up of hammered gold surface texture, showing small indentations and dimples, artisan crafted look, professional macro photography, studio lighting' },
  { id: 'sandblast', prompt: 'Close-up of sandblasted gold surface, frosted granular texture, matte with fine grain, professional macro photography, studio lighting' },
  { id: 'antique', prompt: 'Close-up of antique oxidized gold surface, vintage patina finish, darker recesses with gold highlights, professional macro photography, aged jewelry look' },
];

async function generateImage(prompt, outputPath) {
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict';
  
  console.log(`Generating: ${path.basename(outputPath)}...`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          personGeneration: 'DONT_ALLOW',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();

    if (!result.predictions || result.predictions.length === 0) {
      throw new Error('No images generated');
    }

    const base64Data = result.predictions[0].bytesBase64Encoded;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`✓ Saved: ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error(`✗ Failed: ${path.basename(outputPath)} - ${error.message}`);
    return false;
  }
}

async function main() {
  // Create output directories
  const jewelryDir = path.join(OUTPUT_DIR, 'jewelry');
  const finishDir = path.join(OUTPUT_DIR, 'finishes');
  
  fs.mkdirSync(jewelryDir, { recursive: true });
  fs.mkdirSync(finishDir, { recursive: true });
  
  console.log('=== Generating Jewelry Type Preview Images ===\n');
  
  for (const item of JEWELRY_TYPES) {
    const outputPath = path.join(jewelryDir, `${item.id}.png`);
    await generateImage(item.prompt, outputPath);
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== Generating Surface Finish Preview Images ===\n');
  
  for (const item of SURFACE_FINISHES) {
    const outputPath = path.join(finishDir, `${item.id}.png`);
    await generateImage(item.prompt, outputPath);
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== Done! ===');
  console.log(`Images saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
