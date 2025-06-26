# FailSafe Extension – Design Document (o3-accountable.md, v1.0.1)

> Scope – This document covers every functional and technical detail required to build the FailSafe validation extension for Cursor AI / VS Code. Nothing outside this scope is referenced.

---

## 1 Purpose

FailSafe gives developers a local safety net that validates AI‑generated code, enforces configurable rules, tracks sprint health, and flags scope drift directly inside the editor. It never calls a cloud service unless the user explicitly adds integrations.

---

## 2 Guiding Principles

1. Own the code – We follow Fastify's philosophy (small, plugin based, schema first) but write every line ourselves.
2. Local first – All logic runs inside the VS Code extension host. Ports bind to 127.0.0.1 or IPC only.
3. Single dependency – fastify plus @types/fastify is the only server runtime we ship.
4. Deterministic builds – TypeScript, ESBuild, PNPM optional keep artifacts reproducible.

---

## 3 High Level Architecture

```
+----------------------+       +-------------------+
| VS Code UI WebView   | <---> | Fastify Server    |
|  • Dashboard         |   WS  |  • Routes         |
|  • Console           |  /SSE |  • Plugins        |
|  • Sprint Plan       |       |  • In‑memory DB   |
+----------------------+       +-------------------+
         ^                               |
         |                               v
         |                    .failsafe/* JSON files
         |                         (design‑doc, logs,
         |                          sprints, rules)
```

*Activation flow* – `extension.ts` boots, spins up Fastify, registers plugins, then tells the WebView the port via `vscode.postMessage`.

---

## 4 Fastify Usage

| Core Feature                                                | How We Use It                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `fastify()`                                                 | Creates the local API surface.                                                                             |
| Route registration                                          | Defines REST endpoints listed in §5.                                                                       |
| Built‑in AJV schemas                                        | Validates request and response bodies.                                                                     |
| Decorators                                                  | Stores `rulesStore`, `sprintStore`, `metrics`, `eventBus`.                                                 |
| Lifecycle hooks                                             | `onRequest` stamps UUID and timestamp; `preValidation` runs static checks; `onError` pushes to log buffer. |
| Plugin system                                               | Each logical module below is one plugin file.                                                              |
| Logging (Pino)                                              | Logs to in‑memory ring buffer displayed in **Logs** tab.                                                   |
| SSE helper (`fastify-sse-v2` optional)                      | Streams real‑time metrics to WebView. If omitted, fallback to polling.                                     |
| No other Fastify plugins or third‑party tools are required. |                                                                                                            |

---

## 5 API Surface

