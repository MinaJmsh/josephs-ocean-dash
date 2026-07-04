/**
 * generate-assets.js
 * Run this ONCE before building:  node scripts/generate-assets.js
 *
 * Reads every PNG from assets/images/ and writes a file:
 *   src/constants/imageAssets.ts
 *
 * That file contains all images as base64 data URIs — fully
 * self-contained, no runtime file reading needed in the APK.
 */
const fs = require("fs");
const path = require("path");

const IMAGES_DIR = path.join(__dirname, "../assets/images");
const OUT_FILE = path.join(__dirname, "../src/constants/gameAssets.ts");

const IMAGE_KEYS = [
  "background with 3 lanes.png",
  "bad_1.png",
  "bad_2.png",
  "bad_3.png",
  "bad_4.png",
  "bad_5.png",
  "bad_6.png",
  "bad_7.png",
  "bad_8.png",
  "bad_9.png",
  "good_1.png",
  "good_2.png",
  "good_3.png",
  "good_4.png",
  "good_5.png",
  "good_6.png",
  "good_7.png",
  "good_8.png",
  "good_9.png",
  "good_10.png",
  "good_11.png",
  "good_12.png",
  "d1.png",
  "d2.png",
  "d3.png",
  "how to play.png",
  "joseph.png",
  "menu.png",
  "pause.png",
  "play.png",
  "reset.png",
  "plainbutton.png",
  "full-heart.png",
  "empty-heart.png",
];

console.log("Generating base64 image assets...");

const entries = [];
let missing = [];

for (const key of IMAGE_KEYS) {
  const filePath = path.join(IMAGES_DIR, key);
  if (!fs.existsSync(filePath)) {
    console.warn(`  MISSING: ${key}`);
    missing.push(key);
    entries.push(`  ${JSON.stringify(key)}: '',`);
    continue;
  }
  const data = fs.readFileSync(filePath);
  const b64 = data.toString("base64");
  const ext = key.toLowerCase();
  const mime =
    ext.endsWith(".jpg") || ext.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  const uri = `data:${mime};base64,${b64}`;
  const kb = Math.round(data.length / 1024);
  console.log(`  OK  ${key} (${kb} KB)`);
  entries.push(`  ${JSON.stringify(key)}: ${JSON.stringify(uri)},`);
}

const output = `// AUTO-GENERATED — do not edit by hand.
// Run:  node scripts/generate-assets.js
// Then commit this file and rebuild.

const GAME_ASSETS: Record<string, string> = {
${entries.join("\n")}
};

export default GAME_ASSETS;
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, output, "utf8");

const sizeKB = Math.round(fs.statSync(OUT_FILE).size / 1024);
console.log(`\nWrote ${OUT_FILE} (${sizeKB} KB)`);
if (missing.length) {
  console.warn(`\nMissing files (will show as rectangles):`);
  missing.forEach((m) => console.warn("  " + m));
}
console.log("\nDone! Now commit imageAssets.ts and build your APK.");
