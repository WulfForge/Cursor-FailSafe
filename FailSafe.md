## FailSafe: Cursor Extension — Time-Aware, Validation-Driven Development Assistant

### 🎯 Objective

Build a lightweight, Cursor-native extension that improves code reliability and development speed by:

* Detecting AI stalls or slowdowns in real-time
* Validating generated code before applying it
* Running automated tests to confirm correctness
* Blocking hallucinated or mock data from entering production
* Presenting real-time project plan visibility to the developer
* Providing a structured execution path with active feedback and nudges
* Generating and updating UI using Cursor's built-in v0 extension system

---

## 🔎 Core Philosophy

FailSafe is more than a validation layer—it is a dynamic assistant that:

* Keeps the developer focused on the most valuable task at every moment
* Surfaces what matters: incomplete tasks, blocker alerts, unexpected delays
* Acts as a local execution timeline to ensure progress doesn't silently stall
* Builds accountability, clarity, and flow without relying on memory or context switching

This ensures full transparency, zero silent failures, and a frictionless development flow.

---

## 🧱 Architecture Overview

```
[Cursor Extension Only]
 ├── Command Registration ("Ask AI", "Refactor", "Validate")
 ├── Timeout Watchdog
 ├── Output Validator (schema/match rules)
 ├── Test Runner (CLI integration)
 ├── Logger (local .failsafe logs)
 └── Project Plan Tracker (live Gantt-style feedback, task nudge engine)
```

---

## 🧩 Full File + Directory Guide

```
failsafe-cursor/
├── extension.ts             # Extension entry point and activation logic
├── commands.ts              # Registered commands for AI interaction
├── validator.ts             # Handles schema, safety, and mock-data checks
├── testRunner.ts            # Triggers `npm test` and parses result output
├── logger.ts                # File-based logger utility (JSON structured logs)
├── projectPlan.ts           # Tracks task progress, deadlines, and critical paths
├── taskEngine.ts            # Nudges developer based on overdue tasks or stalling
├── ui.ts                    # Handles sidebar view, status bar integration, popups
├── ui.templates.ts          # Generates views via Cursor's v0 UI system
├── types.ts                 # Shared interfaces, enums, and result types
├── config.json              # Settings: timeouts, validation thresholds, toggles
├── .failsafe/               # Output folder for local logs and session states
│   └── session-*.json       # Timestamped session records
└── README.md                # Project intro, usage, install, config doc
```

---

## 🚦 Core Features (Expanded)

### ✅ AI Interaction (via Cursor API)

* Uses Cursor's native AI command pipeline to issue structured prompts.
* All interaction is done via `vscode.commands.executeCommand('cursor.ask', prompt)`.
* Captures streamed AI response tokens and buffers them for processing.
* Post-processing triggers validation and test workflow automatically before applying code.

### ✅ Timeout Watchdog

* A `setTimeout` is engaged as soon as a prompt is sent.
* If no response is returned within the defined threshold (e.g. 10 seconds), the request is aborted.
* The extension logs a timeout error and notifies the user via a non-intrusive status message.
* Optional retry logic may be added with exponential backoff or capped retries.

### ✅ Output Validator

* Runs synchronously before applying any AI-generated code.
* Checks for known hallucination patterns: placeholders like `TODO`, `lorem`, `mockData`, or incomplete syntax.
* Uses lightweight AST parsing (TypeScript Compiler API) to detect syntax correctness.
* Optionally checks local project types or definitions to confirm model accuracy.
* Blocks dangerous mutations (e.g. `rm -rf`, `console.log` in production code, or hardcoded credentials).
* Validator status is reported back to the user immediately with option to override (configurable).

### ✅ Test Runner

* After successful validation, triggers a local test run via Node's `child_process.spawn` (e.g. `npm test`).
* Parses raw stdout and stderr to detect test pass/failure status.
* If tests fail:

  * Annotates errors inline via Cursor API
  * Highlights offending lines in editor (if correlation with output is possible)
  * Offers undo or revert of model-generated block
* Test command path and timeout are user-configurable in `config.json`.

### ✅ Local Logger

* Every request, validation pass/fail, timeout, and test result is timestamped and recorded.
* Output is stored as `.failsafe/session-YYYYMMDD-HHMMSS.json`.
* Format: structured JSON with clear lifecycle traces of every model event.
* Optional CLI tool can tail these logs or filter by error/command.
* Useful for debugging or retrospective validation of AI decisions.

### ✅ Project Plan Tracker (Live Gantt Feedback)

* Monitors project state based on configured development steps.
* Each critical step updates its status in a live view (e.g. started, blocked, completed).
* Users can open a dedicated sidebar panel with a compact Gantt-style UI showing:

  * Current step
  * Elapsed time
  * Upcoming dependencies
  * Blocking conditions (e.g. test failure)
