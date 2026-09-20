# Lumera Studio

An original browser lighting and look-development workstation, built with plain HTML, CSS and JavaScript. Lumera combines a procedural scene graph, material and light editing, progressive WebGPU rendering, animation, render snapshots and collaborative project storage.

**This release is a working bounded implementation, not full Katana feature parity or a production-certified renderer.** See [the compatibility matrix](docs/COMPATIBILITY.md) for exact limits and validation status.

## GitHub Pages — browser-local edition

The Pages deployment is **https://wieslawsoltes.github.io/LumeraStudio/**.

The static edition includes the same editor, renderer and reusable controls. It stores projects and checkpoints in **IndexedDB in the current browser**, with namespaced recovery drafts and revision-checked updates across tabs. No project data is sent to a server. Export `.lumera.json` files for backup or transfer; clearing browser/site data deletes local work.

GitHub Pages cannot run the SQL/API/authentication backend. Multi-user invitations, server-side roles and remote collaboration remain available in the server-backed source but are **not advertised as working on Pages**. The Share dialog explains this boundary.

Build the static site without installing dependencies:

```sh
node scripts/build-pages.mjs
python3 -m http.server 8080 --directory _site
```

Open **http://localhost:8080**. The output uses relative asset paths, so it also works under the `/LumeraStudio/` project prefix. The original `public/index.html` is not modified by the build and continues to use the backend in server deployments.

GitHub Actions tests and builds the site, uploads the Pages artifact and deploys it on pushes to `main`. Repository Settings → Pages should use **GitHub Actions** as the publishing source.

## Run locally — no dependency installation required

Install Node.js 22.13 or newer, extract this repository, and run:

```sh
node --experimental-sqlite server/local.mjs
```

Open **http://localhost:3000**. The local application stores projects in `.local/lumera.sqlite`. It binds only to loopback and uses a single local artist identity. WebGPU requires a supporting browser and secure context; localhost is eligible. A CPU preview is used if a GPU adapter cannot be created.

The local runtime serves the same plain HTML/JavaScript application as the hosted site. No React runtime is used by the studio UI. The repository also includes a Vinext/Cloudflare deployment harness inherited from the hosting starter; its TypeScript/build dependencies are used to deploy the server routes and are not dependencies of the four reusable frontend packages.

## Work with the scene

1. The app opens with **Orbit — material study**, a ceramic torus, metal and enamel spheres, architectural geometry and a three-light rig.
2. Select geometry from the scene graph or click it in the viewport. Edit transforms and shared material parameters in the inspector.
3. Open **Light mixer** to change color, intensity, exposure, enable and solo state. Select a light to edit its position, size or object link.
4. Drag to orbit, Shift-drag to pan, scroll to zoom, or press **F** to frame the selected object. The Move tool translates the selected object in the viewport XY plane.
5. Build a procedural recipe in **Node graph**. Add nodes with Tab, connect an output port to an input port, and use the inspector for transform/material operations. Cycles are rejected.
6. Capture render snapshots, restore looks, export PNGs, keyframe transforms with **K**, and render a bounded frame sequence from the Render menu.
7. Save the project and create checkpoints. On the hosted app, sign in, invite editors/viewers and post review notes. Independent edits merge; conflicting edits are retained for a separate saved copy.

Supported scene interchange is Lumera JSON (`.lumera.json`). There is no native Katana, USD, Alembic, arbitrary mesh or renderer plug-in import in this version.

## Reusable packages

| Package | Source | Purpose |
|---|---|---|
| `@lumera/core` | `public/packages/core` | Serializable scene model, validation, DAG evaluation, commands, history, diff/patch and animation |
| `@lumera/renderer` | `public/packages/renderer` | WebGPU rendering, CPU preview, camera math, geometric picking and PNG capture |
| `@lumera/controls` | `public/packages/controls` | Framework-independent graph and timeline web components |
| `@lumera/collaboration` | `public/packages/collaboration` | Project synchronization, revision handling, merge/conflict behavior and draft recovery |

Each module has its own package manifest and can be consumed independently of the studio. [API documentation](docs/API.md) includes usage and events. Open `/examples/renderer.html` and `/examples/controls.html` for isolated demonstrations.

Create npm-ready tarballs (does not publish anything):

```sh
node scripts/package-modules.mjs
```

The output is in `artifacts/`. Consumers install the core tarball together with renderer or collaboration tarballs; controls has no core dependency. The packaging script rewrites development-relative imports to their declared npm package names.

## Test and build

The core/API tests require only Node's built-in test runner and SQLite:

```sh
node --experimental-sqlite --test tests/*.test.mjs
```

For the hosted Worker build, install the pinned dependencies with the package manager recorded in `package.json`, then:

```sh
pnpm install --frozen-lockfile
pnpm run db:generate  # only after editing db/schema.ts
pnpm run build
```

The deployment emits `dist/server/index.js`, public assets, hosting metadata and schema migrations. `.openai/hosting.json` declares logical D1 binding `DB`; the hosting service supplies its actual resource. Production identity comes from trusted authenticated-user headers. Do not trust arbitrary client-supplied identity headers on another hosting provider.

## Repository layout

```text
public/index.html            Plain HTML application shell
public/app/                  Studio controller, styles and PNG-sequence ZIP writer
public/packages/             Four reusable JavaScript modules
public/examples/             Standalone renderer/control examples
server/api.js                Framework-independent request handler
server/local.mjs             Zero-install loopback Node/SQLite runtime
app/route.ts                 Hosted HTML response
app/api/[[...path]]/route.ts  Hosted API and trusted identity adapter
db/schema.ts                 SQL schema source
drizzle/                     Versioned SQL migrations
tests/                       Core, geometry, API and synchronization regression tests
docs/                        API and compatibility documentation
scripts/package-modules.mjs  Standalone npm tarball builder
```

Original Lumera code is MIT-licensed. Starter/vendor components retain their own license notices. No proprietary source or product assets are included.
