**FailSafe Extension for Cursor AI**\
**UI Implementation Specification (Final)**

---

### 🔢 Overview

This document serves as the master specification for implementing the FailSafe Extension UI within Cursor AI. It outlines a complete, non-ambiguous interface design, layout responsibilities, interactivity scope, and data handling expectations. Cursor engineers are responsible for building based on this specification. No UI behavior or visual element should be implemented outside this structure without explicit change control.

---

### 🧭 Design Document Requirement

**Purpose:** Establish a reliable baseline for intent, cohesion, and scope detection throughout development.

**Trigger:** On opening a new workspace, the user is prompted to either:
- Create a new Design Document using the built-in Design Wizard
- Import an existing Design Document (Markdown or JSON)

**Functionality:**
- Prompt appears only once per workspace unless reset
- The Design Document captures:
  - Project Purpose & Audience
  - Styling Principles & Theme Affinities
  - Key Features and Required Behaviors
  - Visual References (optional image upload or external links)
  - Interaction Constraints
  - Security/Compliance Considerations
- Validation: This document will be referenced by the "Check for Drift" function to assess whether current code, sprint tasks, or outputs diverge from the original plan
- The design document is version-controlled and displayed as read-only from within the Console

**Storage:**
- Stored in `.failsafe/design-doc.md` in the project root
- Includes a JSON index used internally to validate feature drift

**UI Placement:**
- New prompt handled by workspace initialization logic
- Accessible from:
  - 📊 Dashboard (Compliance Card → “View Design Doc”)
  - 💻 Console (Settings Panel → “Manage Design Document”)
  - 🗓 Sprint Plan (optional: reference as metadata during Sprint creation)
  
---

### 🔁 Tabs & Structure

#### 📊 Dashboard (Read-Only Reporting View)

**Purpose:** Centralized view of performance and validation effectiveness.

**Sections:**

- **Summary Metrics (Top Panel)**

  - Active Sprints
  - Total Tasks
  - Completion %
  - Validations Run
  - Rules Enabled
  - Validation Success Rate
  - Drift Events
  - Hallucinations
  - Auto-Fixes by FailSafe

- **Effectiveness Charts (Center Panel)**

  - Bar & Line graphs for weekly velocity, validation types, drift trends, hallucination sources
  - Dropdown to group by: Sprint, Rule, Validation Type, Date Range

- **FailSafe Success (Bottom Panel)**

  - % of errors flagged vs missed
  - Time saved
  - Accuracy of passive vs manual validations

- **Alerts & Compliance (Side Panel)**

  - Toast-triggered notifications with click-through to relevant tab
  - Compliance Card: current compliance %, top failures

**Interactivity:** View toggles and filters only. No edits or actions.

---

#### 💻 Console (Quick Actions & Settings)

**Purpose:** Direct user control of validation processes and system behavior.

**Sections:**

- **System Status**

  - Cursor Connected: 🟢 / 🔴
  - Detected Cursor Version
  - Last Sync Timestamp

- **Quick Actions Panel**

  - Validate Chat (Manual)
  - Check for Drift
  - Version Check (Mismatch, Suggest Bump)
  - Auto-Bump Version
  - Compile + Package
  - Install Extension (VSIX)
  - Reload Cursor Window

- **Settings Panel**

  - Cursor Path (detected or manual override)
  - Rule Sync Interval (Dropdown)
  - Logging Verbosity (Normal / Verbose / Debug)

---

#### 🗓 Sprint Plan (Sprint + Task Management)

**Purpose:** Sprint lifecycle control and task-level validation.

**Layout:**

- **Left Panel: Sprint List**

  - Status Filters: Building, Active, Complete
  - Sprint Cards: Name, Status Badge, End Date Countdown
  - Actions: Create, Import (Markdown / Chat), Export (Markdown)

- **Right Panel: Selected Sprint Detail**

  - Sprint Summary: Name, Status, Dates, Metrics
  - Sprint Archive Tab (Expandable Panel)
  - Forecast View (Placeholder Box)

- **Tasks Subsection**

  - Drag-and-drop reorderable tasks
  - Task Cards: Name, Status, Dependencies (visual), Edit/Delete/Complete
  - Add Task / Create From Template
  - Review Chat button (opens context)
  - Blockers listed inline with notes

---

#### 🔒 Cursor Rules

**Purpose:** Define and manage validation standards.

**Table Columns:**

| Rule Name | Category | Enabled | Trigger Count | Last Triggered | Type | Actions |
| --------- | -------- | ------- | ------------- | -------------- | ---- | ------- |

**Actions:**

- Add New Rule (Wizard)
- Add from Template (Dropdown)
- Edit (custom only)
- Delete (custom only)
- Toggle Enable/Disable (all)
- View Trigger History

**UI Detail:**

- Predefined rules are styled distinctly
- Each rule has embedded validation logic summary on hover or expand

---

#### 📘 Logs (Full System Audit Trail)

**Purpose:** Track every action, validation, trigger, and rule event.

**View:**

- Default: Recent Unfiltered Activity
- Columns: Timestamp, Type, Description, Rule/Trigger, Related Task ID, Rationale (expandable)
- Optional User Column: Disabled unless multi-user support added

**Filters:**

- Type: Validation, Rule Trigger, Task Change, System, Versioning, Drift
- Time Range: Date Picker
- Keyword Search

**Actions:**

- Export Filtered or All (JSON, CSV)
- Clear Logs (Confirmation modal)

---

### 📊 JSON Schema for Logs

**Schema Name:** `failsafe_log_entry`

```json
{
  "timestamp": "2025-06-25T14:23:00Z",
  "type": "validation | rule_trigger | task_event | system | drift | version",
  "description": "string",
  "rule_id": "optional string",
  "task_id": "optional string",
  "rationale": "optional string",
  "user_id": "optional string (reserved)",
  "severity": "info | warning | critical"
}
```

---

### 🎨 Hearthlink Global Theme

**Purpose:** Ensure a cohesive visual identity across the FailSafe extension.

**Design Language:**

- Dark interface with high-contrast readable text
- Neutral charcoal and slate gray backgrounds (#121417, #1E1F24)
- Interface accents in electric blue (#00BFFF), soft violet (#9B59B6), and reactive success green (#2ECC71)
- Red (#E74C3C) for errors, soft amber (#F39C12) for warnings
- Background hover states with subtle elevation using lightened gray or soft blue highlights
- Rounded components with slightly angular edges (not pill-shaped)
- Font: Clean geometric sans-serif (e.g., Inter or IBM Plex Sans)

**Inspirational References:**

- Visual hierarchy and contrast: Linear.app
- Layout density and grid: Vercel Dashboard
- Color expressiveness: VS Code Dark+ Theme
- Structural modularity: Notion UI Blocks

**Component Usage:**

- Cards for all containers
- Tabs with clear hover and selection states
- Toggle switches consistent with rule controls
- Button coloring and behavior reflect semantic meaning (primary, danger, confirm)
- Toasts styled with glowing edges matching severity (green/blue/orange/red)

---

### 💼 Responsibility Assignment

- Cursor team is responsible for rendering, storing, and executing all logic specified herein.
- UI behavior outside this spec is not authorized for build.
- All future feature changes must be approved by Kevin in writing.

---

**END SPECIFICATION**