* System nudges the user when attention is needed (e.g. stalled task, missed sequence).
* Plan is configurable and can persist across sessions via `.failsafe/project.json`.

---

## 🔍 Inline Execution Task List

* [ ] Scaffold extension with `yo code`
* [ ] Register basic "Ask AI" + "Refactor" commands
* [ ] Build timeout handler with `setTimeout`/`AbortController`
* [ ] Write base validator (regex + simple AST)
* [ ] Add test trigger (use `child_process.spawn`)
* [ ] Integrate basic logging
* [ ] Add visual feedback (status bar, popups)
* [ ] Write settings schema (JSON-based)
* [ ] Implement project tracker with task state + status UI
* [ ] UI Scaffolding via v0 (Start: 2025-06-23, Duration: 2 days)
* [ ] Polish inline UI (warnings, revert)
* [ ] QA + publish to Cursor extension registry

---

## 📊 Build Progress — Gantt Overview

| Task                        | Start Date | Est. Duration | Status           |
| --------------------------- | ---------- | ------------- | ---------------- |
| Scaffold Extension          | 2025-06-13 | 1 day         | \[ ] Not Started |
| Register Commands           | 2025-06-14 | 1 day         | \[ ] Not Started |
| Timeout Watchdog            | 2025-06-15 | 2 days        | \[ ] Not Started |
| Validator Engine            | 2025-06-17 | 2 days        | \[ ] Not Started |
| Test Trigger Integration    | 2025-06-19 | 2 days        | \[ ] Not Started |
| Local Logging               | 2025-06-21 | 1 day         | \[ ] Not Started |
| Visual Feedback (status UI) | 2025-06-22 | 2 days        | \[ ] Not Started |
| Settings Schema + Config    | 2025-06-24 | 1 day         | \[ ] Not Started |
| Project Plan Tracker UI     | 2025-06-25 | 2 days        | \[ ] Not Started |
| UI Scaffolding via v0       | 2025-06-23 | 2 days        | \[ ] Not Started |
| UI Polish + Inline Revert   | 2025-06-27 | 2 days        | \[ ] Not Started |
| QA + Registry Publishing    | 2025-06-29 | 2 days        | \[ ] Not Started |

> View as Gantt chart in Notion, Mermaid.js, or Excel-style tracker for visual planning.

---

## 🔒 Contingencies

| Risk                    | Mitigation                         |
| ----------------------- | ---------------------------------- |
| AI returns garbage      | Run validator before apply         |
| Cursor API change       | Wrap usage in error fallback block |
| Test framework mismatch | Auto-detect or require config      |
| Revert fails            | Backup file before injection       |
| Gantt tracker stalls    | Auto-heal with status refresh      |

---

## 🖥️ UI Components (VS Code & Cursor)

All UI components in FailSafe are built using standard VS Code extension APIs. This includes:

* Status bar indicators (color-coded, icon-based)
* Markdown-based dashboard and log panels
* Notifications and pop-ups
* Command palette shortcuts

> Note: There are currently no Cursor-specific UI elements. All UI is compatible with both VS Code and Cursor, as Cursor supports the VS Code extension API.

### 1. Sidebar Panel (`Failsafe: Show Plan`)

* Interactive task list with icons: ⏳ In Progress, ✅ Complete, ❌ Blocked, ⚠️ Delayed
* Shows current task, elapsed time, blockers, dependencies
* Expandable entries for task detail, logs, and manual overrides

### 2. Status Bar Indicator

* Color-coded icon reflects current task status: 🟢 Normal, 🟡 Warning, 🔴 Blocked
* Hover preview: current task + time in state
* Click toggles the sidebar panel

### 3. Contextual Nudges

* Pop-ups or quick-pick prompts triggered by failure, delay, or inaction
* Options: \[Retry], \[Skip], \[Explain], \[Mark Complete], etc.

### 4. Command Palette Shortcuts

* `Failsafe: Show Plan`
* `Failsafe: Retry Last Task`
* `Failsafe: View Session Log`
* `Failsafe: Mark Task Complete`

### 5. State Persistence

* `.failsafe/project.json` tracks user-facing task state
* `.failsafe/session-*.json` stores session history with timestamps and results

### 6. Cursor v0 UI Integration

* All views generated via Cursor's native v0 UI system
* View templates managed in `ui.templates.ts`
* UI update tasks explicitly tracked in build schedule

---

## ✅ End Condition

* [ ] All AI suggestions are gated by timeout, validator, test pass, and project task awareness
* [ ] Errors and progress are logged and visible
* [ ] Users always know what they should be working on

---

## 🧠 Name Evaluation

**FailSafe** is now official:

* ✅ Highlights purpose: fallback, safety, and protection
* ✅ Clear and strong name with high relevance
* ✅ Available and memorable