| Method                                                          | Route         | Request Schema     | Response Schema                      | Description                           |                                          |
| --------------------------------------------------------------- | ------------- | ------------------ | ------------------------------------ | ------------------------------------- | ---------------------------------------- |
| POST                                                            | `/validate`   | `{files:string[]}` | \`{status:"pass"                     | "fail", results\:ValidationResult}\`  | Runs selected validators on given files. |
| POST                                                            | `/rules`      | `RuleDTO`          | `RuleDTO`                            | Create new rule.                      |                                          |
| PATCH                                                           | `/rules/:id`  | `Partial<RuleDTO>` | `RuleDTO`                            | Update rule.                          |                                          |
| GET                                                             | `/rules`      | –                  | `RuleDTO[]`                          | List all rules.                       |                                          |
| POST                                                            | `/sprints`    | `SprintDTO`        | `SprintDTO`                          | Create sprint.                        |                                          |
| GET                                                             | `/sprints`    | –                  | `SprintDTO[]`                        | List sprints.                         |                                          |
| POST                                                            | `/tasks`      | `TaskDTO`          | `TaskDTO`                            | Create task.                          |                                          |
| GET                                                             | `/status`     | –                  | `{version, port, activeValidations}` | Returns heartbeat.                    |                                          |
| GET                                                             | `/events`     | –                  | **SSE**                              | Streams validation and metric events. |                                          |
| GET                                                             | `/metrics`    | range query        | `{charts:MetricPoint[]}`             | Aggregated project metrics.           |                                          |
| GET                                                             | `/design-doc` | –                  | Markdown string                      | Returns current design document.      |                                          |
| All schemas are defined with TypeBox and registered at startup. |               |                    |                                      |                                       |                                          |

---

## 6 Data Models (stored as JSON under `.failsafe/`)

```ts
// Rule
{
  id: string,
  name: string,
  category: "lint" | "security" | "style" | "custom",
  enabled: boolean,
  triggerCount: number,
  lastTriggered?: string,
  logic: string // JS snippet or reference key
}
// Sprint
{ id, name, start, end, status: "building" | "active" | "complete", velocity: number }
// Task
{ id, sprintId, name, status, dependsOn: string[] }
// Log Entry – see failsafe_log_entry schema in UI spec
```

---

## 7 UI Binding (from `failsafe_ui_specification.md`)

... (content unchanged) ...

### 7.1 MythologIQ Theme Tokens

*Extracted from **MythologIQ Brand Map v1.0** (Apr 30 2025).* These tokens lock down the visual language so Cursor cannot drift.

| Token                    | HEX                         | Usage                             |
| ------------------------ | --------------------------- | --------------------------------- |
| --color-obsidian         | #0b0c10                     | Default background, panel headers |
| --color-indigo-veil      | #1e1b35                     | Secondary surface, sidebar        |
| --color-mythic-gold      | #e4b868                     | Primary accent (buttons, charts)  |
| --color-halo-white       | #f7f7f7                     | Base text / high‑contrast text    |
| --color-holographic-teal | #7efeff                     | Active state glow, links          |
| --color-slate-grey       | #353945                     | Disabled controls, borders        |
| --color-earthen-bronze   | #b48c6e                     | Info banners, secondary icons     |
| --color-mist-blue        | #cad8e1                     | Card backgrounds, dividers        |
| --font-display           | 'Playfair Display', serif   |                                   |
| --font-sans              | 'Inter', system-ui          |                                   |
| --font-code              | 'JetBrains Mono', monospace |                                   |
| --radius-lg              | 12px                        | Cards, modals                     |
| --duration-short         | 150ms                       | Hover transitions                 |

**WCAG Notes** – Color pairs <code>--color-holo-white</code> on <code>--color-indigo-veil</code> and <code>--color-mist-blue</code> on <code>--color-obsidian</code> meet AA contrast.

Cursor must import these tokens in `base.css` *before* Tailwind layers:

```css
:root {
  --color-primary: var(--color-mythic-gold);
  --color-surface: var(--color-indigo-veil);
  ...
}
```

Fastify `/design-doc` endpoint now serves this section, so spec‑gate will fail if any token is referenced but missing.

---

## 8 Extension Development Workflow

1. `pnpm install`
2. `pnpm run watch` – ts‑node watches `src/**/*.ts`, rebuilds extension on save.
3. Launch VS Code in Extension Development Host via `F5`.
4. `pnpm run test` – Jest unit tests for plugins and rule logic.
5. `pnpm run package` – uses `vsce` to create VSIX.
   No Docker, CI, or global CLIs required.

---

## 9 Non‑Functional Requirements

* **Offline operation** – works with zero network.
* **Performance** – First validation under 200 ms for 50 files or fewer.
* **Memory** – 150 MB RSS at idle maximum.
* **Security** – No stdout of user code, all logs remain local.
* **Accessibility** – UI colors meet WCAG AA.

### 9.1 Immediate Fastify Course‑Correction Add‑ins

Below are Fastify elements we **should** introduce right now (during the recovery sprint) because they give an instant stability or visibility boost and require almost no extra tooling.

| Plugin / Pattern      | Lines of code | Purpose                                                                                               | Immediate Benefit                                                                       |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **fastify‑spec‑gate** | \~60 LOC      | Reads `failsafe_ui_specification.md` and fails validation/build if UI components drift or go missing. | Prevents partial UI builds; gives hard "red light" feedback so devs stop and fix early. |
| **fastify‑event‑bus** | \~40 LOC      | Decorates the server with an event emitter and exposes `/events` via SSE.                             | Streams dev errors, rule hits, and spec violations live into the Logs tab—no polling.   |
| **fastify‑health**    | \~20 LOC      | `/health` endpoint returns server + plugin status flags.                                              | CI can instantly fail the build if anything is unhealthy.                               |

Implementation notes:

* Pure TypeScript; depends only on Fastify core.
* Registered in `extension.ts` right after core routes.
* Adds no external services or build steps — just commit, install, run.

```ts
app.register(fastifySpecGate, { specPath: specMdPath });
app.register(fastifyEventBus);
app.register(fastifyHealth);
```

### 9.2 Opportunistic Fastify Enhancements We **Could** Slip In

These are slightly larger but still safe to weave into the current cycle **if** Cursor finishes the immediate fixes early.

| Enhancement                        | Effort       | Why it could be worth doing now                                                                               |
| ---------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| **TypeBox schema export**          | \~1‑2 hrs    | Gives typed DTOs to front‑end code, reducing runtime errors without big refactor.                             |
| **fastify‑plugin‑autoloader**      | \~1 hr setup | Auto‑loads plugins from `src/plugins`. Keeps new features modular; reduces merge conflicts in `extension.ts`. |
| **Request logging to ring buffer** | \~40 LOC     | Makes the Logs tab show every request/response pair for debugging.                                            |

### 9.3 Fastify Ideas Best Deferred to a Future Cycle

| Idea                          | Reason to defer                                                 | Rough Cost    |
| ----------------------------- | --------------------------------------------------------------- | ------------- |
| **Prisma‑backed persistence** | Current spec uses JSON files; adding DB now adds risk and time. | 1 dev week    |
| **GraphQL endpoint layer**    | Overkill while the REST surface is small.                       | 3‑4 dev weeks |
| **Auth middleware**           | Not needed in single‑user offline mode.                         | 2 dev weeks   |

### 9.4 Preventive Innovations (New)

| Feature Idea                           | Lines of Code | Failure Mitigated                                        | Brief Description                                                                                                                 |
| -------------------------------------- | ------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Spec Heatmap Overlay**               | \~50 LOC UI   | Spec drift went unnoticed                                | Dashboard tile that visually maps spec sections to implementation status (green = present, red = missing).                        |
| **Snapshot Diff Validator**            | \~120 LOC     | Repeated blind retries without root‑cause identification | After each save, creates a structural JSON snapshot of UI state; validator highlights any unintended deletions between snapshots. |
| **Auto‑stub Generator for Missing UI** | \~80 LOC CLI  | Missing tabs compiled silently                           | When spec‑gate fails, CLI auto‑creates stub components with TODO banners so build passes visibly but cannot be shipped.           |
| **Rule Regression Watchdog**           | \~90 LOC      | Lint/security rules disabled by mistake                  | Watches `rulesStore`; if a previously enabled rule is toggled off on branch, emits SSE alert and blocks merge unless approved.    |
| **Stakeholder Sign‑off Token**         | \~60 LOC      | Cursor shipped cosmetic fixes without user confirmation  | Adds `/signoff` route; VS Code button generates token when you approve a sprint slice. CI requires matching token before release. |
| **Interactive Failure Replay Panel**   | \~110 LOC UI  | Hard to trace cascade of errors                          | Logs tab gains "Replay" mode to step through event timeline, highlighting code lines causing each failure.                        |

### 9.5 Live UI Preview Panel (NEW REQUEST)

> **Goal** – Provide a real‑time visual preview of each FailSafe WebView tab inside Cursor so developers can verify layout and theme without rebuilding or packaging.

| Component                  | Implementation Notes                                                                                                                                | Effort                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Fastify /preview route** | `GET /preview?tab=dashboard` renders the requested tab to static HTML string via ReactDOMServer. Returns markdown or raw HTML.                      | \~40 LOC back‑end      |
| **Preview WebView panel**  | VS Code `WebviewPanel` opened via command **FailSafe: Open Preview**. Hosts an iframe that points to `http://127.0.0.1:<port>/preview?tab=current`. | \~60 LOC front‑end     |
| **Hot‑reload listener**    | Uses `vscode.workspace.onDidSaveTextDocument` to refresh the iframe automatically after each file save.                                             | \~20 LOC front‑end     |
| **Toggle command**         | Adds palette command **FailSafe: Toggle Preview Sync** to enable/disable auto‑refresh.                                                              | \~10 LOC               |
| **Spec‑gate overlay**      | If `/preview` detects missing required elements, overlays a red banner indicating which spec sections are absent.                                   | Reuses spec‑gate logic |

