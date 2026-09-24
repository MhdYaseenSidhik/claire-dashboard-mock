/**
 * CI VERIFICATION PROBE — do not merge.
 * Deliberate TypeScript type error to prove the CI `typecheck` gate fails the build.
 * Ticket S-4. Removed before the clean-green confirmation.
 */
export function ciProbe(): number {
  const value: number = 'this is a string, not a number';
  return value;
}
