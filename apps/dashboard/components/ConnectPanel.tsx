'use client';

import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import { CLUSTER, RPC_ENDPOINT, explorerAddressUrl, explorerIsIndexed } from '@/lib/cluster';
import { derivePolicyPda } from '@/lib/trader';

import { CopyRow, Panel } from './ui';

/**
 * Panel 1 — connect wallet, then show the Policy PDA.
 *
 * The PDA is the whole address of this dashboard's subject, so it is on
 * screen and copyable at all times: a judge watching a screen-share can paste
 * it into an explorer and see the same policy the UI is rendering.
 */
export function ConnectPanel() {
  const { publicKey, connected, connecting } = useWallet();

  let pda: string | null = null;
  let deriveError: string | null = null;
  if (publicKey) {
    try {
      pda = derivePolicyPda(new PublicKey(publicKey))[0].toBase58();
    } catch (err) {
      deriveError = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <Panel
      n={1}
      title="Connect wallet"
      aside={
        <span className="pill">
          cluster <b>{CLUSTER}</b>
        </span>
      }
    >
      <div className="topbar">
        <div className="wallet-slot">
          <WalletMultiButton />
        </div>
        {connected && publicKey ? (
          <CopyRow label="wallet" value={publicKey.toBase58()} />
        ) : (
          <span className="dim">
            {connecting ? 'connecting…' : 'No wallet connected.'}
          </span>
        )}
      </div>

      {connected && publicKey ? (
        <div style={{ marginTop: 'var(--s4)' }}>
          {pda ? (
            <>
              <CopyRow label="policy PDA" value={pda} />
              <div className="note" style={{ marginTop: 'var(--s3)' }}>
                Derived at <code className="mono">[b&quot;policy&quot;, wallet_pubkey]</code> under the treasury
                program. This is the account every panel below reads.
                {explorerIsIndexed(CLUSTER) ? (
                  <>
                    {' '}
                    <a href={explorerAddressUrl(pda, CLUSTER)} target="_blank" rel="noreferrer">
                      open in explorer ↗
                    </a>
                  </>
                ) : (
                  <> Local validator blocks are not indexed by the public explorer.</>
                )}
              </div>
            </>
          ) : (
            <div className="err">Could not derive the policy PDA: {deriveError}</div>
          )}
        </div>
      ) : (
        <div className="note">
          <p style={{ margin: '0 0 var(--s2)' }}>
            Connect the wallet that <em>owns</em> the policy. The dashboard is a viewer: it reads the on-chain
            rules and the decision log, and it never asks you to confirm a trade.
          </p>
          <p style={{ margin: 0 }}>
            <strong>The kernel records the decision.</strong> Your rules are checked and written to the
            log whether or not this tab is open, and whether or not you are looking at it. The log is a
            record, not a boundary — see the claim above.
          </p>
        </div>
      )}

      <div style={{ marginTop: 'var(--s4)' }}>
        <span className="pill">
          RPC <b>{RPC_ENDPOINT}</b>
        </span>
      </div>
    </Panel>
  );
}
