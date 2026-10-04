/**
 * Colour-vision math, shared by `check-cvd.mjs` and `render-design-sheet.mjs`.
 *
 * One source of truth on purpose. The previous arrangement copied the
 * Machado matrices into the design-sheet generator, which meant the sheet's
 * CVD section could report numbers the CI check no longer agreed with. A
 * judge-facing artifact that quotes a stale matrix is worse than no artifact:
 * it would be a measurement asserted rather than measured.
 *
 * Matrices: Machado, Oliveira & Fernandes (2009), severity 1.0 — the model
 * behind Coblis and the peer-reviewed simulators.
 *
 * No dependencies. A guard that can fail to install is not a guard, and the
 * design sheet has to be regenerable with a bare `node`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const CSS_PATH = join(REPO_ROOT, 'apps/dashboard/app/globals.css');

/** Machado et al. 2009, severity 1.0. Order matters: red, green, blue rows. */
export const CVD_MATRICES = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
  achromatopsia: Array.from({ length: 3 }, () => [0.299, 0.587, 0.114]),
};

/** Human labels for the four simulations, for prose in generated artifacts. */
export const CVD_LABELS = {
  protanopia: 'protanopia (no L-cones)',
  deuteranopia: 'deuteranopia (no M-cones)',
  tritanopia: 'tritanopia (no S-cones)',
  achromatopsia: 'achromatopsia (no colour)',
};

/** dE below this is a collision; below 20 is a weak separation. */
export const MIN_DELTA_E = 10;
export const WEAK_DELTA_E = 20;

/**
 * Every `--token: value` in `:root`.
 *
 * Comments are stripped from the *whole file first*, not from the captured
 * value afterwards. The old order had a live bug: `:root` contains
 *
 *     Contrast vs --panel: teal 9.12:1, orange 6.90:1.
 *
 * which is prose inside a slash-star comment but parses perfectly well as
 * a `--panel: teal 9.12:1, orange 6.90:1.` declaration to a
 * `(--x)\s*:\s*([^;]+)` regex. The generated design sheet was publishing
 * `--panel` as that string, so every "contrast on --panel" figure in the
 * sheet was computed against garbage and `check-cvd.mjs` reported `NaN:1`.
 */
export function readTokens(cssPath = CSS_PATH) {
  const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rootBlock = (css.match(/:root\s*\{([^}]*)\}/) ?? [, ''])[1];
  const tok = {};
  for (const m of rootBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tok[m[1]] = m[2].trim();
  }
  return tok;
}

/** `#rgb` / `#rrggbb` -> `[r, g, b]`. */
export function toRgb(hex) {
  const n = hex.replace('#', '');
  const f = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}

export function toHex([r, g, b]) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Project an RGB triple through a Machado matrix. */
export function simulate(rgb, matrix) {
  return matrix.map((row) =>
    Math.min(255, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])),
  );
}

export function luminance(c) {
  const f = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}

export function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function lab(c) {
  const f = c.map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const [x, y, z] = [0, 1, 2].map(
    (i) => (f[i] + [0.4124, 0.3576, 0.1805][i]) / [0.2126, 0.7152, 0.0722][i],
  );
  const g = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * g(y) - 16, 500 * (g(x) - g(y)), 200 * (g(y) - g(z))];
}

/** CIE76 delta-E. Same metric `check-cvd.mjs` has always reported. */
export function deltaE(a, b) {
  const A = lab(a);
  const B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

export function grade(de) {
  return de < MIN_DELTA_E ? 'COLLIDE' : de < WEAK_DELTA_E ? 'weak' : 'ok';
}

/**
 * The pairs that must stay distinguishable, and why each one matters.
 * Shared so the CI check and the judge-facing sheet screen the same things.
 */
export const CRITICAL_PAIRS = [
  { a: '--ok', b: '--no', why: "approved vs denied — the product's whole claim" },
  { a: '--ok', b: '--viz-up', why: 'a verdict must not look like price movement' },
  { a: '--no', b: '--viz-down', why: 'a denial must not look like a falling price' },
  { a: '--viz-up', b: '--viz-down', why: 'price up vs price down' },
  { a: '--warn', b: '--viz-up', why: 'clamped vs price rise' },
];

/** The tokens rendered in the sheet's simulated-vision section. */
export const SIMULATED_SWATCHES = [
  ['--ok', '▲ APPROVED — the kernel approved'],
  ['--no', '■ DENIED — the kernel denied'],
  ['--warn', 'REASON_LEVERAGE_CAP — clamped'],
  ['--viz-up', '▲ price rose / P&L up'],
  ['--viz-down', '▼ price fell / P&L down'],
  ['--accent', 'interactive / focus only'],
];

/**
 * Every measured number for one token pair, under every simulation.
 * Returned rather than printed, so two consumers cannot disagree.
 */
export function analysePair(pair, tok) {
  if (!tok[pair.a] || !tok[pair.b]) return null;
  const ca = toRgb(tok[pair.a]);
  const cb = toRgb(tok[pair.b]);
  return {
    ...pair,
    normal: { de: deltaE(ca, cb), contrast: contrast(ca, cb) },
    simulated: Object.entries(CVD_MATRICES).map(([name, matrix]) => {
      const sa = simulate(ca, matrix);
      const sb = simulate(cb, matrix);
      const de = deltaE(sa, sb);
      return { name, de, contrast: contrast(sa, sb), grade: grade(de) };
    }),
  };
}

/** Every critical pair, measured. */
export function analyseAll(tok) {
  return CRITICAL_PAIRS.map((p) => analysePair(p, tok)).filter(Boolean);
}
