/**
 * @trade-on-my-behalf/sdk
 *
 * TypeScript SDK for the Trade On My Behalf Anchor treasury program.
 * The on-chain policy gate. Mirror of `programs/treasury/programs/treasury/src/`.
 *
 * @example
 * ```ts
 * import { withTrader } from "@trade-on-my-behalf/sdk";
 * import { Connection, Keypair, PublicKey } from "@solana/web3.js";
 *
 * const connection = new Connection("https://api.devnet.solana.com");
 * const trader = withTrader({
 *   connection,
 *   wallet: agentKeypair,
 *   policy: agentPubkey,
 * });
 * ```
 */

export {
  withTrader,
  decodePolicy,
  derivePolicyPda,
  micro,
  parseAuditEvents,
} from './withTrader.js';
export { reasonCodeName } from './types.js';

export { IDL as TREASURY_IDL } from './treasury.idl.js';

export {
  // Constants
  REASON_CODES,
  MICRO_USDC_PER_USD,
  TREASURY_PROGRAM_ID,
  MAX_VENDORS,
  SLOTS_PER_DAY,
  DEFAULT_TTL_SLOTS,
  DEFAULT_MAX_LEVERAGE_BPS,
  DEFAULT_KILL_SWITCH_DRAWDOWN_PCT,
  // Types
} from './types.js';

export type {
  ReasonCode,
  AuditEvent,
  Policy,
  PolicyLike,
  CreatePolicyInput,
  AuthorizeSpendInput,
  UpdatePolicyInput,
  ReplaceVendorsInput,
  RecordPnlInput,
} from './types.js';

export type { WithTraderOptions, WithTraderHandle } from './withTrader.js';