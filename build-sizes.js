#!/usr/bin/env node
/**
 * build-sizes.js
 *
 * Scans versions/ recursively for .html files.
 *  - Files inside versions/example/ are treated as the "hero" (main published
 *    engine). There should be exactly one .html file there; its size becomes
 *    `hero` in sizes.json.
 *  - All other .html files contribute to the min/max byte range.
 *
 * Writes versions/sizes.json. Run from project root: `node build-sizes.js`.
 */

const fs = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, 'versions');
const EXAMPLE  = path.join(ROOT, 'example');
const OUT      = path.join(ROOT, 'sizes.json');

if (!fs.existsSync(ROOT)) {
  console.error('versions/ directory not found at: ' + ROOT);
  process.exit(1);
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (stat.isFile() && name.toLowerCase().endsWith('.html')) {
      out.push({ path: full, size: stat.size });
    }
  }
}

const all = [];
walk(ROOT, all);

// Variant count: only .html files directly inside versions/ (no subdirs).
let variantCount = 0;
for (const name of fs.readdirSync(ROOT)) {
  const full = path.join(ROOT, name);
  const stat = fs.statSync(full);
  if (stat.isFile() && name.toLowerCase().endsWith('.html')) {
    variantCount++;
  }
}

// Split: hero (anything under example/) vs range (everything else).
const heroFiles  = [];
const rangeFiles = [];
for (const f of all) {
  if (f.path.startsWith(EXAMPLE + path.sep) || f.path === EXAMPLE) {
    heroFiles.push(f);
  } else {
    rangeFiles.push(f);
  }
}

if (heroFiles.length === 0) {
  console.error('No .html file found in versions/example/ (expected exactly one).');
  process.exit(1);
}
if (heroFiles.length > 1) {
  console.warn('Warning: versions/example/ has ' + heroFiles.length +
    ' .html files; expected exactly one. Using the first: ' +
    path.relative(ROOT, heroFiles[0].path));
}
if (rangeFiles.length === 0) {
  console.error('No .html files found under versions/ outside example/.');
  process.exit(1);
}

rangeFiles.sort((a, b) => a.size - b.size);
const min  = rangeFiles[0];
const max  = rangeFiles[rangeFiles.length - 1];
const hero = heroFiles[0];

const out = {
  min:      min.size,
  max:      max.size,
  hero:     hero.size,
  variants: variantCount,
  minFile:  path.relative(ROOT, min.path),
  maxFile:  path.relative(ROOT, max.path),
  heroFile: path.relative(ROOT, hero.path),
  count:    rangeFiles.length,
  generated: new Date().toISOString()
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('Wrote ' + path.relative(__dirname, OUT));
console.log('  hero: ' + hero.size + ' B  (' + out.heroFile + ')');
console.log('  min : ' + min.size  + ' B  (' + out.minFile  + ')');
console.log('  max : ' + max.size  + ' B  (' + out.maxFile  + ')');
console.log('  variants (top-level): ' + variantCount);
console.log('  files scanned (range): ' + rangeFiles.length);
