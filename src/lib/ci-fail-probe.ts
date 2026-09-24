// Temporary CI verification probe for S-4. Deliberately introduces a type
// error so we can confirm the pipeline's Type-check gate fails the build.
// This file is reverted before merge; it must never reach main.
export function ciFailProbe(): number {
  const value: string = 42;
  return value;
}
