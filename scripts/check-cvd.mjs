#!/usr/bin/env node
/**
 * Colour-vision-deficiency check for the Terading palette.
 *
 * WCAG 1.4.11 Non-text Contrast requires >= 3:1 for status indicators, and
 * 1.4.1 Use of Color forbids colour being the *only* cue. The standard
 * failure mode is exactly this product's: green = approved, red = denied,
 * orange = price down. Protanopia and deuteranopia collapse
 * green/red/orange into one cone response, so those three can collide.
 *
 * A CVD collapse does not by itself fail 1.4.1; only colour-alone coding
 * does. This tells you WHERE redundancy has to live. That is a design
 * decision, not a number.
 *
 * The matrices and the maths live in `scripts/lib/cvd.mjs` so that
 * `render-design-sheet.mjs` can render the same simulation into the
 * judge-facing sheet. One measurement, two consumers.
 *
 *   node scripts/check-cvd.mjs
 */
import { analyseAll, contrast, readTokens, toRgb } from './lib/cvd.mjs';

const tok = readTokens();

const results = analyseAll(tok);
let collisions = 0;
const warnings = [];

for (const pair of results) {
  console.log('\n' + pair.a + ' ' + tok[pair.a] + '  vs  ' + pair.b + ' ' + tok[pair.b]);
  console.log('  ' + pair.why);
  console.log(
    '  normal vision   dE ' + pair.normal.de.toFixed(1).padStart(6) +
      '   contrast ' + pair.normal.contrast.toFixed(2) + ':1',
  );
  for (const s of pair.simulated) {
    if (s.grade !== 'ok') {
      collisions += s.grade === 'COLLIDE' ? 1 : 0;
      warnings.push(
        s.name + ': ' + pair.a + ' vs ' + pair.b + ' -> ' + s.grade +
          ' (dE ' + s.de.toFixed(1) + ', ' + s.contrast.toFixed(2) + ':1)',
      );
    }
    console.log(
      '  ' + s.name.padEnd(14) + ' dE ' + s.de.toFixed(1).padStart(6) +
        '   contrast ' + s.contrast.toFixed(2).padStart(5) + ':1   ' + s.grade,
    );
  }
}

console.log('\n' + '='.repeat(72));
if (collisions === 0) {
  console.log('No pair collapses under any simulated deficiency.');
} else {
  console.log(collisions + ' pair/collision(s) - colour alone cannot carry these meanings.');
  console.log('Each needs a redundant cue: text, glyph, shape or position.');
}
for (const w of warnings) console.log('  ' + w);
console.log('='.repeat(72));
console.log('\nNon-text contrast (WCAG 1.4.11) needs 3:1 against adjacent colour:');

let low = 0;
for (const t of ['--ok', '--no', '--warn', '--viz-up', '--viz-down']) {
  if (!tok[t]) continue;
  const c = contrast(toRgb(tok[t]), toRgb(tok['--panel']));
  if (c < 3) low += 1;
  console.log('  ' + t.padEnd(12) + ' ' + tok[t] + '  ' + c.toFixed(2) + ':1 on --panel  ' + (c >= 3 ? 'ok' : 'FAILS 1.4.11'));
}
// Exit policy, deliberately split:
//   Blocking  - WCAG 1.4.11 non-text contrast. A fixable defect with a hard
//               threshold, so it must fail the build.
//   Advisory  - a dE collision. This is a property of the palette, not a bug:
//               achromatopsia will always collapse teal against green, because
//               both sit in the same lightness band. Failing CI on it would
//               train the team to ignore the check. WCAG 1.4.1 is satisfied by
//               the redundant glyphs, and R5 in check-tokens.mjs enforces that
//               they exist.
const blocking = low;
if (collisions > 0) {
  console.log('\nADVISORY: colour alone is insufficient for these pairs.');
  console.log('Satisfied by redundant glyphs, enforced by rule R5 in check-tokens.mjs.');
  console.log('Rendered, not just asserted, in artifacts/design-sheet.html §6.');
}
process.exit(blocking === 0 ? 0 : 1);
