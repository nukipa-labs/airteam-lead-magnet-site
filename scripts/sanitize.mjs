#!/usr/bin/env node
// Sanitize agent-generated text in the project's source files. Swaps
// non-keyboard Unicode characters (smart quotes, en/em dashes, NBSPs,
// zero-width whitespace, fullwidth punctuation) for their ASCII
// equivalents, and strips provider-specific citation artefacts
// (OpenAI file-search markers, GPT-5 `fileciteturn…` tokens,
// stray `<cite>` tags).
//
// Runs from the project root. Walks src/, public/*.svg, the root
// .md/.mdx/.json files. Skips node_modules, .next, .vercel, build
// output, and binary assets.
//
// Canonical pattern source: services/cms/src/lib/sanitize.js in the
// Nukipa monorepo — keep in sync.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPLACEMENTS = [
  // ---- Dashes -> ASCII hyphen -------------------------------------------
  [/–/g, '-'],   // en-dash
  [/—/g, '-'],   // em-dash
  [/―/g, '-'],   // horizontal bar
  [/‐/g, '-'],   // hyphen
  [/‑/g, '-'],   // non-breaking hyphen
  [/‒/g, '-'],   // figure dash
  [/−/g, '-'],   // minus sign
  [/﹘/g, '-'],   // small em dash
  [/﹣/g, '-'],   // small hyphen-minus
  [/－/g, '-'],   // fullwidth hyphen-minus

  // ---- Single quotes / apostrophes --------------------------------------
  [/‘/g, "'"],   // left single quote
  [/’/g, "'"],   // right single quote / apostrophe
  [/‚/g, "'"],   // single low-9 quote
  [/‛/g, "'"],   // single high-reversed-9 quote
  [/′/g, "'"],   // prime
  [/‹/g, "'"],   // single left-pointing angle
  [/›/g, "'"],   // single right-pointing angle
  [/＇/g, "'"],   // fullwidth apostrophe

  // ---- Double quotes ----------------------------------------------------
  [/“/g, '"'],   // left double quote
  [/”/g, '"'],   // right double quote
  [/„/g, '"'],   // double low-9 quote
  [/‟/g, '"'],   // double high-reversed-9 quote
  [/″/g, '"'],   // double prime
  [/«/g, '"'],   // left guillemet
  [/»/g, '"'],   // right guillemet
  [/＂/g, '"'],   // fullwidth quotation mark

  // ---- Ellipsis + spaces ------------------------------------------------
  [/…/g, '...'],
  [/ /g, ' '],   // non-breaking space
  [/ /g, ' '],   // en space
  [/ /g, ' '],   // em space
  [/ /g, ' '],   // three-per-em
  [/ /g, ' '],   // four-per-em
  [/ /g, ' '],   // six-per-em
  [/ /g, ' '],   // figure space
  [/ /g, ' '],   // punctuation space
  [/ /g, ' '],   // thin space
  [/ /g, ' '],   // hair space
  [/ /g, ' '],   // narrow no-break space
  [/ /g, ' '],   // medium mathematical space
  [/　/g, ' '],   // ideographic space

  // ---- Zero-width / invisible (strip) -----------------------------------
  [/​/g, ''],    // zero-width space
  [/‌/g, ''],    // zero-width non-joiner
  [/‍/g, ''],    // zero-width joiner
  [/﻿/g, ''],    // BOM
  [/⁠/g, ''],    // word joiner
  [/­/g, ''],    // soft hyphen

  // ---- Bullets ----------------------------------------------------------
  [/•/g, '-'],   // bullet
  [/⁃/g, '-'],   // hyphen bullet
  // NB: arrows (-> and <-) are intentionally NOT rewritten here.
  // The canonical sanitize.js operates on prose body text where they
  // make sense; this script operates on JSX/TSX source where `<-`
  // would be parsed as the start of an opening tag and break the build.
  // Arrow characters in source files render fine in the browser as-is.

  // ---- Fullwidth punctuation -------------------------------------------
  [/：/g, ':'],
  [/；/g, ';'],
  [/，/g, ','],
  [/．/g, '.'],
  [/！/g, '!'],
  [/？/g, '?'],

  // ---- OpenAI file-search citation artefacts (strip entirely) ----------
  [/【[^】]*】/g, ''],
  [/\[turn\d+file\d+\]/gi, ''],
  [/\[\d+:\d+†[^\]]*\]/g, ''],
  [/\[file-[a-zA-Z0-9]+†[^\]]*\]/g, ''],
  [/\s*\(Source:?\s*file[^)]*\)/gi, ''],
  [/\s*\[Source:?\s*file[^\]]*\]/gi, ''],

  // ---- Malformed cite markers (NOT well-formed `{{cite:N}}`) -----------
  [/\{\{cite\}\}/gi, ''],
  [/\{\{cite:(?!\d+\}\})[^}]*\}\}/gi, ''],
  [/\{@\}/g, ''],

  // ---- GPT-5 / 4.1 bare citation tokens --------------------------------
  [/(?:file)?cite(?:\s*turn\d+(?:file|view|search)\d+)+/gi, ''],
  [/filecite\S*/gi, ''],
  [/\bturn\d+(?:file|search)\d+\b/gi, ''],

  // ---- Anthropic raw `<cite index="...">...</cite>` tags ----------------
  [/<cite\s[^>]*>/gi, ''],
  [/<\/cite>/gi, ''],

  // ---- Private Use Area (e.g. OpenAI U+E200 marker) --------------------
  [/[-]/g, '']
];

function sanitizeText(text) {
  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.mdx', '.txt',
  '.css', '.scss',
  '.html',
  '.json', '.yml', '.yaml',
  '.svg'
]);

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.vercel', '.git',
  'dist', 'build', 'out', '.turbo', '.cache',
  'scripts'  // the script itself has literal smart quotes / dashes
             // inside its pattern table; self-sanitizing would gut it.
]);

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) yield full;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--check');
  const positional = args.find((a) => !a.startsWith('--'));
  const root = positional ? path.resolve(positional) : process.cwd();

  let scanned = 0;
  let changed = 0;
  const changedFiles = [];

  for await (const file of walk(root)) {
    scanned += 1;
    const original = await fs.readFile(file, 'utf8');
    const cleaned = sanitizeText(original);
    if (cleaned !== original) {
      changed += 1;
      changedFiles.push(path.relative(root, file));
      if (!dryRun) await fs.writeFile(file, cleaned);
    }
  }

  const verb = dryRun ? 'would change' : 'cleaned';
  console.log(`sanitize: scanned ${scanned} files, ${verb} ${changed}`);
  if (changedFiles.length) {
    console.log(changedFiles.map((f) => `  - ${f}`).join('\n'));
  }
  if (dryRun && changed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('sanitize: failed —', err.message);
  process.exit(1);
});
