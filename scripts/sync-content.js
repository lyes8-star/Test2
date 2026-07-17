#!/usr/bin/env node
/**
 * Assemble contenu/*.json → data/content.json
 * Usage: node scripts/sync-content.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENU = path.join(ROOT, 'contenu');
const OUT = path.join(ROOT, 'data', 'content.json');

const FILES = [
  'site.json',
  'diaporama.json',
  'a-propos.json',
  'services.json',
  'galerie.json',
  'actualites.json',
  'faq.json',
  'zones.json',
  'pages.json',
  'process.json',
];

function main() {
  const merged = {};
  for (const file of FILES) {
    const full = path.join(CONTENU, file);
    if (!fs.existsSync(full)) {
      console.error('Fichier manquant:', file);
      process.exit(1);
    }
    const part = JSON.parse(fs.readFileSync(full, 'utf8'));
    Object.assign(merged, part);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log('OK → data/content.json (' + Object.keys(merged).join(', ') + ')');
}

main();
