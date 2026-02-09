/**
 * Generate jewellery type images using Google Imagen 4 API
 * and upload them to Cloudflare R2 via the image worker.
 *
 * Usage: node scripts/generate-jewellery-images.mjs
 */

const GEMINI_API_KEY = "AIzaSyDZwNY-rDh57Bf7MGUtnSBvLwq3DTjPB0s";
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`;
const WORKER_URL = "https://images.orivraa.com";

const TYPES = [
  {
    key: "TIE_PIN",
    prompt:
      "A luxury gold tie pin (tie clip) for men, elegant minimalist design with a small diamond accent, placed on a clean white background, product photography, studio lighting, ultra detailed, photorealistic, 4K",
  },
  {
    key: "CUFFLINKS",
    prompt:
      "A pair of elegant gold cufflinks for men, round shape with intricate engraved pattern, placed on a clean white background, product photography, studio lighting, ultra detailed, photorealistic, 4K",
  },
  {
    key: "NOSE_PIN",
    prompt:
      "A delicate gold nose pin (nose stud) for women, tiny sparkling diamond solitaire setting, placed on a clean white background, product photography, studio lighting, ultra detailed, photorealistic, 4K",
  },
];

async function generateImage(prompt) {
  console.log(`  Calling Imagen 4 API...`);
  const response = await fetch(IMAGEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        personGeneration: "dont_allow",
        safetyFilterLevel: "block_only_high",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Imagen API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const base64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64) {
    throw new Error(`No image returned. Response: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return base64;
}

async function uploadToR2(base64Data, filename) {
  console.log(`  Uploading to R2 as ${filename}...`);
  const response = await fetch(`${WORKER_URL}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Upload-Type": "product",
    },
    body: JSON.stringify({
      data: `data:image/png;base64,${base64Data}`,
      filename,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`R2 upload error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(`R2 upload failed: ${result.error}`);
  }
  return result.url;
}

async function main() {
  const results = {};

  for (const type of TYPES) {
    console.log(`\n=== Generating ${type.key} ===`);
    try {
      const base64 = await generateImage(type.prompt);
      console.log(`  Generated image (${Math.round(base64.length / 1024)}KB base64)`);

      const filename = `${type.key.toLowerCase()}.png`;
      const url = await uploadToR2(base64, filename);
      console.log(`  ✓ Uploaded: ${url}`);
      results[type.key] = url;
    } catch (err) {
      console.error(`  ✗ Failed for ${type.key}: ${err.message}`);
      results[type.key] = null;
    }
  }

  console.log("\n\n=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
