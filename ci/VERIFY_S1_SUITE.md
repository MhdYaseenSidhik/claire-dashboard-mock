# CI verification — S-1 test suite on current `main`

This file exists only to trigger a CI run against the current `main` HEAD.

## Why

The committed vitest suite (`src/lib/format.test.ts`, 8 cases) is the S-1
deliverable: *a test suite the pipeline can run.* It is wired into
`.github/workflows/ci.yml` (job `build-test` → `npm ci` → `npm run typecheck`
→ `npm run lint` → `npm test` → `npm run build`) on push to `main` and every PR.

The last recorded CI **push** run on `main` was `93fab9d`. After that, S-2/S-7
merges added a `pretest` hook to `package.json`:

```
"pretest": "npm run build:data && npm run build:pack",
"test": "vitest run"
```

so `npm test` now runs the two `tsx` data-build scripts *before* vitest. That
exact `npm test` had **never been proven green by the pipeline on the current
`main` HEAD**, and the shared sandbox could not fork a process to run it
locally. This PR's `build-test` run closes that gap by exercising the pretested
`npm test` on real current `main`.

No application code is changed by this file.
