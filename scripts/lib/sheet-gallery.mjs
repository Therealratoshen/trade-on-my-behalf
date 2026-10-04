/**
 * The design sheet's component gallery.
 *
 * The requirement (A1) is the *real rendered markup* — the actual class
 * names and the actual token bindings — so a judge can read the DOM shape
 * and the colour mapping without running anything, and so a claim like
 * "long is deliberately neutral" is checkable by grep rather than taken on
 * trust.
 *
 * Each entry names the source file it mirrors. The numbers are illustrative
 * and labelled as such in the copy; the *structure* is the point.
 */
const g = (n, title, from, why, html, note) => ({ n, title, from, why, html, note });

export const GALLERY = [
  g(
    '2.1',
    'Verdict badge &mdash; the kernel&rsquo;s answer',
    'components/AuditPanel.tsx',
    'The only element allowed to wear --ok / --no. Glyph plus word, so the verdict survives achromatopsia, where this pair sits at &Delta;E 19.2 apart.',
    `<span class="badge yes"><span aria-hidden="true">&#9650;</span> APPROVED</span>
<span class="badge no"><span aria-hidden="true">&#9632;</span> DENIED</span>
<span class="badge reason">REASON_LEVERAGE_CAP</span>
<span class="badge mute">MUTED</span>`,
  ),
  g(
    '2.2',
    'Position side &mdash; intent, not a verdict',
    'components/PositionsPanel.tsx',
    'LONG used to render in approval green, one screen away from APPROVED. Neutral, with a &#9650;/&#9660; arrow. Guard rule R3b fails the build if that ever regresses.',
    `<span class="badge side-long"><span aria-hidden="true">&#9650;</span> LONG</span>
<span class="badge side-short"><span aria-hidden="true">&#9660;</span> SHORT</span>`,
  ),
  g(
    '2.3',
    'Market badge &amp; P&amp;L &mdash; teal/orange, never green',
    'components/PositionsPanel.tsx, MarketChart.tsx',
    'A rising candle is not an approval. --viz-up / --viz-down exist so price data never has to borrow the decision palette.',
    `<span class="badge up">&#9650; +12.40%</span>
<span class="badge down">&#9660; &minus;7.90%</span>
<span class="num pos">&#9650; +$48.20</span>
<span class="num neg">&#9660; &minus;$12.05</span>`,
  ),
  g(
    '2.4',
    'Policy state &mdash; the account, not a decision',
    'components/PolicyState.tsx',
    'New in this pass. &ldquo;LIVE&rdquo; is not a verdict the kernel issued, so it wears no decision colour &mdash; weight and a glyph only. UNARMED exists because a fresh policy has <span class="mono">peak_equity = 0</span>, so its drawdown switch genuinely cannot fire until the first <span class="mono">record_pnl</span>. Without it, a tester reads a working switch as a broken one.',
    `<span class="state state-live"><span class="glyph">&#9679;</span> <b>LIVE</b></span>
<span class="state state-unarmed"><span class="glyph">&#9675;</span> <b>UNARMED</b></span>
<span class="state state-expired"><span class="glyph">&#9675;</span> <b>EXPIRED</b></span>
<span class="state state-unowned"><span class="glyph">&#9675;</span> <b>READ-ONLY</b></span>
<span class="state state-none"><span class="glyph">&middot;</span> <b>NO POLICY</b></span>`,
    '<div class="state-note">peak equity is 0, so the drawdown switch has nothing to compare against. It arms on the first record_pnl.</div>',
  ),
  g(
    '2.5',
    'Mode strip &mdash; the honesty strip',
    'components/ModeStrip.tsx',
    'PAPER must never read as a live fill. The state chip sits beside the cluster, so a reader gets &ldquo;which chain, and in what state&rdquo; in one glance without scrolling.',
    `<span class="mode"><span class="dot"></span>Policy <b>devnet</b></span>
<span class="state state-live"><span class="glyph">&#9679;</span> <b>LIVE</b></span>
<span class="mode paper"><span class="dot"></span>Positions <b>PAPER</b></span>
<span class="mode">Fills <b>simulated</b></span>`,
  ),
  g(
    '2.6',
    'Price readout &amp; provenance strip',
    'components/MarketChart.tsx',
    'Every number a judge reads says where it came from and how old it is, or it is decoration. &ldquo;spot price &middot; not a fill&rdquo; is load-bearing: the chart draws only prices this tab actually fetched, and says so rather than implying a market history.',
    `<div class="market-id"><span class="sym">SOL-PERP</span><span class="venue">Jupiter perps &middot; reference spot</span></div>
<div class="price-readout"><span class="px">184.27</span>
<span class="chg up"><span aria-hidden="true">&#9650;</span> +2.14 (+1.17%)</span></div>
<div class="provenance"><span>source jupiter lite-api v3</span><span class="sep"></span>
<span>spot price &middot; not a fill</span><span class="sep"></span>
<span>12 obs this session</span><span class="sep"></span><span class="fresh">as of 4s ago</span></div>`,
  ),
  g('2.7', 'Chart frame &amp; the accessible table', 'components/MarketChart.tsx', 'BUILD', null, null),
  g(
    '2.8',
    'Trade ticket &mdash; preview only',
    'components/TradeTicket.tsx',
    'Long/short wear --accent, because a side is market intent. A blocked ticket always names its blocker: a disabled control with no explanation reads as a broken app, and a disabled control that names its blocker is a feature.',
    `<section class="ticket">
<header><h2>Trade ticket</h2><div class="spacer"></div><span class="pill">preview only</span></header>
<div class="body">
<div class="side-toggle" role="group" aria-label="Side">
<button type="button" aria-pressed="true"><span aria-hidden="true">&#9650;</span> Long</button>
<button type="button" aria-pressed="false"><span aria-hidden="true">&#9660;</span> Short</button>
</div>
<div class="quote-lines">
<div class="quote-line"><span class="k">Modelled notional</span><span class="v">$120.00</span></div>
<div class="quote-line"><span class="k">Policy cap / trade</span><span class="v">$50.00</span></div>
<div class="quote-line total"><span class="k">Modelled cost</span><span class="v">$0.12</span></div>
</div>
<p class="ticket-blocked" role="status"><span aria-hidden="true">&#9650;</span><span>Over the per-trade cap ($50.00). The runtime clamps to the cap.</span></p>
</div></section>`,
  ),
  g(
    '2.9',
    'Empty state &mdash; a dead end is a bug',
    'components/ui.tsx',
    'Every empty panel says what to do next and names the command. &ldquo;No decisions recorded yet&rdquo; tells a tester nothing; &ldquo;run pnpm demo&rdquo; tells them what to do.',
    `<div class="empty"><strong>No decisions recorded yet.</strong>
Run the demo, or push an intent from the CLI, and every verdict the kernel records for this policy
lands here within a couple of seconds.
<code class="cmd">pnpm demo        # or: pnpm --filter @trade-on-my-behalf/agent tomb push-intent</code></div>`,
  ),
  g('2.10', 'The claim boundary &mdash; what this is not', 'components/ClaimBoundary.tsx', 'BUILD', null, null),
];

