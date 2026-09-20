# GitHub Pages deployment

Live project URL: https://wieslawsoltes.github.io/LumeraStudio/

The `GitHub Pages` workflow runs 37 Node regression tests, builds `_site`, uploads the Pages artifact and publishes the static app on pushes to `main`. The separate `Core, packages and browser` workflow also packages the four standalone modules and runs Chromium persistence tests. No frontend bundler, dependency installation or server credentials are required by the Pages build itself.

## Repository configuration

Use Settings → Pages → Build and deployment → Source: **GitHub Actions**. The workflow attempts Pages enablement through `actions/configure-pages`; on a new fork, an administrator may need to select the publishing source once. Deployments use the `github-pages` environment with `pages: write` and `id-token: write` permissions. After deployment, the workflow checks the published entry point and critical assets over HTTPS.

## Storage and security

Pages mode is enabled only in generated HTML through `meta[name="lumera-storage"]`. The regular SQL/hosted app is unchanged. Pages projects, checkpoints and recovery drafts belong to the current browser profile, not a server account. Export scenes before clearing site data. Normal/private browser profiles and other devices do not share the database. Same-origin tabs use IndexedDB transactions and revision checks.

The static build does not call `/api`, does not attempt ChatGPT sign-in, and does not generate misleading invitation links. Server-side collaboration requires deploying the included backend with a trusted identity adapter.

## Local verification

```sh
node --experimental-sqlite --test tests/*.test.mjs
node scripts/build-pages.mjs
node scripts/package-modules.mjs
python3 -m http.server 8080 --directory _site
```

For the browser suite, stop the manual server or use a separate terminal:

```sh
python3 -m pip install playwright==1.63.0
python3 -m playwright install chromium
python3 tests/browser-smoke.py
```

The smoke test starts its own ephemeral local server, exercises `/LumeraStudio/`, and writes `test-results/browser-smoke.json` and `test-results/pages-workspace.png`. Set `CHROMIUM_PATH` to use a custom executable. It forces CPU fallback and does not qualify physical WebGPU hardware.
