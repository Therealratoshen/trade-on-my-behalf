#!/usr/bin/env node
/**
 * Terading token guard.
 *
 * Enforces the design system's own rules, in code, so they survive a
 * hurried commit:
 *
 *   1. No colour outside :root.          (the rule docs/design-system.md states)
 *   2. No raw px in a component.         (spacing/type scales must be used)
 *   3. --ok / --no are verdicts only.    (never used for price or decoration)
 *   4. Text tokens meet WCAG AA.         (4.5:1 for body-size text)
 *
 * `pnpm lint` runs it. A violation exits non-zero, so CI fails.
 *
 * Rules 1 and 2 are strict. Rule 3 is a location check, and rule 4 is a
 * small contrast computation — no dependencies, because a guard that can
 * itself fail to install is not a guard.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not `.pathname`: this repo path contains a space, and
// `.pathname` hands back a percent-encoded string that fs cannot open.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CSS = join(ROOT, 'apps/dashboard/app/globals.css');
const DASH = join(ROOT, 'apps/dashboard');
const SCALE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24, 26, 32, 34, 40, 56, 72]);

const failures = [];
const notes = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(ROOT, p);

// ------------------------------------------------- rule 1: colours in :root
const css = readFileSync(CSS, 'utf8');
const rootBlock = (css.match(/:root\s*\{([^}]*)\}/) ?? [, ''])[1];
const known = new Set([...rootBlock.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((m) => m[0].toLowerCase()));

for (const file of walk(DASH)) {
  if (file === CSS) continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    if (!known.has(m[0].toLowerCase())) {
      const line = src.slice(0, m.index).split('\n').length;
      failures.push(`R1 colour ${m[0]} outside :root at ${rel(file)}:${line} — add a token instead`);
    }
  }
}
for (const m of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
  if (!known.has(m[0].toLowerCase())) {
    failures.push(`R1 colour ${m[0]} in globals.css is not declared in :root`);
  }
}

// ------------------------------------------ rule 2: no raw px in components
// Two shapes to catch: CSS declarations (`padding: 6px`) and React style
// objects (`style={{ margin: 7 }}`), where the unit is implicit. A guard
// that only understands one of them misses the other.
for (const file of walk(DASH)) {
  if (file === CSS) continue;
  const src = readFileSync(file, 'utf8');
  const spaced = /(?:fontSize|padding|margin|gap|borderRadius|minWidth|maxWidth|height|width)\s*:\s*(\d+)(?:px)?/g;
  for (const m of src.matchAll(spaced)) {
    const n = Number(m[1]);
    if (n === 0 || n === 100) continue; // 0 and 100% are layout, not spacing
    if (!SCALE.has(n)) {
      const line = src.slice(0, m.index).split('\n').length;
      failures.push(
        `R2 raw ${m[1]} (off-scale) at ${rel(file)}:${line} — use var(--s*) / var(--t*) / var(--r*)`,
      );
    }
  }
}

// ------------------------------------ rule 3: verdicts never used as viz/decor
// A rising candle or a positive P&L number must not wear --ok. The rule
// lives in CSS, so read the CSS: any selector that renders market data
// may reference --viz-* and neutrals, but not --ok/--no/--warn.
const VIZ_SELECTORS = [
  { sel: '.pos', why: 'position P&L' },
  { sel: '.neg', why: 'position P&L' },
  { sel: '.badge.up', why: 'market direction badge' },
  { sel: '.badge.down', why: 'market direction badge' },
  { sel: '.chart-line', why: 'chart series' },
  { sel: '.chart-candle.up', why: 'candle' },
  { sel: '.chart-candle.down', why: 'candle' },
  { sel: '.price-readout .chg.up', why: 'price change' },
  { sel: '.price-readout .chg.down', why: 'price change' },
];
const DECISION = /var\(--(ok|no|warn)\b/;
for (const { sel, why } of VIZ_SELECTORS) {
  const re = new RegExp(
    sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}',
    'g',
  );
  for (const m of css.matchAll(re)) {
    if (DECISION.test(m[1])) {
      const line = css.slice(0, m.index).split('\n').length;
      failures.push(
        `R3 ${why} rule "${sel}" at globals.css:${line} uses a decision colour — it would claim a kernel verdict for price data; use --viz-up/--viz-down`,
      );
    }
  }
}
// Side selection is intent, not a verdict either.
const sideBlock = (css.match(/\.side-toggle button\[aria-pressed[^\{]*\{([^}]*)\}/) ?? [, ''])[1];
if (DECISION.test(sideBlock)) {
  failures.push('R3 .side-toggle selected state uses a decision colour — long/short is intent, not a verdict');
}

// Rule 3b: a verdict class must never be reused for a non-verdict meaning.
// The concrete bug this catches: a position side rendered with the `yes`
// badge, which painted LONG the same green as APPROVED.
// Scoped to side-bearing expressions only — AuditPanel's APPROVED/DENIED is
// the correct use of .yes/.no and must not trip this.
const VERDICT_REUSE = [
  // `badge ${p.side === 'long' ? 'yes' : 'mute'}` — the original defect.
  /className=\{`badge \$\{[^}]*\bside\b[^}]*\}/g,
  // `.side-long` / `.side-short` sharing a class string with yes/no.
  /className=[^\n]*\bside-(?:long|short)\b[^\n]*\b(?:yes|no)\b/g,
  // An explicit side ternary resolving to a verdict class.
  /\bside\b[^\n]{0,80}\?\s*['"](?:yes|no)['"]/g,
];
for (const file of walk(DASH)) {
  if (file === CSS) continue;
  const src = readFileSync(file, 'utf8');
  for (const re of VERDICT_REUSE) {
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split('\n').length;
      failures.push(
        `R3 verdict class reused at ${rel(file)}:${line} — .yes/.no mean a kernel decision; a market side must use .side-long/.side-short (or neutral .mute)`,
      );
    }
  }
}

// ------------------------------------------------ rule 4: WCAG AA on text ink
function luminance(hex) {  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const tokenValue = {};
for (const m of rootBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) {
  tokenValue[m[1]] = m[2];
}
for (const ink of ['--fg', '--fg-dim', '--fg-faint']) {
  if (!(ink in tokenValue) || !('--bg' in tokenValue)) continue;
  const r = ratio(tokenValue[ink], tokenValue['--bg']);
  const size = ink === '--fg-faint' ? 11 : 13;
  const min = size >= 18.66 ? 3 : 4.5;
  if (r < min) {
    failures.push(`R4 ${ink} ${tokenValue[ink]} is ${r.toFixed(2)}:1 on --bg — needs ${min}:1 for ${size}px text`);
  } else {
    notes.push(`${ink.padEnd(11)} ${tokenValue[ink]}  ${r.toFixed(2)}:1  AA ok`);
  }
}

// ------------------------------------------------------------------- report
console.log(`token guard — ${Object.keys(tokenValue).length} colour tokens in :root`);
for (const n of notes) console.log('  ' + n);

// ------------------------------- rule 5: no colour-only meaning (WCAG 1.4.1)
// --viz-up and --viz-down sit at dE 2.8 under achromatopsia, and --ok/--no
// are separated by hue alone. Any element whose *only* difference is colour
// therefore fails Use of Color. A sign, glyph or word must be present.
const COLOUR_ONLY = [
  { re: /<td className=\{`num \$\{[^}]*\bpos\b[^}]*\}`\}\s*>\s*\{/g, what: 'P&L cell', need: 'sign or arrow glyph' },
  { re: /className=\{`chg \$\{up \? 'up' : 'down'\}`\}\s*>\s*\{/g, what: 'price change readout', need: 'arrow or sign glyph' },
  { re: /<span className=\{`badge \$\{e\.approved \? 'yes' : 'no'\}`\}\s*>\s*\{/g, what: 'verdict badge', need: 'word or glyph' },
  { re: /<span className=\{`badge side-\$\{p\.side\}`\}\s*>\s*\{/g, what: 'position side badge', need: 'word or glyph' },
];
for (const file of walk(DASH)) {
  if (file === CSS) continue;
  const src = readFileSync(file, 'utf8');
  for (const { re, what, need } of COLOUR_ONLY) {
    for (const m of src.matchAll(re)) {
      // Look at the next 220 chars: a glyph or sign there satisfies 1.4.1.
      const after = src.slice(m.index, m.index + 220);
      const hasCue = /[▲▼■✕×]|\b(up|down|APPROVED|DENIED|LONG|SHORT)\b|[+−-]\s*\{/.test(after);
      if (!hasCue) {
        const line = src.slice(0, m.index).split('\n').length;
        failures.push(
          `R5 ${what} at ${rel(file)}:${line} carries meaning by colour alone — WCAG 1.4.1 requires a redundant ${need}`,
        );
      }
    }
  }
}

// ------------------------- rule 6: the state family stays non-decisional
// R3 and R3b protect market data and position sides from wearing a verdict
// colour. R6 protects the third case the first pass missed: the *state* of
// the policy account.
//
// "Your policy is LIVE" is not a verdict the kernel issued. The program never
// approved or denied anything by holding an account, so painting that state
// green would put an approval colour on a fact no approval produced — R3b's
// exact defect, one level up. The state family is therefore built from
// --accent / --fg / --line only, and this rule fails the build if a future
// edit reaches for the decision palette or a verdict class inside it.
//
// This is the rule the A2 vocabulary would have needed nobody to remember:
// the honest treatment survives the next hurried commit.
const STATE_SELECTORS = [
  '.state',
  '.state .glyph',
  '.state b',
  '.state-live',
  '.state-live .glyph',
  '.state-unarmed',
  '.state-unarmed .glyph',
  '.state-expired',
  '.state-unowned',
  '.state-none',
  '.state-note',
  '.state-wrap',
  '.claim',
  '.claim .claim-k',
  '.claim .claim-line',
  '.claim .claim-line .mark',
  '.claim .claim-line.is-not',
  '.claim .claim-absent',
];
for (const sel of STATE_SELECTORS) {
  const re = new RegExp(
    '(^|[\\s,}])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(,[^{]*)?\\{([^}]*)\\}',
    'g',
  );
  for (const m of css.matchAll(re)) {
    if (DECISION.test(m[3])) {
      const line = css.slice(0, m.index).split('\n').length;
      failures.push(
        `R6 "${sel}" at globals.css:${line} uses a decision colour — policy state is the state of an account, not a verdict the kernel made. Use --accent / --fg / --line.`,
      );
    }
  }
}

// The chip must also stay a non-verdict *class*: `.state-live` next to
// `.badge.yes` in one className would be the TSX-side twin of the above.
//
// Match the whole className *value* first, then test the parts. A single
// regex spanning both would have to cross the `}` of a `${…}` interpolation,
// which is exactly what the first attempt of this rule did — it silently
// matched nothing, i.e. it was a guard that only ever said "clean".
const CLASS_VALUE = /className=\{(?:`([^`\n]*)`|"([^"\n]*)"|'([^'\n]*)')/g;
for (const file of walk(DASH)) {
  if (file === CSS) continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(CLASS_VALUE)) {
    const body = m[1] ?? m[2] ?? m[3] ?? '';
    const hasState = /\bstate-\$\{|\bstate-(?:live|unarmed|expired|unowned|none)\b/.test(body);
    const hasVerdict = /\b(?:yes|no|reason)\b/.test(body);
    if (hasState && hasVerdict) {
      const line = src.slice(0, m.index).split('\n').length;
      failures.push(
        `R6 at ${rel(file)}:${line} mixes a policy-state class with a verdict class in one className — .yes/.no mean a kernel decision, which policy state is not`,
      );
    }
  }
}

if (failures.length === 0) {
  console.log('\nclean — colours are tokens, spacing is on scale, verdicts stay verdicts.');
  process.exit(0);
}
console.error(`\n${failures.length} violation(s):`);
for (const f of failures) console.error('  ' + f);
process.exit(1);
