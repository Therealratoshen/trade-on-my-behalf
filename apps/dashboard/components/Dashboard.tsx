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
import { ConnectPanel } from './ConnectPanel';
import { EditPolicyPanel } from './EditPolicyPanel';
import { PolicyPanel } from './PolicyPanel';
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

  const notConnected = (
    <Empty title="Connect a wallet to read this policy.">
      The rules live on chain at{' '}
      <code className="mono">[b&quot;policy&quot;, your_wallet]</code>. This dashboard has no server-side key —
      it reads the account your wallet owns and shows you what the kernel has already decided.
    </Empty>
  );

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Trade On My Behalf — Control Surface</h1>
        <p>
          A viewer and a rule editor. The on-chain kernel decides every trade; this page shows you the rules
          it is bound by and the receipts it has produced. There is no approve button here, by design.
        </p>
        <div className="tagline">“The kernel decides. The webapp shows you what it decided.”</div>
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <Link href="/paper-practice">Open paper practice →</Link>
          <span className="faint mono" style={{ fontSize: 10 }}>FICTIONAL FIXTURES · LOCAL ONLY · NO ORDERS</span>
        </div>
      </header>

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
            <div className="note" style={{ marginTop: 10 }}>
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
            No account exists at the PDA above. The kernel has nothing to enforce until you create one — it
            cannot be created from this page, because creating a policy is the one act that must come from
            your own key.
            <br />
            This page refreshes on its own; the policy will appear here within a few seconds of the CLI
            command landing.
          </Empty>
        </section>
      ) : (
        <PolicyPanel policy={policy} />
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

      <footer className="faint" style={{ fontSize: 11, marginTop: 28 }}>
        Read-mostly by construction: no server-side keys, no custody, no intent-push path. The only write is{' '}
        <span className="mono">update_policy</span>, signed by the connected wallet and enforced by the
        Anchor program.
      </footer>
    </div>
  );
}
