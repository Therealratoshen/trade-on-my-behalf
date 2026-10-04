'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import useSWR from 'swr';

import { CLUSTER } from '@/lib/cluster';
import { AuditFeed, fetchPolicy, makeProgram, samePolicySnapshot, stableKey, type AdapterWallet } from '@/lib/trader';
import type { PositionsResponse } from '@/app/api/positions/route';

import { AuditPanel } from './AuditPanel';
import { ClaimBoundary } from './ClaimBoundary';
import { ConnectPanel } from './ConnectPanel';
import { EditPolicyPanel } from './EditPolicyPanel';
import { MarketWorkspace } from './MarketWorkspace';
import { ModeStrip } from './ModeStrip';
import { PolicyPanel } from './PolicyPanel';
import { PolicyStateChip, derivePolicyState } from './PolicyState';
import { PositionsPanel } from './PositionsPanel';
import { Empty, Err } from './ui';

/** The refresh interval the D11 rubric checks: ~2s from CLI push to on screen. */
const AUDIT_POLL_MS = 2_000;
const POLICY_POLL_MS = 4_000;
const POSITIONS_POLL_MS = 5_000;

/**
 * Phantom's wallet is not a `Keypair`; adapt it to what `AnchorProvider` uses.
 *
 * The adapter leaves the signing strategies undefined until a wallet is
 * actually selected, so each one is checked at call time rather than here —
 * a stale-but-connected wallet should fail on the sign, not on the read.
 */
function useAnchorWallet(): AdapterWallet | null {
  const { publicKey, signTransaction, signAllTransactions, signMessage } = useWallet();
  return useMemo(() => {
    if (!publicKey) return null;
    const need = <T,>(fn: T | undefined, name: string): T => {
      if (typeof fn !== 'function') {
        throw new Error(`Wallet is not ready: ${name} is unavailable. Reconnect and retry.`);
      }
      return fn;
    };
    return {
      publicKey: new PublicKey(publicKey.toBase58()),
      signTransaction: (tx) => need(signTransaction, 'signTransaction')(tx),
      signAllTransactions: (txs) => need(signAllTransactions, 'signAllTransactions')(txs),
      signMessage: async (msg) =>
        (await need(signMessage, 'signMessage')(msg)) as Uint8Array,
    } as AdapterWallet;
  }, [publicKey, signTransaction, signAllTransactions, signMessage]);
}

async function fetchPositions(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return (await res.json()) as PositionsResponse | { ok: false; reason: string; positions: [] };
}

