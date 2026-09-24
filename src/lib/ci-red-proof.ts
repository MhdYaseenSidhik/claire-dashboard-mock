/**
 * CI GREEN-PROOF — the deliberate type error has been removed.
 * This branch should now pass every gate (type-check, lint, test, build),
 * proving the same pipeline goes green when the code is clean.
 * See S-4 CI verification.
 */
import { formatInr } from './format';

// Valid: formatInr takes a number, returns a string.
export const ciProof: string = formatInr(12_400_000);
