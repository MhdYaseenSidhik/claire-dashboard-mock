// Temporary CI verification probe for S-4. The deliberate type error has been
// reverted; this file now type-checks cleanly to confirm the pipeline returns
// green. The probe branch/PR is closed after this run; nothing reaches main.
export function ciFailProbe(): number {
  const value = 42;
  return value;
}
