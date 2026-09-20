# GitHub Pages deployment

The `GitHub Pages` workflow builds `_site` with Node.js 22, runs the regression suite, packages the four standalone modules and publishes the static app. No frontend bundler, installation or server credentials are required by the Pages build.

Expected project URL: https://wieslawsoltes.github.io/LumeraStudio/

## Repository configuration

Use Settings → Pages → Build and deployment → Source: **GitHub Actions**. The workflow attempts Pages enablement through `actions/configure-pages`; if the repository token does not have permission to enable a new site, an administrator must select the publishing source once, then rerun the workflow. Deployments use the `github-pages` environment with `pages: write` and `id-token: write` permissions.

## Storage and security

Pages mode is enabled only in the generated HTML through `meta[name="lumera-storage"]`. The regular SQL/hosted app is unchanged. Pages projects, checkpoints and recovery drafts belong to the current browser profile, not a server account. Export scenes before clearing site data. Normal/private browser profiles and other devices do not share the database. Same-origin tabs use IndexedDB transactions and revision checks.

The static build does not call `/api`, does not attempt ChatGPT sign-in, and does not generate misleading invitation links. Server-side collaboration requires deploying the included backend with a trusted identity adapter.

## Local verification

```sh
node --experimental-sqlite --test tests/*.test.mjs
node scripts/build-pages.mjs
node scripts/package-modules.mjs
python3 -m http.server 8080 --directory _site
```

Optional real-browser suite: `python tests/browser-smoke.py` after installing Python Playwright and Chromium. Outputs go to ignored `test-results/`. This suite uses a CPU renderer fallback and does not qualify physical WebGPU hardware.
