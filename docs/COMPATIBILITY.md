# Implemented scope and compatibility boundaries

Lumera is an original implementation inspired by professional procedural lighting workflows. It does not include Foundry source code, trademarks in product UI, proprietary assets, renderer SDKs, or native format compatibility. It is not a complete Katana replacement.

| Area | Implemented in 0.1.0 | Remaining boundaries |
|---|---|---|
| Workspace | Dark/light themes; scene/material panels; monitor/viewer channels; parameter/attribute inspector; graph, light mixer, catalog and activity tabs; timeline; commands and shortcuts; narrow-screen adaptations | Arbitrary docking, detachable native windows, exhaustive original UI parity, advanced accessibility qualification |
| Scene editing | Spheres, toruses, boxes, capped cylinders, floor planes; selection/picking; translate/rotate/scale; visibility; duplicate/delete; undo/redo; JSON import/export | General polygon meshes, sculpting/modeling, arbitrary external assets, hierarchy transforms, instancing/LOD, deformers |
| Procedural graph | DAG connections with cycle rejection; Scene, Transform, MaterialAssign, LightRig, Merge, RenderSettings and Output; movable nodes; disconnection; evaluated attributes | Full Katana Op API, CEL, SuperTools, native node definitions, parameter expressions, group publishing, USD composition and deferred scene loading. Material node is reserved; surface editing uses shared parameterized materials. |
| Materials | Shared base color, metallic, roughness, emission; assignment; ceramic/copper/chrome presets; live updates | Texture maps, UVs, arbitrary shader graphs, displacement, subsurface scattering, volumes, hair, spectral rendering and renderer-specific shader compatibility |
| Lighting | Finite area lights and points; intensity/exposure/color/size/position; enable/solo; single-object light link; light table | HDR environment textures, directional/spot lights, IES profiles, arbitrary link sets, light filters, physically calibrated photometry |
| WebGPU | Progressive ray rendering, stochastic area light sampling, geometric shadows, direct GGX model, approximate secondary bounces, camera framing and selection, filmic beauty display | Unbiased GGX path transport, mesh BVH, production global illumination, motion blur, caustics, denoising, distributed rendering, certified color management; no native renderer plug-ins |
| Geometry intersections | Analytic sphere/plane and bounded local-space SDF tracing for other primitives, with nonuniform transforms | SDF hit tolerance and iteration limits can miss grazing/tiny details. This is bounded analytic-primitive rendering, not production mesh tracing. |
| Utility channels | Albedo, normal and depth visualization and PNG export | Not multilayer, floating-point or lossless linear-data AOV delivery. PNG is display-oriented, no OpenEXR. |
| Animation/render output | Transform keyframes, linear interpolation, scrub/play, snapshot restore, current-resolution PNG, up to 48-frame PNG ZIP sequence | Curve editor, complex rigs, render farm, background job persistence, production animation formats; queue pauses if tab closes |
| Persistence | D1 projects/members/invites/versions; local SQLite runtime; named checkpoint restore; scene import/export | Large asset storage, R2 uploads, project sizes beyond 1.5 MB, native Katana/USD/Alembic exchange |
| Collaboration | 2.5-second polling, presence, field patches, revision compare-and-swap, independent-field merge, same-field conflict copy flow, roles and expiring invites, local recovery draft | WebSocket transport, CRDT/OT, live cursors, enterprise SSO/SCIM, audit retention, disaster recovery, clustering or production security certification |
| Standalone distribution | Four ES-module packages; package tarball generator; renderer and controls examples; zero-install local Node+SQLite application | Registry publication, binary native wrappers, versioned long-term API stability, studio-scale qualification |

Hard limits: 128 objects, 32 lights, 128 materials, 256 nodes, 8 saved thumbnail snapshots, 500 comments, 1.5 MB scene JSON and 2 MB API body. CPU preview is capped at roughly 360 horizontal pixels. WebGPU render resolution is bounded to 2048×1440. The viewport resolution slider changes the active output size, and PNG capture uses that size.

Project changes are acknowledged by SQL revision. Polling is not instantaneous. When two artists change the same field, automatic saving stops with `Conflict · save a copy`; Save creates a new independent project preserving local edits. Project checkpoints and JSON exports provide explicit recoverable copies. Recovery drafts can be unavailable if browser storage is disabled or full.

The hosted site starts owner-private. Project invites grant application membership only; visitors also need permission to enter the hosted site. The bundled local server intentionally binds to loopback and represents one local user. It is not an Internet authentication server. For multi-user self-hosting, mount `server/api.js` behind a trusted identity provider and use the SQL adapter contract; do not expose the local identity adapter publicly.

## Validation status

Automated tests cover scene validation, graph cycle checks and evaluation, undo/redo, keyframe serialization/interpolation, transformed geometry, real CPU shading changes, SQL persistence, authorization and invitation expiry, stale revisions, checkpoint retrieval, pending-edit compaction, asynchronous synchronization races, and ZIP records. The Sites Worker build is verified separately.

A CPU-rendered default scene is generated and visually inspected during implementation. Browser interaction tests, rendered UI layout inspection, WebGPU pipeline execution/readback, physical-GPU/driver tests, production asset-scale benchmarks, and enterprise security qualification are not performed in this release. Static WGSL review confirms buffer layout agreement; it is not equivalent to runtime GPU qualification. Optional WebMCP registration is feature-detected; no supported browser context was available to validate it.


## GitHub Pages deployment increment

The static Pages build adds browser-local project and checkpoint persistence through IndexedDB, namespaced recovery and transactional revision checks. It intentionally does not provide multi-user invitations, authentication or server database hosting. The server adapters and migrations remain in the repository.

Validation performed for this increment: 33 Node regression tests passed, static build completed, and all four package tarballs were generated. A Chromium browser smoke script is included, but local execution was blocked by an administrator URL policy before the page loaded. No local browser-runtime pass or physical-GPU qualification is claimed for this increment; CI logs and artifacts record any subsequent browser execution separately.
