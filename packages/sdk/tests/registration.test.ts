/**
 * Cluster-identity guard: the SDK must refuse to sign against anything
 * other than Solana devnet, or a loopback validator the caller explicitly
 * opted into.
 *
 * The whole point of this guard is that a URL cannot be trusted. Anyone
 * can pass `https://api.mainnet-beta.solana.com`, or proxy a mainnet node
 * onto `http://127.0.0.1:8899`, and a label check would wave both through.
 * So the tests below assert on the node's own `getGenesisHash` answer and
 * on the public-cluster prefixes, never on a URL.
 *
 * Offline: `getGenesisHash` is stubbed, so no cluster is contacted.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertDevnetWrite,
  isDevnetGenesis,
  DEVNET_GENESIS_HASH,
  type GenesisReadable,
} from '../src/index.js';

// Sourced from `getGenesisHash` against the public endpoints; see
// registration.ts. Mainnet and testnet appear only as deny-list prefixes.
const MAINNET = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const TESTNET = '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY';
/** The shortened Wallet Standard chain id, e.g. wallet-adapter `solana:devnet`. */
const DEVNET_SHORT = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

function node(genesis: string, rpcEndpoint = 'https://api.devnet.solana.com'): GenesisReadable {
  return { getGenesisHash: async () => genesis, rpcEndpoint };
}

const localNode = (genesis: string, endpoint = 'http://127.0.0.1:8899'): GenesisReadable =>
  node(genesis, endpoint);

// ---------------------------------------------------------------------------
// The cluster that is allowed.
// ---------------------------------------------------------------------------

test('devnet is allowed on its full RPC genesis hash', async () => {
  await assert.doesNotReject(assertDevnetWrite(node(DEVNET_GENESIS_HASH)));
  assert.ok(isDevnetGenesis(DEVNET_GENESIS_HASH));
});

test('the constant is the full 44-char RPC value, not the shortened chain id', () => {
  assert.equal(DEVNET_GENESIS_HASH, 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG');
  assert.equal(DEVNET_GENESIS_HASH.length, 44);
  assert.notEqual(DEVNET_GENESIS_HASH, DEVNET_SHORT, 'the truncated id must not be the constant');
});

// ---------------------------------------------------------------------------
// Prefix matching: the reason this is `startsWith` and not `===`.
// ---------------------------------------------------------------------------

test('devnet is matched by prefix, so the shortened chain id is also recognised', () => {
  // A `===` comparison against the full hash would reject this, and one
  // against the short id would never match a real node. Prefix matching is
  // what makes both forms resolve to devnet.
  assert.ok(DEVNET_GENESIS_HASH.startsWith(DEVNET_SHORT));
  assert.ok(isDevnetGenesis(DEVNET_SHORT), 'shortened devnet id must read as devnet');
  assert.ok(isDevnetGenesis(DEVNET_GENESIS_HASH), 'full devnet hash must read as devnet');
});

test('a remote endpoint that reports devnet is allowed — the node decides, not the URL', async () => {
  // A private devnet RPC on a remote host is a legitimate setup, so the
  // guard must not refuse it. This is the flip side of the URL-independence
  // above: identity comes from getGenesisHash, so a remote host reporting
  // devnet passes and a localhost host reporting mainnet fails. Judging by
  // hostname instead would be wrong in both directions.
  await assert.doesNotReject(
    assertDevnetWrite({ getGenesisHash: async () => DEVNET_GENESIS_HASH, rpcEndpoint: 'https://my-private-devnet.example' }),
  );
  await assert.doesNotReject(
    assertDevnetWrite({ getGenesisHash: async () => DEVNET_SHORT, rpcEndpoint: 'https://my-private-devnet.example' }, true),
  );
});

// ---------------------------------------------------------------------------
// The clusters that are refused.
// ---------------------------------------------------------------------------

test('mainnet-beta is refused', async () => {
  await assert.rejects(assertDevnetWrite(node(MAINNET)), /signing requires Solana devnet/);
  assert.equal(isDevnetGenesis(MAINNET), false);
});

test('testnet is refused', async () => {
  await assert.rejects(assertDevnetWrite(node(TESTNET)), /signing requires Solana devnet/);
  assert.equal(isDevnetGenesis(TESTNET), false);
});

test('an unrecognised chain is refused rather than assumed harmless', async () => {
  await assert.rejects(assertDevnetWrite(node('some-other-chain-genesis')), /signing requires Solana devnet/);
  await assert.rejects(assertDevnetWrite(node('')), /signing requires Solana devnet/);
});

test('the refusal names the genesis hash it was given, so the wrong endpoint is diagnosable', async () => {
  await assert.rejects(assertDevnetWrite(node(MAINNET)), new RegExp(MAINNET));
});

// ---------------------------------------------------------------------------
// The local-validator opt-in. Off by default.
// ---------------------------------------------------------------------------

test('a local validator is refused unless the caller opts in', async () => {
  await assert.rejects(
    assertDevnetWrite(localNode('ephemeral-local-validator-genesis')),
    /signing requires Solana devnet/,
  );
});

test('opting in allows a genuine loopback validator', async () => {
  await assert.doesNotReject(
    assertDevnetWrite(localNode('ephemeral-local-validator-genesis', 'http://127.0.0.1:8899'), true),
  );
  await assert.doesNotReject(
    assertDevnetWrite(localNode('ephemeral-local-validator-genesis', 'http://localhost:8899'), true),
  );
});

// ---------------------------------------------------------------------------
// The case the opt-in must NOT open: a public chain proxied to loopback.
// ---------------------------------------------------------------------------

test('opting in still refuses a mainnet node reached over loopback', async () => {
  // This is the whole reason the public-cluster check runs before the
  // loopback check. Without it, `allowLocalValidator` would be a bypass:
  // proxy mainnet to 127.0.0.1, flip the flag, sign real transactions.
  await assert.rejects(
    assertDevnetWrite(localNode(MAINNET, 'http://127.0.0.1:8899'), true),
    /signing requires Solana devnet/,
  );
  await assert.rejects(
    assertDevnetWrite(localNode(TESTNET, 'http://127.0.0.1:8899'), true),
    /signing requires Solana devnet/,
  );
});

test('opting in still refuses a public chain over a remote host', async () => {
  await assert.rejects(
    assertDevnetWrite(node(MAINNET, 'https://remote-validator.example'), true),
    /signing requires Solana devnet/,
  );
});

test('an unknown chain on a remote host is refused even when opting in', async () => {
  await assert.rejects(
    assertDevnetWrite(node('ephemeral-local-validator-genesis', 'https://remote-validator.example'), true),
    /signing requires Solana devnet/,
  );
});

test('a non-loopback loopback-shaped host is not treated as loopback', async () => {
  await assert.rejects(
    assertDevnetWrite(node('ephemeral-local-validator-genesis', 'https://127.0.0.1.evil.example'), true),
    /signing requires Solana devnet/,
  );
});

test('a missing or unparseable endpoint is refused, not defaulted to local', async () => {
  await assert.rejects(
    assertDevnetWrite({ getGenesisHash: async () => 'ephemeral-local-validator-genesis' }, true),
    /signing requires Solana devnet/,
  );
  await assert.rejects(
    assertDevnetWrite({ getGenesisHash: async () => 'ephemeral-local-validator-genesis', rpcEndpoint: 'not a url' }, true),
    /signing requires Solana devnet/,
  );
  await assert.rejects(
    assertDevnetWrite({ getGenesisHash: async () => 'ephemeral-local-validator-genesis', rpcEndpoint: 'ws://127.0.0.1:8899' }, true),
    /signing requires Solana devnet/,
  );
});