**Minimal flow**

1. Developer presses **Ctrl+Shift+P → FailSafe: Open Preview**.
2. Extension spawns (or focuses) the *FailSafe Preview* panel.
3. Panel loads `/preview?tab=dashboard` by default; tab selector at top lets dev jump between Dashboard, Console, etc.
4. On file save, auto‑refresh fires unless toggled off.
5. If spec‑gate reports missing UI pieces, preview shows banner with actionable list.

*All code lives inside the extension; no external servers or ports beyond localhost.*

**Backlog hook** – Once stable, we can add diff snapshot overlay to show before/after pixel diff for UI regression testing.

### 9.6 Automated Self‑Gate & Snapshot Rollback (NEW)

To guarantee design adherence when Cursor writes directly to the workspace—with no human PR review—we introduce two **always‑on safety mechanisms** that sit below the editor:

| Component                                     | Implementation Notes                                                                                                                                                                                                                                                                                                                           | Effort                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **fastify‑fs‑gate** (file‑system change gate) | • Uses `chokidar` to watch workspace.• Intercepts every file write.• Runs `tsc --noEmit`, `eslint --max-warnings 0`, and `spec-gate` **before** allowing the write.• If any check fails, the gate aborts the write and writes `{filename}.failsafe-error.json` describing the violation.• Cursor then sees the failure and retries with a fix. | ≈ 90 LOC back‑end + 30 LOC helper CLI |
| **Snapshot Rollback**                         | • After every *successful* gated write, FailSafe copies the changed file(s) to `.failsafe/snapshots/YYYYMMDD-HHmmss/`.• On any subsequent gate failure, FailSafe automatically restores the last green snapshot so the project never lands in a broken state.• Snapshot size is bounded (LRU delete beyond 50 versions).                       | ≈ 70 LOC back‑end                     |

