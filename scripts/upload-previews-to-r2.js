/**
 * Script to upload preview images to Cloudflare R2
 * 
 * Usage: node scripts/upload-previews-to-r2.js
 */

const fs = require('fs');
const path = require('path');

const WORKER_URL = 'https://images.orivraa.com';
const PREVIEWS_DIR = path.join(__dirname, '..', 'apps', 'web', 'public', 'previews');

async function uploadFile(filePath, uploadType) {
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log(`Uploading: ${fileName}...`);
  
  try {
    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    
    // Create FormData using native API
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      headers: {
        'X-Upload-Type': uploadType,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.url) {
      console.log(`✓ Uploaded: ${result.url}`);
      return result.url;
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error(`✗ Failed: ${fileName} - ${error.message}`);
    return null;
  }
}

async function main() {
  const results = {
    jewelry: {},
    finishes: {},
  };
  
  // Upload jewelry type images
  console.log('\n=== Uploading Jewelry Type Images ===\n');
  const jewelryDir = path.join(PREVIEWS_DIR, 'jewelry');
  const jewelryFiles = fs.readdirSync(jewelryDir);
  
  for (const file of jewelryFiles) {
    if (file.endsWith('.png')) {
      const filePath = path.join(jewelryDir, file);
      const url = await uploadFile(filePath, 'product');
      if (url) {
        const key = file.replace('.png', '').toUpperCase();
        results.jewelry[key] = url;
      }
    }
  }
  
  // Upload surface finish images
  console.log('\n=== Uploading Surface Finish Images ===\n');
  const finishDir = path.join(PREVIEWS_DIR, 'finishes');
  const finishFiles = fs.readdirSync(finishDir);
  
  for (const file of finishFiles) {
    if (file.endsWith('.png')) {
      const filePath = path.join(finishDir, file);
      const url = await uploadFile(filePath, 'product');
      if (url) {
        const key = file.replace('.png', '').toUpperCase();
        results.finishes[key] = url;
      }
    }
  }
  
  console.log('\n=== Upload Complete ===\n');
  console.log('Jewelry URLs:');
  console.log(JSON.stringify(results.jewelry, null, 2));
  console.log('\nFinish URLs:');
  console.log(JSON.stringify(results.finishes, null, 2));
  
  // Save URLs to a file for reference
  fs.writeFileSync(
    path.join(__dirname, 'preview-urls.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nURLs saved to scripts/preview-urls.json');
}

main().catch(console.error);
