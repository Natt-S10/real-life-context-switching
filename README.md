# Real Life Context Switching - Tauri App

A minimal Tauri desktop app that tracks tasks in memory. The UI is plain HTML/CSS. All logic is in Rust. Tasks are stored in-memory during runtime and automatically exported to a JSON file on app exit.

## Features
- Add tasks with title and optional notes
- Mark tasks as done/undone
- Remove tasks
- List tasks (live render)
- Persist on exit: exports JSON to `tasks-export.json` in the app data dir

## Build & Run
Prerequisites:
- Rust (stable)
- Node.js (only for tooling of Tauri CLI; no bundlers used)
- Tauri CLI

Install prerequisites (macOS):
- Rust: https://www.rust-lang.org/tools/install
- Tauri deps: `xcode-select --install`
- Tauri CLI: `cargo install tauri-cli`

Run in dev:
```
cargo tauri dev
```

Build release app:
```
cargo tauri build
```

## Project Structure
- `frontend/` - static HTML/CSS (no JS logic besides invoking Tauri commands)
- `src-tauri/` - Rust + Tauri configuration
  - `src/main.rs` - Tauri commands and app state
  - `tauri.conf.json` - points to `../frontend` as dist and dev paths

## Notes
- The app keeps tasks only in memory while running. On close, it writes all tasks to a JSON file for exporting purposes. On next launch, it does not auto-import; this is by design per brief.