*Operation flow*

1. Cursor attempts to write `src/ui/dashboard.tsx`.
2. `fastify-fs-gate` blocks, runs checks; `eslint` fails → gate aborts.
3. FailSafe returns error JSON; Cursor fixes and retries.
4. Second write passes; snapshot saved.

These safeguards eliminate broken builds, corrupted files, and spec drift **before** they reach disk, fulfilling the “own the code” and “deterministic build” principles.

## 10 Out of Scope

* Cloud deployment, account systems, multi‑user collaboration.
* Hearthlink or other suite integration.
* **Cursor Background Agents** – the feature incurs additional usage fees and is therefore deferred. Continuous validation is handled instead by the always‑on `fastify‑fs‑gate` watcher (§9.6). A future free alternative may be reconsidered and is logged in the wishlist (H‑11).

---

## 11 Implementation Spikes and Decision Records

To close the remaining unknowns we will run three time‑boxed research spikes. Each spike produces a decision log in `.failsafe/decisions/{date}-{topic}.md`.

| Spike ID | Topic                              | Time box   | Activities                                                                                                                             | Decision artifacts                                                                                                |
| -------- | ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| SP‑001   | Mutation testing engine selection  | 1 dev day  | • Create mini repo with four TS files. • Run StrykerJS and capture runtime and mutant kill rate. • Compare with Jest coverage.         | `decision-mutation-testing.md` containing chosen engine, config snippet, performance numbers.                     |
| SP‑002   | Rule logic sandboxing              | 1 dev day  | • Prototype vm2 sandbox and native Function fallback. • Inject malicious rule to confirm file system and network isolation.            | `decision-sandboxing.md` containing default sandbox choice, flag for unsafe eval, performance notes.              |
| SP‑003   | Hallucination detection heuristics | 2 dev days | • Instrument validator to flag files missing tests that modify critical paths. • Prototype regex citation checker for dangling claims. | `decision-hallucination-heuristics.md` containing accepted heuristics for v3.0 and backlog items for ML detector. |

### After each spike

1. Update section 6 Data Models if new fields are required.
2. Update validator plugin with chosen approach.
3. Mark spike complete in the Sprint Plan board.

---

## 12 Handoff Checklist to Cursor Build Team

1. Clone repository and run `pnpm install`, `pnpm run watch` to start extension host.
2. Review this design document and decision logs in `.failsafe/decisions`.
3. Implement Fastify plugins per section 4.
4. Complete any TODOs tagged `//cursor` in code stubs.
5. Verify acceptance criteria in Non‑Functional Requirements.
6. Package VSIX via `pnpm run package` and attach to release draft.
7. Attach updated design doc and decision logs in release assets.

---

## 13 Sprint Progress Log

