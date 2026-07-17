#!/usr/bin/env node
/**
 * Génère des dérivés WebP (800w / 1200w) pour heroes, services et galerie.
 * Usage: node scripts/optimize-images.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIDTHS = [800, 1200];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Installez sharp: npm install sharp --save-dev');
    process.exit(1);
  }

  const dirs = [
    path.join(ROOT, 'contenu', 'photos', 'hero'),
    path.join(ROOT, 'contenu', 'photos', 'services'),
    path.join(ROOT, 'contenu', 'photos', 'gallery'),
  ];

  let created = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f) && !/-full\.jpe?g$/i.test(f));
    for (const file of files) {
      const src = path.join(dir, file);
      const base = file.replace(/\.jpe?g$/i, '');
      for (const w of WIDTHS) {
        const out = path.join(dir, `${base}-${w}w.webp`);
        if (fs.existsSync(out)) {
          const srcStat = fs.statSync(src);
          const outStat = fs.statSync(out);
          if (outStat.mtimeMs >= srcStat.mtimeMs) continue;
        }
        await sharp(src)
          .rotate()
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toFile(out);
        created += 1;
        console.log('→', path.relative(ROOT, out));
      }
    }
  }

  // PWA screenshots from hero
  const shotDir = path.join(ROOT, 'icons', 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });
  const heroSrc = path.join(ROOT, 'contenu', 'photos', 'hero', 'slide-1.jpg');
  if (fs.existsSync(heroSrc)) {
    const narrow = path.join(shotDir, 'narrow.png');
    const wide = path.join(shotDir, 'wide.png');
    await sharp(heroSrc).rotate().resize(540, 720, { fit: 'cover' }).png().toFile(narrow);
    await sharp(heroSrc).rotate().resize(1280, 720, { fit: 'cover' }).png().toFile(wide);
    console.log('→ icons/screenshots/narrow.png');
    console.log('→ icons/screenshots/wide.png');
    created += 2;
  }

  console.log('optimize-images done:', created, 'file(s)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
