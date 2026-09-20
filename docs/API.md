# Lumera module APIs

The four packages have no frontend framework dependency. Browser source uses relative ES-module imports so the repository runs without installing dependencies. `npm run package:modules` produces npm tarballs whose cross-package imports use `@lumera/core`, with that dependency declared in each consuming package. Packages are prepared for distribution; this release does not publish them to a registry.

## Core

```js
import { SceneStore, createScene, evaluateScene, diff, applyPatches } from '@lumera/core';
const store = new SceneStore(createScene());
store.addEventListener('change', ({detail}) => {
  console.log(detail.label, detail.patches, detail.local);
});
store.change('Key exposure', scene => { scene.lights[0].exposure = 1; });
store.undo();
store.redo();
const evaluated = evaluateScene(store.scene, 24);
```

`SceneStore.change(label, callback)` clones and validates the transaction before committing it. A failed transaction does not alter the scene or history. `replace(scene, local=false)` installs a validated remote document. `select(kind,id)` emits a `select` event. Selection kinds are `object`, `light`, `material`, and `node`.

`validateScene`, `topologicalSort`, `diff`, and `applyPatches` also work in Node without the application. Patch paths use `@<id>` to address unique-ID arrays. Arrays without unique IDs, including animation tracks for multiple properties of an object, use whole-array patches. `applyPatches(scene, patches, {check:true})` rejects a patch whose prior field value no longer matches.

The schema is versioned as `schemaVersion: 1`. Scenes contain objects, materials, lights, nodes, edges, camera, settings, timeline, review comments, and render snapshots. Source JSON is capped at 1.5 MB. The API caps request bodies at 2 MB.

## Renderer

```js
import { LumeraRenderer } from '@lumera/renderer';
const renderer = await LumeraRenderer.create(canvas);
renderer.addEventListener('stats', ({detail}) => {
  // backend, samples, width, height, frameMs, error, running
});
renderer.setScene(scene);
renderer.setCamera(scene.camera);
renderer.setOptions({ samples: 128, exposure: 0 });
renderer.setRunning(false);
renderer.setRunning(true);
const blob = await renderer.capture(); // PNG at active render resolution
const objectId = renderer.pick(0.5, 0.5); // normalized viewport coordinates
renderer.dispose();
```

The canvas must have a parent with a nonzero size. Keep application pointer handlers on that parent: the renderer may replace its canvas when falling back after GPU device loss. `renderer.canvas` always points to the active canvas.

`setScene` evaluates the node graph and animation, resets accumulation and schedules rendering. `setCamera` and `setOptions` update the current evaluated render state. The renderer stops after the sample target. Resize, scene and camera edits invalidate accumulation. `dispose()` releases GPU resources and DOM observers.

The WebGPU path is a bounded progressive ray renderer with analytic sphere/plane intersections and SDF intersections for other primitive surfaces, sampled finite area lights, geometric shadow rays, a direct GGX surface model and approximate secondary reflection/diffuse bounces. It is not an unbiased production path tracer. CPU preview uses simplified direct lighting, hard shadows, and one reflection bounce. It is intended as a compatibility preview, not a speed-equivalent backend.

## Controls

```js
import '@lumera/controls';
const graph = document.querySelector('lumera-node-graph');
graph.data = { nodes: scene.nodes, edges: scene.edges };
graph.selection = 'node-id';
graph.fit();
graph.addEventListener('node-move', event => console.log(event.detail));
graph.addEventListener('connect', event => console.log(event.detail.from, event.detail.to));
```

`<lumera-node-graph>` emits `node-select`, `node-move`, `connect`, and `edge-select`. It displays source data and emits edits; the owner applies validated changes and assigns updated data. Ports connect by selecting an output port then an input port. Background dragging pans, scroll zooms, and Fit graph frames nodes.

`<lumera-timeline>` accepts `.data = {frame,start,end,fps}` and `.playing`. It emits `frame` and `play`. Both components use Shadow DOM and require no application globals.

## Collaboration client

```js
import { ProjectClient } from '@lumera/collaboration';
const client = new ProjectClient(store, { base: '/api', interval: 2500 });
await client.init();
await client.create(); // new persistent project
await client.flush(); // acknowledge pending edits
client.dispose();
```

The client uses the same `SceneStore` as the visible UI. It compacts edits relative to the acknowledged scene, debounces writes, polls revisions and presence, merges independent fields after revision conflicts, and flags conflicting changes to the same field. Pending edits are kept in a local recovery draft until acknowledged. A draft is a recovery aid; the SQL record is authoritative for saved server-backed projects.

`status`, `identity`, `presence`, `conflict`, and `recovery-error` events expose client state. The server API provides project listing/creation/read/patch, named versions, presence, invitation joining and role management. Invite links expire after 24 hours. Owner/editor/viewer roles are checked server-side for every project request.

## Embedding examples

Run the local application, then open `/examples/renderer.html` or `/examples/controls.html`. They import only their required modules and do not load the studio UI.

## Browser-local storage adapter

`@lumera/collaboration/local` exports `IndexedDBProjectStorage` and `createLocalTransport`. Inject the transport into the same `ProjectClient`; there is no separate browser client class. It implements local projects, checkpoints and revision checks without HTTP requests, server accounts, invitations or remote collaboration.

```js
import { ProjectClient } from '@lumera/collaboration';
import { IndexedDBProjectStorage, createLocalTransport } from '@lumera/collaboration/local';

const scope = '/LumeraStudio/';
const storage = new IndexedDBProjectStorage({name: 'lumera-local-v1:' + scope});
const client = new ProjectClient(store, {
  transport: createLocalTransport({storage}),
  recoveryKey: 'lumera-pages-recovery-v1:' + scope
});
await client.init();
if (!client.id) await client.create();
else await client.flush();
// On teardown:
client.dispose();
await storage.close();
```

Use a stable namespace per application. The studio derives its scope from the module URL, so `/LumeraStudio/` and `/LumeraStudio/index.html` share storage. IndexedDB transactions serialize writes across tabs; stale revisions return a 409 conflict containing the current scene and revision. The transport rejects server-only invitations and role changes with a 501 error rather than simulating collaboration. Export scene files for portable backups; clearing browser data deletes local work.

The `transport(path, method, body)` callback defaults to GET when method is omitted and returns the same JSON-shaped records as the server API. Errors expose `status` and `data` for conflict handling. The `recoveryKey` option isolates recovery drafts for embedded applications.

## Browser validation

Install `playwright==1.63.0` and Chromium, then run `python3 tests/browser-smoke.py` after building Pages. Set `CHROMIUM_PATH` for a custom executable. The test covers the repository-prefix URL, real IndexedDB save/reload and rename persistence, a second tab, stale-revision conflicts, the local-sharing disclosure, and absence of server API calls or page errors. It writes a screenshot and JSON report to `test-results/`. This test uses CPU fallback and does not qualify physical WebGPU hardware.
