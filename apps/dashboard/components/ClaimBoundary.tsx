/**
 * The claim boundary.
 *
 * Design pass 2 turned on the fact that six claims were removed from the
 * pitch after the source was read: the program holds no keys, custodies
 * nothing, contains no `invoke` / `invoke_signed` / `transfer`, and therefore
 * cannot bind a venue action. Removing the words from the docs was necessary
 * and not sufficient, because the *surface* still implied enforcement in
 * four places. This component is the standing correction, rendered where a
 * reader is deciding whether to believe the rest of the page.
 *
 * It is placed above the panels rather than buried in a footer, and it states
 * the limit in the same type as the fact, so the two are read together and
 * neither can be quoted alone.
 *
 * It wears no decision colour. Nothing here is a kernel verdict — the kernel
 * never evaluated the product's honesty.
 */
export function ClaimBoundary({ cluster }: { cluster: string }) {
  return (
    <section className="claim" aria-label="What this is, and what it is not">
      <div className="claim-k">the claim, and its edge</div>

      <div className="claim-line">
        <span className="mark" aria-hidden="true">
          ✓
        </span>
        <span>
          Your caps live on chain at <b>[b&quot;policy&quot;, wallet]</b> on {cluster}. Only your key can
          change them.
        </span>
      </div>

      <div className="claim-line is-not">
        <span className="mark" aria-hidden="true">
          ✕
        </span>
        <span>Your trades are bound by them.</span>
      </div>

      <div className="claim-absent">
        <b>Recorded, not enforced.</b> The program holds no keys and custodies nothing — it cannot call a
        venue. Anyone with a key can still trade without ever asking it, and would leave no row in the
        audit log. What the log proves is that a decision was <em>made and recorded</em>, not that a
        trade was <em>prevented</em>. Closing that gap is the next build.
      </div>
    </section>
  );
}
