/**
 * CI RED-PROOF — deliberate type error to verify the Type-check gate fails the build.
 * This file is temporary and is removed before the branch is considered clean.
 * See S-4 CI verification.
 */
import { formatInr } from './format';

// formatInr expects a number; passing a string is a deliberate TS2345 error.
export const brokenCiProof: string = formatInr('not-a-number');
