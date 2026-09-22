# CI workflow — pending placement

The connected GitHub App token used by this cell lacks the `workflows`
permission, so it cannot commit under `.github/workflows/` (the API returns
404 on that path). The intended CI is checked in here as `ci/ci.yml`.

**To activate it**, a maintainer with workflow scope moves the file:

```bash
mkdir -p .github/workflows
git mv ci/ci.yml .github/workflows/ci.yml
git commit -m "ci: activate build/test/build pipeline"
git push
```

The pipeline runs `npm ci`, `npm run typecheck`, `npm test`, `npm run build`
on every push to `main` and every pull request.
