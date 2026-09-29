import { clusterApiUrl, type Cluster } from '@solana/web3.js';
import { TREASURY_PROGRAM_ID } from '@trade-on-my-behalf/sdk';

export type ClusterId = 'devnet' | 'localnet' | 'testnet' | 'mainnet-beta';

/** Read at build time by Next's inliner — never fetched. */
export const CLUSTER: ClusterId = (process.env.NEXT_PUBLIC_CLUSTER as ClusterId) || 'devnet';

export const RPC_ENDPOINT: string =
  process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(CLUSTER as Cluster);

export const PROGRAM_ID = TREASURY_PROGRAM_ID;

const EXPLORER_BASE: Record<ClusterId, string> = {
  devnet: 'https://explorer.solana.com',
  'mainnet-beta': 'https://explorer.solana.com',
  testnet: 'https://explorer.solana.com',
  localnet: 'https://explorer.solana.com',
};

const EXPLORER_CLUSTER: Record<ClusterId, string> = {
  devnet: 'devnet',
  'mainnet-beta': '',
  testnet: 'testnet',
  localnet: 'localnet',
};

/** `?cluster=` is omitted for mainnet. */
export function explorerQuery(cluster: ClusterId = CLUSTER): string {
  const c = EXPLORER_CLUSTER[cluster];
  return c ? `?cluster=${c}` : '';
}

export function explorerTxUrl(signature: string, cluster: ClusterId = CLUSTER): string {
  return `${EXPLORER_BASE[cluster]}/tx/${signature}${explorerQuery(cluster)}`;
}

export function explorerAddressUrl(address: string, cluster: ClusterId = CLUSTER): string {
  return `${EXPLORER_BASE[cluster]}/address/${address}${explorerQuery(cluster)}`;
}

/**
 * A local validator's blocks are not indexed by the public explorer, so a link
 * there is a dead end. Say so instead of shipping a 404.
 */
export function explorerIsIndexed(cluster: ClusterId = CLUSTER): boolean {
  return cluster !== 'localnet';
}
