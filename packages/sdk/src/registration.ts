import { Keypair, PublicKey } from '@solana/web3.js';

/** Both parties consent, unless the owner and agent are the same wallet. */
export function registrationSigners(owner: Keypair, agent: PublicKey, consent?: Keypair): Keypair[] {
  if (consent && !consent.publicKey.equals(agent)) {
    throw new Error('Agent consent signer does not match the policy agent.');
  }
  if (owner.publicKey.equals(agent)) return [];
  if (!consent) throw new Error('Creating a policy requires the agent consent keypair as agentSigner.');
  return [consent];
}

/** Pin existing policies to a trusted owner, not an owner learned from that policy. */
export function assertPolicyBinding(
  policy: { owner: PublicKey; agent: PublicKey }, agent: PublicKey, expectedOwner: PublicKey,
): void {
  if (!policy.agent.equals(agent)) throw new Error('Policy agent does not match the configured agent.');
  if (!policy.owner.equals(expectedOwner)) throw new Error('Policy owner does not match the expected owner. Refusing this policy.');
}

// Full getGenesisHash RPC value, not the shortened Wallet Standard chain ID.
export const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

/** All SDK wallet writes are devnet-only, even if a URL is mislabeled. */
export async function assertDevnetWrite(
  connection: { getGenesisHash(): Promise<string>; rpcEndpoint?: string }, allowLocalValidator = false,
): Promise<void> {
  const genesis = await connection.getGenesisHash();
  if (genesis === DEVNET_GENESIS_HASH) return;
  // Explicit, loopback-only local regression testing. A mainnet/testnet proxy
  // on localhost must still be rejected; a URL label alone is not chain identity.
  const publicNetwork = genesis.startsWith('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')
    || genesis.startsWith('4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z')
    || genesis.startsWith('EtWTRABZaYq6iMfeYKouRu166VU2xqa1');
  if (allowLocalValidator && !publicNetwork && connection.rpcEndpoint) {
    const endpoint = new URL(connection.rpcEndpoint);
    if (['http:', 'https:'].includes(endpoint.protocol)
        && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)) return;
  }
  throw new Error('SDK signing requires Solana devnet, or an explicitly enabled loopback test validator. Public mainnet/testnet signing is blocked.');
}