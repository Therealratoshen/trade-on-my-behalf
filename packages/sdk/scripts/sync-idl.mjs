#!/usr/bin/env node
// Regenerates src/treasury.idl.ts from the IDL emitted by `anchor build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../../programs/treasury/target/idl/treasury.json');
const dst = resolve(here, '../src/treasury.idl.ts');

const idl = JSON.parse(readFileSync(src, 'utf8'));
const header = `/**
 * Treasury IDL (TypeScript const).
 *
 * GENERATED from programs/treasury/target/idl/treasury.json by
 * \`pnpm --filter @trade-on-my-behalf/sdk run sync-idl\`. Do not edit by hand;
 * run \`anchor build\` then the sync script after changing the program.
 */

`;
writeFileSync(dst, `${header}export const IDL = ${JSON.stringify(idl, null, 2)} as const;\n`);
console.log(`wrote ${dst}`);
