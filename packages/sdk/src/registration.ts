/**
 * Cluster identity — the devnet-only signing guard.
 *
 * The SDK is devnet-first, but nothing in a `Connection` proves that: an
 * endpoint URL is a label, and `http://127.0.0.1:8899` can be a local
 * validator *or* a mainnet node proxied onto loopback. Chain identity has
 * to come from the node itself, so every wallet write is gated on
 * `getGenesisHash`.
 *
 * The comparison uses `startsWith`, never `===`, and that is deliberate.
 * Wallet-adapter chain IDs (`solana:devnet`) and the `getGenesisHash` RPC
 * value are not the same string; only the leading characters are shared.
 * An exact match against a shortened ID would therefore never fire, which
 * is how a guard that looks present turns out to be inert. Match the
 * prefix, and keep the full hash as the constant so the value is
 * traceable to a public `getGenesisHash` response.
 */

/**
 * `getGenesisHash` for Solana devnet.
 * Source: `{"jsonrpc":"2.0","method":"getGenesisHash","id":1}` against
 * `https://api.devnet.solana.com` → `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
 */
export const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

/**
 * Mainnet-beta, for the deny list only. It is never accepted, so it is
 * stored as the prefix it is matched on.
 * Source: `getGenesisHash` against `https://api.mainnet-beta.solana.com`.
 */
const MAINNET_GENESIS_PREFIX = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

/**
 * Solana testnet, for the deny list only. Never accepted.
 * Source: `getGenesisHash` against `https://api.testnet.solana.com`.
 */
const TESTNET_GENESIS_PREFIX = '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';

/** The devnet prefix, which is the only public chain that may be written to. */
const DEVNET_GENESIS_PREFIX = DEVNET_GENESIS_HASH.slice(0, 32);

const PUBLIC_GENESIS_PREFIXES = [
  MAINNET_GENESIS_PREFIX,
  TESTNET_GENESIS_PREFIX,
  DEVNET_GENESIS_PREFIX,
];

/** The slice of `Connection` this guard needs; keeps it testable offline. */
export interface GenesisReadable {
  getGenesisHash(): Promise<string>;
  rpcEndpoint?: string;
}

/** Hostnames that can only reach the caller's own machine. */
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Refuse to sign anywhere but devnet.
 *
 * A local validator is permitted, but only when the caller opts in *and*
 * the node is on loopback *and* the node is not one of the three public
 * clusters. A mainnet node proxied to `127.0.0.1` fails the public-cluster
 * test first, so `allowLocalValidator` cannot be used to launder a mainnet
 * endpoint into an approved one.
 *
 * @param connection a node whose chain identity can be read
 * @param allowLocalValidator opt in to a loopback validator for local testing
 */
export async function assertDevnetWrite(
  connection: GenesisReadable,
  allowLocalValidator = false,
): Promise<void> {
  const genesis = await connection.getGenesisHash();

  if (isDevnetGenesis(genesis)) return;

  if (allowLocalValidator && connection.rpcEndpoint !== undefined) {
    const isPublicCluster = PUBLIC_GENESIS_PREFIXES.some((p) => genesis.startsWith(p));
    if (!isPublicCluster && isLoopbackEndpoint(connection.rpcEndpoint)) return;
  }

  throw new Error(
    'SDK signing requires Solana devnet, or an explicitly enabled loopback test ' +
      'validator. This connection reported genesis hash "' + genesis + '", which is ' +
      'neither. Public mainnet/testnet signing is blocked.',
  );
}

/**
 * Devnet chain identity.
 *
 * `startsWith` rather than `===`: the shortened Wallet Standard ID
 * `EtWTRABZaYq6iMfeYKouRu166VU2xqa1` is a prefix of the full RPC genesis
 * hash, so an exact comparison would reject the cluster it is meant to
 * admit while accepting nothing else useful.
 */
export function isDevnetGenesis(genesis: string): boolean {
  return genesis.startsWith(DEVNET_GENESIS_PREFIX);
}

/** True only for an http(s) endpoint on the caller's own machine. */
function isLoopbackEndpoint(rpcEndpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(rpcEndpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return LOOPBACK_HOSTNAMES.has(url.hostname);
}