/** 2.7 and 2.10 need token values at generation time, so they build late. */
export function chartFrameHtml(tok) {
  return `<div class="chart-frame"><svg viewBox="0 0 720 220" role="img" aria-label="SOL-PERP reference spot, 12 observations this session">
<g class="chart-grid"><line x1="10" y1="60" x2="660" y2="60"></line><line x1="10" y1="120" x2="660" y2="120"></line><line x1="10" y1="180" x2="660" y2="180"></line></g>
<path class="chart-area" d="M10 200 L100 170 L200 186 L300 140 L400 152 L500 96 L600 74 L660 60 L660 198 L10 198 Z"></path>
<path class="chart-line" d="M10 200 L100 170 L200 186 L300 140 L400 152 L500 96 L600 74 L660 60"></path>
<g class="chart-axis"><text x="666" y="63" text-anchor="end">184.27</text><text x="666" y="123" text-anchor="end">178.40</text><text x="666" y="183" text-anchor="end">172.60</text></g>
<circle class="chart-candle up" cx="600" cy="74" r="3"></circle>
</svg></div>
<table class="chart-alt"><caption>SOL-PERP &mdash; the same numbers the line above uses, readable without it.</caption>
<thead><tr><th scope="col">Observed</th><th scope="col">Spot</th><th scope="col">Change</th></tr></thead>
<tbody>
<tr><td>10:41:02</td><td>184.27</td><td class="dir" style="color:${tok['--viz-up']}">&#9650; +0.71</td></tr>
<tr><td>10:40:47</td><td>183.56</td><td class="dir" style="color:${tok['--viz-down']}">&#9660; &minus;1.19</td></tr>
<tr><td>10:40:32</td><td>184.75</td><td class="dir" style="color:${tok['--viz-up']}">&#9650; +0.22</td></tr>
</tbody></table>`;
}

export function claimHtml() {
  return `<div class="claim">
  <div class="claim-k">the claim, and its edge</div>
  <div class="claim-line"><span class="mark">&#10003;</span><span>Your caps live on chain at
    <b>[b&quot;policy&quot;, wallet]</b>. Only your key can change them.</span></div>
  <div class="claim-line is-not"><span class="mark">&#10005;</span><span>Your trades are bound by them.</span></div>
  <div class="claim-absent"><b>Recorded, not enforced.</b> The program holds no keys and custodies nothing, so
    it cannot call a venue. Anyone with a key can still trade without ever asking it, and would leave no row in
    the audit log. What the log proves is that a decision was made and recorded &mdash; not that a trade was
    prevented. This is also why the state vocabulary in 2.4 is deliberately not green.</div>
</div>`;
}

const WHY_CHART =
  'The line is --accent, not teal: it is one series with no direction encoded, and the readout beside it carries the direction. Below it, the same numbers as a real table &mdash; a chart you cannot see is still fully readable. The figures are illustrative; the structure is what the component enforces.';

const WHY_CLAIM =
  'The A3 primitive. Six claims were cut from the pitch after the program source was read. This states the surviving one and the removed one in the same type, so they are read together and neither can be quoted alone. It wears no decision colour, because the kernel never evaluated the product&rsquo;s honesty.';

/** Fill in the two entries that need generated markup. */
export function resolveGallery(tok) {
  return GALLERY.map((e) => {
    if (e.n === '2.7') return { ...e, why: WHY_CHART, html: chartFrameHtml(tok) };
    if (e.n === '2.10') return { ...e, why: WHY_CLAIM, html: claimHtml(tok) };
    return e;
  });
}
