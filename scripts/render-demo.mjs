#!/usr/bin/env node
/**
 * Renders artifacts/demo-run.txt into a static, self-contained HTML page.
 *
 * The demo is a terminal story. A judge skimming the README should be able
 * to see all nine steps, the reason codes, and the explorer links without
 * running anything. This turns the captured run into that.
 *
 * Input : artifacts/demo-run.txt   (stdout of `pnpm demo`)
 * Output: artifacts/demo-receipts.html
 *
 * Run:  node scripts/render-demo.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const raw = readFileSync(join(root, 'artifacts', 'demo-run.txt'), 'utf8');

// ---- strip pnpm preamble, ANSI, and the validator teardown noise -----------
const clean = raw
  .split('\n')
  .filter((l) => !/trade-on-my-behalf@0\.1\.0 demo/.test(l))
  .filter((l) => !/^\s*>?\s*bash scripts\/demo\.sh/.test(l))
  .filter((l) => !/Terminated: 15/.test(l))
  .filter((l) => !/mavis-trash:/.test(l))
  .filter((l) => !/^\s*$/.test(l))
  .join('\n')
  .replace(/\x1b\[[0-9;]*m/g, '');

// ---- split into steps on the `== N. ` headers ------------------------------
const lines = clean.split('\n');
const steps = [];
let current = null;
for (const line of lines) {
  const m = line.match(/^==\s*(.+?)\s*$/);
  if (m) {
    if (current) steps.push(current);
    current = { title: m[1], body: [] };
  } else if (current) {
    current.body.push(line);
  } else {
    current = { title: line.trim() || 'Preamble', body: [] };
  }
}
if (current) steps.push(current);

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Colour a line by what it says, so deny steps read red at a glance. */
function tone(line) {
  if (/DENIED|Unauthorized|error:/.test(line)) return 'deny';
  if (/APPROVED|policy created|policy updated/.test(line)) return 'allow';
  if (/^\s*receipt\s+https/.test(line)) return 'receipt';
  if (/^\s*clamped/.test(line)) return 'clamp';
  if (/^\s*uPnL/.test(line)) return 'pnl';
  if (/^\s*equity/.test(line)) return 'pnl';
  return 'plain';
}

function renderStep(s) {
  const body = s.body
    .map((l) => {
      const t = tone(l);
      // Make explorer links clickable.
      let html = esc(l.trim());
      html = html.replace(
        /(https:\/\/[^\s)]+)/g,
        (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/(\?|&amp;)cluster=.*$/, '')}</a>`
      );
      return `<div class="l ${t}">${html}</div>`;
    })
    .join('\n');
  return `
    <section class="step">
      <h2>${esc(s.title)}</h2>
      <pre>${body}</pre>
    </section>`;
}

const final = steps.find((s) => /Final on-chain policy/i.test(s.title));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Trade On My Behalf — demo receipts</title>
<style>
  /* Mirrors the token palette in apps/dashboard/app/globals.css. If you
     change one, change the other — they are the same product surface. */
  :root {
    --bg:#08090c; --bg-inset:#0c0f14; --panel:#101319; --panel-2:#161a22;
    --line:#232833; --line-soft:#1a1e27;
    --fg:#e6e9ef; --fg-dim:#8b93a4; --fg-faint:#5b6373;
    --ok:#3ddc97; --ok-fg:#a6f0cf; --no:#ff5c72; --no-fg:#ffb3be;
    --warn:#ffc857; --accent:#6f8bff; --receipt:#c98ff0; --pnl:#89ddff;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--bg); color:var(--fg);
    font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  }
  .wrap { max-width:940px; margin:0 auto; padding:40px 24px 64px; }
  h1 { font-size:20px; margin:0 0 4px; letter-spacing:-.01em; }
  .sub { color:var(--fg-dim); margin:0 0 4px; }
  .claim {
    border-left:3px solid var(--ok); padding:12px 18px; margin:24px 0 32px;
    background:var(--panel); border-radius:0 8px 8px 0; font-size:15px;
  }
  .claim b { color:var(--ok-fg); }
  .meta { color:var(--fg-dim); font-size:12px; margin-bottom:32px; }
  .meta code, .step pre { font-family:var(--mono,ui-monospace,SFMono-Regular,Menlo,monospace); }
  .meta code { background:var(--bg-inset); padding:2px 6px; border-radius:4px; }
  .step { background:var(--panel); border:1px solid var(--line-soft); border-radius:10px;
          margin-bottom:12px; overflow:hidden; }
  .step h2 { font-size:12px; margin:0; padding:11px 16px; border-bottom:1px solid var(--line-soft);
             color:var(--accent); font-weight:600; }
  .step pre { margin:0; padding:14px 16px; overflow-x:auto; font-size:12px; line-height:1.7; }
  .l { white-space:pre; }
  .l.allow { color:var(--ok); font-weight:600; }
  .l.deny  { color:var(--no); font-weight:600; }
  .l.receipt { color:var(--receipt); }
  .l.receipt a { color:var(--receipt); }
  .l.clamp { color:var(--warn); }
  .l.pnl { color:var(--pnl); }
  a { color:var(--accent); }
  .final { border-color:var(--line); }
  .final h2 { color:var(--ok); }
  footer { color:var(--fg-faint); font-size:11px; margin-top:32px; text-align:center; }
  footer code { font-family:var(--mono,ui-monospace,SFMono-Regular,Menlo,monospace); }
  /* ?only=final screenshots just the closing policy block */
  body.only-final .step:not(.final), body.only-final header, body.only-final footer { display:none; }
  body.only-final .wrap { padding-top:24px; }
</style>
</head>
<body>
  <div class="wrap">
   <header>
    <h1>Trade On My Behalf</h1>
    <p class="sub">On-chain risk-gated perps agent — every decision the kernel made, in order.</p>

    <div class="claim">
      <b>&ldquo;I cannot break your rules — within the as-stored caps.&rdquo;</b><br>
      The program, the policy, the audit events, and the reason codes below are real
      on-chain state. Only the fill is simulated.
    </div>

    <p class="meta">
      Captured from <code>pnpm demo</code> — a throwaway <code>solana-test-validator</code>
      with the program preloaded. No devnet SOL required.
      Program <code>4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph</code>.
    </p>

    ${steps.map(renderStep).join('\n')}
   </header>

    <footer>
      Reproduce with <code>pnpm demo</code> · full transcripts in
      <code>docs/demo-receipts.md</code> · rebuild this page with
      <code>node scripts/render-demo.mjs</code>
    </footer>
  </div>
<script>
  // ?only=final renders just the closing policy block (for a second image).
  if (new URLSearchParams(location.search).get('only') === 'final') {
    document.body.classList.add('only-final');
  }
</script>
</body>
</html>
`;

const out = join(root, 'artifacts', 'demo-receipts.html');
writeFileSync(out, html, 'utf8');
console.log(`wrote ${out}`);
console.log(`  ${steps.length} steps · ${html.length} bytes`);
