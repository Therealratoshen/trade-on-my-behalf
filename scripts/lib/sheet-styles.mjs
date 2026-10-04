/**
 * The design sheet's own stylesheet, generated from `:root`.
 *
 * Kept in its own module so the generator stays readable. Every value that
 * can be a token is read out of `tok` — this file contains no hex of its
 * own, so the sheet cannot drift from the palette it documents. The
 * component rules are a faithful mirror of the corresponding rules in
 * `globals.css`; if one changes, the other should, and R1/R2 keep both
 * honest in the meantime.
 */
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** `var(--x)` resolved to its literal value, so the standalone sheet needs no :root. */
const t = (tok, name, fallback) => {
  const v = tok[name];
  return v ? esc(v) : `var(${name}${fallback ? ', ' + fallback : ''})`;
};

export function sheetCss(tok) {
  return `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:${t(tok, '--bg')};color:${t(tok, '--fg')};
  font-family:${t(tok, '--sans')};font-size:${t(tok, '--t-md')};line-height:1.5;
  padding:${t(tok, '--s6')} ${t(tok, '--s5')} ${t(tok, '--s10')}}
.wrap{max-width:1120px;margin:0 auto}
h1{font-size:${t(tok, '--t-2xl')};margin:0 0 ${t(tok, '--s1')};letter-spacing:-0.02em}
h2{font-size:${t(tok, '--t-base')};text-transform:uppercase;letter-spacing:.02em;margin:0}
h3{font-size:${t(tok, '--t-md')};margin:0}
p.lede{color:${t(tok, '--fg-dim')};max-width:74ch;margin:${t(tok, '--s1')} 0 0}
.mono{font-family:${t(tok, '--mono')}}
.dim{color:${t(tok, '--fg-dim')}}
.faint{color:${t(tok, '--fg-faint')}}
.bad{color:${t(tok, '--no')}}
.tiny{font-size:${t(tok, '--t-xs')}}
a{color:${t(tok, '--accent')}}
section{background:${t(tok, '--panel')};border:1px solid ${t(tok, '--line')};
  border-radius:${t(tok, '--r-lg')};margin:${t(tok, '--s5')} 0;overflow:hidden}
header.bar{display:flex;align-items:center;gap:${t(tok, '--s3')};padding:${t(tok, '--s3')} ${t(tok, '--s4')};
  background:${t(tok, '--panel-2')};border-bottom:1px solid ${t(tok, '--line-soft')}}
header.bar .n{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};color:${t(tok, '--fg-faint')}}
.body{padding:${t(tok, '--s4')}}
table{width:100%;border-collapse:collapse;font-size:${t(tok, '--t-sm')}}
th{text-align:left;font-size:${t(tok, '--t-xs')};text-transform:uppercase;letter-spacing:.06em;
  color:${t(tok, '--fg-faint')};font-weight:600;padding:${t(tok, '--s2')};
  border-bottom:1px solid ${t(tok, '--line-soft')}}
td{padding:${t(tok, '--s2')};border-bottom:1px solid ${t(tok, '--line-soft')};vertical-align:middle}
.sw{display:inline-block;width:22px;height:22px;border-radius:${t(tok, '--r-sm')};
  border:1px solid ${t(tok, '--line')};vertical-align:middle}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:${t(tok, '--s3')}}
.sw-card{border:1px solid ${t(tok, '--line-soft')};border-radius:${t(tok, '--r-md')};
  padding:${t(tok, '--s2')};background:${t(tok, '--bg-inset')}}
.sw-big{height:52px;border-radius:${t(tok, '--r-sm')};margin-bottom:${t(tok, '--s2')};
  border:1px solid ${t(tok, '--line-soft')}}
@media(max-width:820px){.split{grid-template-columns:1fr}.lrow{grid-template-columns:1fr}}
.split{display:grid;grid-template-columns:1fr 1fr;gap:${t(tok, '--s5')}}

.prov{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};color:${t(tok, '--fg-faint')};
  border:1px solid ${t(tok, '--line-soft')};border-radius:${t(tok, '--r-md')};
  background:${t(tok, '--bg-inset')};padding:${t(tok, '--s3')};margin-top:${t(tok, '--s4')}}
.prov b{color:${t(tok, '--fg-dim')};font-weight:600}
.tag{display:inline-block;font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-xs')};
  border:1px solid ${t(tok, '--line')};border-radius:${t(tok, '--r-sm')};
  padding:0 ${t(tok, '--s2')};color:${t(tok, '--fg-dim')};margin-left:${t(tok, '--s2')}}
.tag.dirty{border-color:${t(tok, '--warn-line')};background:${t(tok, '--warn-wash')};color:${t(tok, '--warn')}}

.legend{display:grid;gap:${t(tok, '--s3')}}
.lrow{display:grid;grid-template-columns:150px 1fr;gap:${t(tok, '--s4')};align-items:start;
  padding:${t(tok, '--s3')};border:1px solid ${t(tok, '--line-soft')};
  border-radius:${t(tok, '--r-md')};background:${t(tok, '--bg-inset')}}
.lrow .ln{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};color:${t(tok, '--fg')}}
.lrow .ld{font-size:${t(tok, '--t-base')};color:${t(tok, '--fg-dim')}}
.lrow .allow{color:${t(tok, '--fg')};font-weight:600;display:block;margin-top:${t(tok, '--s1')}}
.lrow .deny{color:${t(tok, '--fg-faint')};display:block;margin-top:2px}

.gal{border:1px solid ${t(tok, '--line-soft')};border-radius:${t(tok, '--r-md')};
  margin-bottom:${t(tok, '--s5')};overflow:hidden}
.gal-h{display:flex;align-items:baseline;gap:${t(tok, '--s3')};flex-wrap:wrap;
  padding:${t(tok, '--s3')} ${t(tok, '--s4')};background:${t(tok, '--panel-2')};
  border-bottom:1px solid ${t(tok, '--line-soft')}}
.gal-h .n{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};color:${t(tok, '--accent')}}
.gal-h .src{margin-left:auto;font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-xs')};
  color:${t(tok, '--fg-faint')}}
.gal .why{margin:0;padding:${t(tok, '--s3')} ${t(tok, '--s4')} 0;color:${t(tok, '--fg-dim')};
  font-size:${t(tok, '--t-sm')};max-width:86ch}
.stage{padding:${t(tok, '--s4')};background:${t(tok, '--bg')}}
.stage-note{padding-top:0;background:${t(tok, '--bg')}}

.cvd-wrap{display:grid;grid-template-columns:repeat(2,1fr);gap:${t(tok, '--s4')}}
@media(max-width:900px){.cvd-wrap{grid-template-columns:1fr}}
.cvd-col{border:1px solid ${t(tok, '--line-soft')};border-radius:${t(tok, '--r-md')};overflow:hidden}
.cvd-h{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};padding:${t(tok, '--s2')} ${t(tok, '--s3')};
  background:${t(tok, '--panel-2')};color:${t(tok, '--fg')};border-bottom:1px solid ${t(tok, '--line-soft')}}
.cvd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:${t(tok, '--s2')};padding:${t(tok, '--s3')}}
.cvd-card{border:1px solid ${t(tok, '--line-soft')};border-radius:${t(tok, '--r-sm')};
  padding:${t(tok, '--s2')};background:${t(tok, '--bg-inset')}}
.cvd-big{height:40px;border-radius:${t(tok, '--r-sm')};margin-bottom:${t(tok, '--s1')};
  border:1px solid ${t(tok, '--line-soft')}}
td.collide{color:${t(tok, '--no')};font-weight:700}
td.weak{color:${t(tok, '--warn')};font-weight:600}
td.ok{color:${t(tok, '--fg-dim')}}

/* --- component rules, mirrored from globals.css --- */
.badge{display:inline-block;padding:1px ${t(tok, '--s2')};border-radius:${t(tok, '--r-sm')};
  font-size:${t(tok, '--t-sm')};font-weight:700;font-family:${t(tok, '--mono')};letter-spacing:.04em;
  margin:0 ${t(tok, '--s1')} ${t(tok, '--s1')} 0}
.badge.yes{background:${t(tok, '--ok-wash')};color:${t(tok, '--ok')};border:1px solid ${t(tok, '--ok-line')}}
.badge.no{background:${t(tok, '--no-wash')};color:${t(tok, '--no')};border:1px solid ${t(tok, '--no-line')}}
.badge.reason{background:${t(tok, '--warn-wash')};color:${t(tok, '--warn')};
  border:1px solid ${t(tok, '--warn-line')};font-weight:500}
.badge.mute{background:${t(tok, '--badge-bg')};color:${t(tok, '--fg-dim')};
  border:1px solid ${t(tok, '--line')};font-weight:500}
.badge.up{background:${t(tok, '--viz-up-wash')};color:${t(tok, '--viz-up')};
  border:1px solid ${t(tok, '--viz-up-wash')}}
.badge.down{background:${t(tok, '--viz-down-wash')};color:${t(tok, '--viz-down')};
  border:1px solid ${t(tok, '--viz-down-wash')}}
.badge.side-long{background:${t(tok, '--bg-inset')};color:${t(tok, '--fg')};
  border:1px solid ${t(tok, '--line-strong')};font-weight:500}
.badge.side-short{background:${t(tok, '--bg-inset')};color:${t(tok, '--fg-dim')};
  border:1px dashed ${t(tok, '--line-strong')};font-weight:500}
.state{display:inline-flex;align-items:center;gap:${t(tok, '--s2')};font-family:${t(tok, '--mono')};
  font-size:${t(tok, '--t-sm')};padding:${t(tok, '--s1')} ${t(tok, '--s3')};
  border-radius:${t(tok, '--r-pill')};border:1px solid ${t(tok, '--line')};background:${t(tok, '--panel')};
  color:${t(tok, '--fg-dim')};white-space:nowrap;margin:0 ${t(tok, '--s1')} ${t(tok, '--s1')} 0}
.state .glyph{color:${t(tok, '--fg-faint')};font-weight:700}
.state b{color:${t(tok, '--fg')};font-weight:600}
.state-live{border-color:${t(tok, '--state-line')};background:${t(tok, '--state-wash')}}
.state-live .glyph{color:${t(tok, '--accent')}}
.state-unarmed{border-style:dashed;border-color:${t(tok, '--line-focus')}}
.state-unarmed .glyph{color:${t(tok, '--fg-dim')}}
.state-expired,.state-unowned,.state-none{border-style:dotted;color:${t(tok, '--fg-faint')}}
.state-expired .glyph,.state-unowned .glyph,.state-none .glyph{color:${t(tok, '--fg-faint')}}
.state-note{color:${t(tok, '--fg-faint')};font-size:${t(tok, '--t-sm')};
  font-family:${t(tok, '--mono')};margin-top:${t(tok, '--s1')}}
.tier-verdict{border-left:3px solid ${t(tok, '--accent')}}
.tier-exposure{border-left:3px solid ${t(tok, '--line')}}
.tier-reference{border-left:3px solid transparent}
section.tier-verdict > header.bar{border-bottom-color:${t(tok, '--accent')}}
.mode-strip{display:flex;gap:${t(tok, '--s2')};flex-wrap:wrap;align-items:center;padding:${t(tok, '--s2')} 0}
.mode{display:inline-flex;align-items:center;gap:${t(tok, '--s2')};font-family:${t(tok, '--mono')};
  font-size:${t(tok, '--t-sm')};padding:${t(tok, '--s1')} ${t(tok, '--s3')};
  border-radius:${t(tok, '--r-pill')};border:1px solid ${t(tok, '--line')};background:${t(tok, '--panel')};
  color:${t(tok, '--fg-dim')}}
.mode b{color:${t(tok, '--fg')};font-weight:600}
.mode .dot{width:6px;height:6px;border-radius:50%;background:${t(tok, '--accent')}}
.mode.paper .dot{background:${t(tok, '--warn')}}
.mode.paper b{color:${t(tok, '--warn')}}
.market-id{display:flex;align-items:baseline;gap:${t(tok, '--s3')};margin-bottom:${t(tok, '--s1')}}
.market-id .sym{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-2xl')};font-weight:600;
  letter-spacing:-0.02em;color:${t(tok, '--fg')}}
.market-id .venue{font-size:${t(tok, '--t-sm')};color:${t(tok, '--fg-faint')};font-family:${t(tok, '--mono')}}
.price-readout{display:flex;align-items:baseline;gap:${t(tok, '--s3')};font-family:${t(tok, '--mono')}}
.price-readout .px{font-size:${t(tok, '--t-3xl')};font-weight:600;letter-spacing:-0.02em;color:${t(tok, '--fg')}}
.price-readout .chg{font-size:${t(tok, '--t-md')};font-weight:600}
.price-readout .chg.up{color:${t(tok, '--viz-up')}}
.price-readout .chg.down{color:${t(tok, '--viz-down')}}
.provenance{display:flex;align-items:center;gap:${t(tok, '--s2')};flex-wrap:wrap;margin-top:${t(tok, '--s2')};
  font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};color:${t(tok, '--fg-faint')}}
.provenance .sep{width:1px;height:${t(tok, '--s3')};background:${t(tok, '--line')}}
.provenance .fresh{color:${t(tok, '--fg-dim')}}
.chart-frame{position:relative;background:${t(tok, '--bg-inset')};border:1px solid ${t(tok, '--line-soft')};
  border-radius:${t(tok, '--r-md')};overflow:hidden}
.chart-frame svg{display:block;width:100%;height:auto}
.chart-grid line{stroke:${t(tok, '--viz-grid')};stroke-width:1}
.chart-axis text{fill:${t(tok, '--viz-axis')};font-family:${t(tok, '--mono')};font-size:10px}
.chart-line{fill:none;stroke:${t(tok, '--accent')};stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
.chart-area{fill:${t(tok, '--accent')};opacity:0.08}
.chart-candle.up{stroke:${t(tok, '--viz-up')};fill:${t(tok, '--viz-up')}}
.chart-alt{width:100%;border-collapse:collapse;font-family:${t(tok, '--mono')};
  font-size:${t(tok, '--t-sm')};margin-top:${t(tok, '--s3')}}
.chart-alt caption{text-align:left;font-family:${t(tok, '--sans')};font-size:${t(tok, '--t-sm')};
  color:${t(tok, '--fg-faint')};padding-bottom:${t(tok, '--s2')}}
.chart-alt th,.chart-alt td{padding:${t(tok, '--s1')} ${t(tok, '--s2')};
  border-bottom:1px solid ${t(tok, '--line-soft')};text-align:right}
.chart-alt th:first-child,.chart-alt td:first-child{text-align:left}
.chart-alt .dir{text-align:left;font-weight:600}
.ticket{background:${t(tok, '--panel')};border:1px solid ${t(tok, '--line')};
  border-radius:${t(tok, '--r-lg')};overflow:hidden;max-width:420px}
.ticket > header{display:flex;align-items:center;gap:${t(tok, '--s2')};
  padding:${t(tok, '--s3')} ${t(tok, '--s4')};background:${t(tok, '--panel-2')};
  border-bottom:1px solid ${t(tok, '--line-soft')}}
.ticket > header h2{margin:0;font-size:${t(tok, '--t-base')};font-weight:600;letter-spacing:.02em;
  text-transform:uppercase}
.ticket .body{padding:${t(tok, '--s4')}}
.spacer{flex:1}
.pill{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')};border:1px solid ${t(tok, '--line')};
  border-radius:${t(tok, '--r-pill')};padding:${t(tok, '--s1')} ${t(tok, '--s3')};
  color:${t(tok, '--fg-dim')};background:${t(tok, '--panel')};white-space:nowrap}
.side-toggle{display:grid;grid-template-columns:1fr 1fr;gap:${t(tok, '--s2')};margin-bottom:${t(tok, '--s4')}}
.side-toggle button{font:inherit;font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-base')};
  font-weight:600;padding:${t(tok, '--s2')};border-radius:${t(tok, '--r-md')};
  border:1px solid ${t(tok, '--line')};background:${t(tok, '--bg-inset')};color:${t(tok, '--fg-dim')};
  text-transform:uppercase;letter-spacing:.04em}
.side-toggle button[aria-pressed='true']{background:${t(tok, '--accent')};border-color:${t(tok, '--accent')};
  color:${t(tok, '--fg-on-accent')}}
.quote-lines{border-top:1px solid ${t(tok, '--line-soft')};margin-top:${t(tok, '--s4')};
  padding-top:${t(tok, '--s3')}}
.quote-line{display:flex;align-items:baseline;justify-content:space-between;gap:${t(tok, '--s3')};
  padding:${t(tok, '--s1')} 0;font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-sm')}}
.quote-line .k{color:${t(tok, '--fg-faint')};text-transform:uppercase;letter-spacing:.05em;
  font-size:${t(tok, '--t-xs')}}
.quote-line .v{color:${t(tok, '--fg')};text-align:right}
.quote-line.total{border-top:1px solid ${t(tok, '--line-soft')};margin-top:${t(tok, '--s1')};
  padding-top:${t(tok, '--s2')}}
.quote-line.total .v{font-size:${t(tok, '--t-lg')};font-weight:600}
.ticket-blocked{display:flex;align-items:flex-start;gap:${t(tok, '--s2')};margin-top:${t(tok, '--s3')};
  padding:${t(tok, '--s2')} ${t(tok, '--s3')};border-radius:${t(tok, '--r-md')};
  border:1px solid ${t(tok, '--warn-line')};background:${t(tok, '--warn-wash')};color:${t(tok, '--warn')};
  font-size:${t(tok, '--t-sm')};font-family:${t(tok, '--mono')};text-align:left}
.empty{padding:${t(tok, '--s7')} ${t(tok, '--s4')};text-align:center;color:${t(tok, '--fg-dim')};
  border:1px solid ${t(tok, '--line-soft')};border-radius:${t(tok, '--r-md')}}
.empty strong{display:block;color:${t(tok, '--fg')};margin-bottom:${t(tok, '--s2')};
  font-size:${t(tok, '--t-md')}}
code.cmd,code{font-family:${t(tok, '--mono')};background:${t(tok, '--bg-inset')};
  border:1px solid ${t(tok, '--line')};border-radius:${t(tok, '--r-sm')};
  padding:1px ${t(tok, '--s2')};font-size:${t(tok, '--t-sm')};color:${t(tok, '--fg')}}
code.cmd{display:inline-block;margin-top:${t(tok, '--s2')};user-select:all}
.claim{border:1px solid ${t(tok, '--line')};border-left:2px solid ${t(tok, '--state-line')};
  border-radius:${t(tok, '--r-md')};background:${t(tok, '--bg-inset')};
  padding:${t(tok, '--s3')} ${t(tok, '--s4')}}
.claim .claim-k{font-family:${t(tok, '--mono')};font-size:${t(tok, '--t-xs')};text-transform:uppercase;
  letter-spacing:.06em;color:${t(tok, '--fg-faint')}}
.claim .claim-line{display:flex;align-items:baseline;gap:${t(tok, '--s2')};font-family:${t(tok, '--mono')};
  font-size:${t(tok, '--t-base')};color:${t(tok, '--fg')};margin-top:${t(tok, '--s1')}}
.claim .claim-line .mark{color:${t(tok, '--fg-faint')};flex:none}
.claim .claim-line.is-not{color:${t(tok, '--fg-faint')};text-decoration:line-through;
  text-decoration-color:${t(tok, '--line-focus')}}
.claim .claim-absent{color:${t(tok, '--fg-dim')};font-size:${t(tok, '--t-sm')};margin-top:${t(tok, '--s2')}}
.claim .claim-absent b{color:${t(tok, '--fg')};font-weight:600}
.num{font-family:${t(tok, '--mono')}}
.pos{color:${t(tok, '--viz-up')}}.neg{color:${t(tok, '--viz-down')}}
`.trim();
}
