# Real Life Context Switching

A minimal, fast desktop task runner that enforces single-task focus and gives lightweight recommendations. Built with Tauri (Rust backend) and React + Vite + MUI (frontend).

## User

### What is this?
Real Life Context Switching is a tiny task app optimized for doing one thing at a time. It:
- Keeps all tasks in memory while running and exports them to a JSON file on exit.
- Enforces single-threading: starting a task parks the rest.
- Scores tasks using only two transparent signals:
  - Aging: how long since you last touched it (0/1/2/3 tiers).
  - Batch bonus: small boost for tasks sharing the current context tag within the past hour.
- Auto-archives done tasks from previous days, keeps archives forever.
- Soft delete: tasks marked Deleted are permanently removed after 30 days.

### Install
Prebuilt installers are attached to GitHub Releases.
- Go to the Releases page and download the installer for your OS.
- macOS: you may need to allow the app in System Settings > Privacy & Security if unsigned.

Data location (macOS example):
- Export file: `~/Library/Application Support/com.natts10.reallifecontextswitching/tasks-export.json`

### Use
- Add: type a tag and a title; press Add. The new task becomes Active and parks others.
- Current task: the top "Now" card shows the active task. Use Park or Done there.
- List: shows non-archived, non-deleted tasks (Active is hidden from the list).
- Resume: use the Resume button on any row to make it Active.
- Scores: toggle "Show scores" to reveal aging/batch breakdown and the total score.
- Close the window to export tasks. On next launch, tasks are restored; active is parked.

Notes
- Active task is excluded from recommendations, to avoid suggesting itself.
- Archived tasks are hidden in the UI but kept forever. Deleted are hidden and auto-purged after 30 days.

## Developer

### Prerequisites
- Node.js 20+
- Rust toolchain (stable)
- macOS: Xcode CLT; Linux: GTK/WebKit deps (see CI below); Windows: Visual Studio Build Tools

### Run in browser (frontend only)
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Browser mode uses a LocalStorage fallback and does not export on close.

### Run desktop (Tauri dev)
```
cd frontend
npm install
npm run tauri:dev
```
This launches the Tauri window, wiring the React UI to Rust commands. Export-on-close and archiving work here.

### Build desktop bundle locally
```
cd frontend
npm install
npm run tauri:build
```
Artifacts will be under `src-tauri/target/release/bundle`.

### Scripts
From `frontend/package.json`:
- `dev`: Vite dev server
- `dev:web`: alias of dev
- `build`: production build of web assets
- `build:web`: alias of build
- `preview`: preview built web assets
- `tauri:dev`: run Tauri dev
- `tauri:build`: build Tauri bundle

### Release (CI)
Pushing a SemVer tag triggers CI to build installers for macOS, Windows, and Linux and attach them to the release.
```
git tag v0.2.0
git push origin v0.2.0
```
The workflow validates the tag (vX.Y.Z or vX.Y.Z-prerelease), writes the version into `src-tauri/tauri.conf.json`, builds, and uploads artifacts. Optional signing can be configured with repository secrets.

### Code layout
- `src-tauri/src` (Rust)
  - `main.rs`: app wiring, import-on-start, export-on-close (parks active, clears batch context)
  - `types.rs`: Task, Status (Active, Parked, Blocked, Archived, Deleted), AppState
  - `commands.rs`: Tauri commands (CRUD, status, recommend, scored/sorted, soft delete)
  - `domain.rs`: pure recommendation/sorting (excludes Active, Archived, Deleted)
  - `score.rs`: aging + batch scorer
  - `housekeeping.rs`: daily archive sweep, 30-day hard-delete sweep
  - `persistence.rs`: import/export JSON
- `frontend/src` (React)
  - `pages/Home.tsx`: main screen, current task card, list, scores toggle
  - `components/TaskRow.tsx`: task row with Resume/Remove, chips, optional scoring details
  - `components/RecPanel.tsx`: next suggestion
  - `services/tasks.ts`: calls backend commands; hides Archived/Deleted
  - `api.ts`: Tauri invoke + browser fallback

### Contributing
PRs welcome. Consider tests for housekeeping sweeps and scoring changes.