export function Dashboard() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();

  const pubkey = publicKey ? publicKey.toBase58() : null;

  const program = useMemo(
    () => (anchorWallet ? makeProgram(connection, anchorWallet) : null),
    [connection, anchorWallet],
  );

  const auditFeed = useMemo(
    () => (program ? new AuditFeed(connection, program) : null),
    [connection, program],
  );

  const agent = useMemo(() => (pubkey ? new PublicKey(pubkey) : null), [pubkey]);

  // ---- panel 2: the policy itself -----------------------------------------
  const policyKey = agent ? ['policy', CLUSTER, agent.toBase58()] : null;
  const {
    data: snapshot,
    error: policyError,
    isLoading: policyLoading,
    mutate: refreshPolicy,
  } = useSWR(policyKey, () => fetchPolicy(connection, agent!), {
    refreshInterval: POLICY_POLL_MS,
    // Compare a serialisation: the decoded policy holds PublicKey/BN
    // instances, and "always repaint" would spin the render loop.
    compare: samePolicySnapshot,
    revalidateOnFocus: true,
  });

  // ---- panel 3: the decision log ------------------------------------------
  const pda = snapshot?.pda ?? null;
  const auditKey = pda && auditFeed ? ['audit', CLUSTER, pda.toBase58()] : null;
  const {
    data: events,
    error: auditError,
    isLoading: auditLoading,
    isValidating: auditValidating,
    mutate: refreshAudit,
  } = useSWR(auditKey, () => auditFeed!.poll(pda!), {
    refreshInterval: AUDIT_POLL_MS,
    // Same reasoning as the policy: compare a serialisation, never "always
    // different".
    compare: (a, b) => stableKey(a) === stableKey(b),
    keepPreviousData: false,
  });

  // ---- panel 4: venue positions (local paper state, no wallet needed) -----
  const { data: positions, error: positionsError, isLoading: positionsLoading } = useSWR(
    '/api/positions',
    () => fetchPositions('/api/positions'),
    { refreshInterval: POSITIONS_POLL_MS, compare: (a, b) => stableKey(a) === stableKey(b) },
  );

  const policy = snapshot?.policy ?? null;
  const isOwner = Boolean(
    connected && publicKey && policy && policy.owner.toBase58() === publicKey.toBase58(),
  );

  /**
   * The chain's current slot, straight from `getSlot()`.
   *
   * The TTL is compared against `Clock::get().slot` on chain, so the only
   * honest input is a slot. The audit feed's block times cannot be converted
   * into one: slots elapsed since the unix epoch is not the chain's slot
   * number, and the gap is billions of slots — enough to make every policy
   * read EXPIRED. `getSlot` is one cheap call, so there is no reason to
   * guess. Null until the first answer, in which case `derivePolicyState`
   * declines to assert expiry rather than inventing it.
   */
  const currentSlot = useSWR(
    agent ? ['slot', CLUSTER, agent.toBase58()] : null,
    () => connection.getSlot('confirmed'),
    { refreshInterval: POLICY_POLL_MS, revalidateOnFocus: true },
  ).data ?? null;

  const policyState = derivePolicyState({
    policy,
    loaded: !policyLoading && !policyError,
    isOwner,
    currentSlot,
  });

  const notConnected = (
    <Empty title="Connect a wallet to read this policy.">
      The rules live on chain at{' '}
      <code className="mono">[b&quot;policy&quot;, your_wallet]</code>. This dashboard has no server-side key —
      it reads the account your wallet owns and shows you what the kernel has already recorded.
    </Empty>
  );

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Terading — Control Surface</h1>
        <p>
          A viewer and a rule editor. The on-chain kernel records every trade decision against the rules it
          holds, and this page shows you those rules and the receipts. It does not stop a trade — nothing
          here does. There is no approve button, by design.
        </p>
        <div className="tagline">“The kernel decides what it will record. The webapp shows you what it recorded.”</div>
      </header>

      <ModeStrip policyState={policyState} />

      <div style={{ marginBottom: 'var(--s5)' }}>
        <ClaimBoundary cluster={CLUSTER} />
      </div>

      {/* 0 — market workspace: reference price + trade ticket, both preview-only */}
      <MarketWorkspace policy={policy} walletConnected={connected} />

      {/* 0b — the local-only paper-practice concept. It is a different thing
          from the workspace above, so it says so rather than linking quietly:
          the workspace is wired to a real spot feed, this one is not. */}
      <section className="panel tier-reference">
        <header>
          <span className="n">0b</span>
          <h2>Paper practice</h2>
          <div className="spacer" />
          <span className="n">fictional fixtures · local only · no orders</span>
        </header>
        <div className="body">
          <p className="dim">
            A separate concept surface with invented market, depth and budget fixtures for checking an
            idea before spending anything. It makes no network, wallet or storage call, records no
            position and reports no PnL.
          </p>
          <div className="copyrow" style={{ marginTop: 'var(--s2)' }}>
            <Link href="/paper-practice">Open paper practice &rarr;</Link>
            <span className="faint mono">no signatures requested</span>
          </div>
        </div>
      </section>

      <ConnectPanel />

      {/* 2 — policy */}
      {!connected ? (
        <section className="panel">
          <header>
            <span className="n">2</span>
            <h2>Policy</h2>
          </header>
          {notConnected}
        </section>
      ) : policyLoading && !policy ? (
        <section className="panel">
          <header>
            <span className="n">2</span>
            <h2>Policy</h2>
          </header>
          <div className="empty">
            <span className="spin" /> deriving <code className="mono">[b&quot;policy&quot;, wallet]</code> and reading the account…
          </div>
        </section>
      ) : policyError ? (
        <section className="panel">
          <header>
            <span className="n">2</span>
            <h2>Policy</h2>
          </header>
          <div className="body">
            <Err>Could not read the policy account: {policyError.message}</Err>
            <div className="note" style={{ marginTop: 'var(--s3)' }}>
              The treasury program may not be deployed on <span className="mono">{CLUSTER}</span>. Try{' '}
              <code className="mono">pnpm devnet:demo</code>, or point{' '}
              <code className="mono">NEXT_PUBLIC_CLUSTER</code> at a cluster that has it.
            </div>
          </div>
        </section>
      ) : !policy ? (
        <section className="panel">
          <header>
            <span className="n">2</span>
            <h2>Policy</h2>
          </header>
          <Empty
            title="No policy yet."
            command="pnpm --filter @trade-on-my-behalf/agent tomb init-policy --owner <owner.json> --agent <agent.json> --per-tx 50 --per-day 150 --max-leverage 5 --kill-pct 25"
          >
            No account exists at the PDA above, so the kernel has no caps to check anything against. It
            cannot be created from this page, because creating a policy is the one act that must come from
            your own key.
            <br />
            This page refreshes on its own; the policy will appear here within a few seconds of the CLI
            command landing.
          </Empty>
        </section>
      ) : (
        <PolicyPanel policy={policy} isOwner={isOwner} currentSlot={currentSlot} />
      )}

      {/* 3 — audit log */}
      <AuditPanel
        events={events ?? []}
        loading={auditLoading}
        error={auditError ? auditError.message : null}
        isValidating={auditValidating}
      />

      {/* 4 — positions */}
      <PositionsPanel
        data={positions ?? null}
        loading={positionsLoading}
        error={positionsError ? positionsError.message : null}
      />

      {/* 5 — edit policy */}
      {connected && policy && pda && program && anchorWallet ? (
        <EditPolicyPanel
          policy={policy}
          policyPda={pda}
          program={program}
          anchorWallet={anchorWallet}
          isOwner={isOwner}
          onSubmitted={() => {
            void refreshPolicy();
            void refreshAudit();
          }}
        />
      ) : (
        <section className="panel">
          <header>
            <span className="n">5</span>
            <h2>Edit policy</h2>
          </header>
          {connected ? (
            <Empty title="Nothing to edit yet.">
              The rule editor appears once a policy exists at your PDA. It is the only control in this app
              that writes to the chain, and it always routes through your wallet&rsquo;s signature.
            </Empty>
          ) : (
            notConnected
          )}
        </section>
      )}

      <footer className="faint" style={{ fontSize: 'var(--t-sm)', marginTop: 'var(--s7)' }}>
        Read-mostly by construction: no server-side keys, no custody, no intent-push path. The only write is{' '}
        <span className="mono">update_policy</span>, signed by the connected wallet and recorded by the
        program. Nothing on this page can stop a trade you place elsewhere.
      </footer>
    </div>
  );
}
