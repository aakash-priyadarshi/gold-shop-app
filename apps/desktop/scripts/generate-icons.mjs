/**
 * Generate app icons from the Orivraa SVG logo.
 * 
 * Usage: node scripts/generate-icons.mjs
 * 
 * Prerequisites: npm install sharp png-to-ico (run from apps/desktop/)
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');
const svgPath = join(iconsDir, 'orivraa-icon.svg');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp is not installed. Run: npm install -D sharp');
    process.exit(1);
  }

  const svg = readFileSync(svgPath);
  console.log('Generating icons from:', svgPath);

  // PNG sizes required by Tauri
  const pngSizes = {
    '32x32.png': 32,
    '128x128.png': 128,
    '128x128@2x.png': 256,
    'icon.png': 512,
    'Square30x30Logo.png': 30,
    'Square44x44Logo.png': 44,
    'Square71x71Logo.png': 71,
    'Square89x89Logo.png': 89,
    'Square107x107Logo.png': 107,
    'Square142x142Logo.png': 142,
    'Square150x150Logo.png': 150,
    'Square284x284Logo.png': 284,
    'Square310x310Logo.png': 310,
    'StoreLogo.png': 50,
  };

  // Generate all PNG sizes
  for (const [filename, size] of Object.entries(pngSizes)) {
    const outPath = join(iconsDir, filename);
    await sharp(svg)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${filename} (${size}x${size})`);
  }

  // Generate ICO (contains 16, 32, 48, 256 px frames)
  const icoSizes = [16, 32, 48, 256];
  const icoBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(svg)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toBuffer();
    icoBuffers.push(buf);
  }

  // Build ICO file manually (ICO format: header + directory + PNG frames)
  const numImages = icoBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let dataOffset = headerSize + dirSize;

  // ICO Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);    // reserved
  header.writeUInt16LE(1, 2);    // type (1 = ICO)
  header.writeUInt16LE(numImages, 4); // count

  // Directory entries
  const dirEntries = Buffer.alloc(dirSize);
  const offsets = [];
  for (let i = 0; i < numImages; i++) {
    const size = icoSizes[i];
    const buf = icoBuffers[i];
    const entryOffset = i * dirEntrySize;

    dirEntries.writeUInt8(size >= 256 ? 0 : size, entryOffset);      // width
    dirEntries.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);  // height
    dirEntries.writeUInt8(0, entryOffset + 2);   // color palette
    dirEntries.writeUInt8(0, entryOffset + 3);   // reserved
    dirEntries.writeUInt16LE(1, entryOffset + 4); // color planes
    dirEntries.writeUInt16LE(32, entryOffset + 6); // bits per pixel
    dirEntries.writeUInt32LE(buf.length, entryOffset + 8);  // data size
    dirEntries.writeUInt32LE(dataOffset, entryOffset + 12); // data offset
    
    offsets.push(dataOffset);
    dataOffset += buf.length;
  }

  // Combine everything
  const ico = Buffer.concat([header, dirEntries, ...icoBuffers]);
  const icoPath = join(iconsDir, 'icon.ico');
  writeFileSync(icoPath, ico);
  console.log(`  ✓ icon.ico (${icoSizes.join(', ')} px frames)`);

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