| Date       | Milestone                                            | Key Outcomes                                                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025‑06‑26 | **Phase 1 – Fastify Course Corrections**             | • FastifyServer class with dynamic port• Integrated fastify‑spec‑gate, fastify‑event‑bus, fastify‑health• TypeScript compile errors resolved• RealChartDataService providing live data• UI structure cleaned; missing methods added           |
| 2025‑06‑27 | **Phase 2 – UI Structure Completion**                | ✅ Hard‑gate passed – 0 TS errors, ≤ 49 ESLint warnings, spec‑gate 100 % compliance. Attachments: `eslint-report.html`, `spec-gate-report.json`.                                                                                               |
| 2025‑06‑27 | **Phase 3 – Fastify Enhancements**                   | ✅ Fully compliant – metrics endpoint, SSE events, plugin autoloader, TypeBox schema export, request log, Console & Logs UI live, Jest coverage ≥90 %. Attachments: `eslint-report.html`, `spec-gate-report.json`, Console & Logs screenshots. |
| –          | **Phase 4 – Preventive Innovations & Preview Panel** | *Validation pending – work not yet started.*                                                                                                                                                                                                  |

\---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | | 2025‑06‑26 | **Phase 1 – Fastify Course Corrections** | • FastifyServer class with dynamic port• Integrated fastify‑spec‑gate, fastify‑event‑bus, fastify‑health• TypeScript compile errors resolved• RealChartDataService providing live data• UI structure cleaned; missing methods added |

---

\| 2025‑06‑26 | **Phase 1 – Fastify Course Corrections** | • FastifyServer class with dynamic port• Integrated fastify‑spec‑gate, fastify‑event‑bus, fastify‑health• TypeScript compile errors resolved• RealChartDataService providing live data• UI structure cleaned; missing methods added | | 2025‑06‑27 | **Phase 2 – UI Structure Completion** | ✅ Hard‑gate passed – 0 TS errors, ≤ 49 ESLint warnings, spec‑gate 100 % compliance. Attachments: `eslint-report.html`, `spec-gate-report.json`. |

---

## 14 Validation Audit (2025‑06‑27 UPDATE)

Phase 3 hard‑gate run achieved full compliance:

* **TypeScript** – 0 errors
* **ESLint** – ≤ 49 warnings (see `eslint-report.html`)
* **Spec‑gate** – 100 %
* **Coverage** – ≥ 90 % on new endpoints
* **fastify‑fs‑gate** – no violations

All Phase 3 acceptance criteria are met. Phase 3 is officially closed.

## 15 Hardships & Lessons Learned (Wishlist Input) Hardships & Lessons Learned (Wishlist Input) Hardships & Lessons Learned (Wishlist Input)

| #    | Hardship Encountered                                                           | Lesson Learned                                                | Wishlist / Improvement Idea                                                                   |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| H‑1  | **Spec drift despite design doc present** – UI built before endpoints existed. | Specs must be executable, not static.                         | Auto‑generate TODO stubs for any unimplemented route/tab (see 9.4 Auto‑stub Generator).       |
| H‑2  | **No automated gates early on** – Errors and warnings accumulated.             | Gates must run pre‑write, not post‑merge.                     | fastify‑fs‑gate now does this; consider adding "warning‑budget" gate configurable per sprint. |
| H‑3  | **Binary file corruption slipped in** (`chartDataService.ts`).                 | Need file integrity check on every save.                      | Add checksum + UTF‑8 validation inside fs‑gate.                                               |
| H‑4  | **Cursor pausing to ask next steps** – human guidance loop.                    | Provide single authoritative task list with stop conditions.  | Extend `/tasks` endpoint with "blocking" field; Cursor reads and blocks until done.           |
| H‑5  | **High ESLint warning debt** slowed velocity.                                  | Treat warnings as errors early.                               | Set `eslint --max-warnings 0` by default; allow per‑sprint override via config panel.         |
| H‑6  | **Mock data lingered** in UI after backend changes.                            | Bind UI to live endpoints first, then build features.         | Introduce "mockDataDisabled" flag that fails spec‑gate if found.                              |
| H‑7  | **No owner per API slice** – tasks floated.                                    | Single‑responsibility ownership critical.                     | Add `owner` field to Sprint and Task models; dashboard heat‑map shows orphaned items.         |
| H‑8  | **Validation report manual** – ran sporadically.                               | Validation should auto‑commit report after every green build. | CI step to push `compliance-report.json` to repo on success.                                  |
| H‑9  | **Warning threshold negotiation** consumes time.                               | Hard budget numbers avoid debate.                             | Configurable "warning\_budget" in `.failsafe/config.json`; fs‑gate reads it.                  |
| H‑10 | **No persistence layer early** – blocked API progress.                         | Implement minimal JSON storage first, database later.         | Scaffold `.failsafe/*.json` files during project init wizard.                                 |

*(Wishlist table to be reviewed each sprint and items promoted to backlog as needed.)*

---

End of Document
