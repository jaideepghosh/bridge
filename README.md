<div align="center">

<h1>Bridge</h1>

<p><strong>A lightweight REST API testing and documentation workbench built for developers.</strong><br/>
Test local and remote APIs without CORS issues using a fast, desktop-grade client.</p>

[![GitHub release](https://img.shields.io/github/v/release/jaideepghosh/bridge)](https://github.com/jaideepghosh/bridge/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](#installation)
[![Built with Tauri](https://img.shields.io/badge/desktop-Tauri%20v2-orange.svg)](https://tauri.app)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**Download**](#installation) · [**Documentation**](#usage) · [**Report a Bug**](https://github.com/jaideepghosh/bridge/issues) · [**Request a Feature**](https://github.com/jaideepghosh/bridge/issues)

</div>

---

## Overview

Bridge is an open-source REST API testing and documentation workbench. It lets you craft, send, inspect, and organize HTTP requests — with zero CORS limitations, real filesystem persistence, and a native desktop feel.

Whether you're debugging a local microservice, exploring a third-party API, or building living documentation for your team, Bridge gives you the tools to work fast and stay organized.

**Why Bridge?**

- **No CORS headaches** — the desktop client bypasses browser restrictions entirely.
- **Collections & environments** — organize requests into folders, parametrize with variables.
- **cURL import** — paste any `curl` command and Bridge builds the request for you.
- **Auth support** — Bearer, Basic, API Key, and OAuth flows out of the box.
- **Reusable examples** — save response examples alongside your requests for instant documentation.
- **Works offline** — all data lives on your filesystem in a plain `bridge-data.json` file. No cloud, no account required.

---

## Screenshots

**Request builder & response viewer**
![Request builder with JSON response](https://github.com/user-attachments/assets/36b64a5f-b37a-4f06-b83d-0cb1a1363f8b)

**Environment manager**
![Environment manager dialog](https://github.com/user-attachments/assets/1ff524ef-9d9d-408d-8b54-996878370e84)

**Choose Your Workspace Storage Location**
![Choose Your Workspace Storage Location](https://github.com/user-attachments/assets/33443409-09ae-4826-b55e-f393c2c74a28)

**Keyboard shortcuts reference**
![Choose Your Workspace Storage Location](https://github.com/user-attachments/assets/b31a272e-90d8-4ac7-8db2-c5fd60cf0c4b)

**cURL Import**
![Paste a cURL command and start testing APIs in seconds.](https://github.com/user-attachments/assets/e08bca04-3956-46e0-8a0f-b110677f725b)

---

## Features

### Collections & Folders
Organize requests in nested collections. Drag-and-drop to reorder. Import and export as JSON.

<div align="center">
    <img width="294" height="273" alt="image" src="https://github.com/user-attachments/assets/3f850e71-9d59-41d8-a1fa-3d3eeef26645" />
</div>

### Environments & Variables
Define environments (development, staging, production) with key-value variable sets. Reference variables anywhere using `{{variableName}}` syntax — in URLs, headers, query params, auth config, and request bodies. Hover over a variable to preview its resolved value.


<div align="center">
    <img width="508" height="184" alt="image" src="https://github.com/user-attachments/assets/d91472ec-b5f9-4d68-809d-3be3ac568e33" />
</div>

### cURL Import
Paste any `curl` command. Bridge parses the method, URL, headers, and body and populates the request builder automatically.

### Request Builder
A full-featured request editor with tabs for Params, Headers, Auth, Body (JSON, form-data, URL-encoded, raw), and Pre-request scripts.


<div align="center">
    <img width="1176" height="273" alt="image" src="https://github.com/user-attachments/assets/69b0e235-7a56-4a80-950b-d2eff65bd354" />
</div>

### Response Viewer
Inspect responses with syntax-highlighted JSON/XML/HTML rendering, raw view, headers panel, cookie viewer, and response time and size metrics.

<div align="center">
    <img width="1177" height="443" alt="image" src="https://github.com/user-attachments/assets/441a53c0-1717-4e1f-a8cf-5ab08b53670c" />
    <img width="1177" height="446" alt="image" src="https://github.com/user-attachments/assets/2433da4d-a091-475d-942d-f87d7af0eded" />
</div>

### Reusable Examples
Save one or more response examples to any request. Use them as documentation, mocks, or test fixtures — exportable as part of your collection.

### Filesystem-Native Storage
All your data — collections, environments, histories — is written to a single `bridge-data.json` file in a folder of your choice. No proprietary formats, no lock-in. Version-control it with Git.


<div align="center">
    <img width="404" height="572" alt="image" src="https://github.com/user-attachments/assets/958bd3d2-667b-4707-bbfd-43a9a6c3849b" />
</div>

### Tab Management
Full browser-grade tab experience:
- Restore closed tabs (`Ctrl+Shift+T` / `⌘⇧T`)
- New, close, and cycle tabs with keyboard shortcuts
- Dirty state tracking with unsaved-changes prompts

---

## Installation

### Desktop App (recommended)

Download the latest release for your platform from the [Releases page](https://github.com/jaideepghosh/bridge/releases):

| Platform | Download |
|---|---|
| macOS (Apple Silicon / Intel) | `.dmg` |
| Windows | `.msi` |
| Linux | `.AppImage` / `.deb` |

### Web App

The web version runs in any modern browser. A hosted instance is available at **[bridge.jaideepghosh.com](https://bridge.jaideepghosh.com/)**.

> \[!NOTE]
> The web app uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for filesystem storage. This requires a Chromium-based browser (Chrome 86+, Edge 86+). Firefox and Safari fall back to local session storage.

### Build from Source

See [**Development Setup**](#development-setup) below.

---

## Usage

### Quick Start

1. Open Bridge and select or create a **workspace folder** where your `bridge-data.json` will live.
2. Create a **Collection** from the sidebar (`+` button or `Ctrl+N`).
3. Add a **Request** — choose a method, enter a URL, configure params or a body, and hit **Send**.
4. **Save** the request to your collection (`Ctrl+S`).

### Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|---|---|---|
| New tab | `⌘T` | `Ctrl+T` |
| Close tab | `⌘W` | `Ctrl+W` |
| Force close tab | `⌥⌘W` | `Ctrl+Alt+W` |
| Reopen closed tab | `⌘⇧T` | `Ctrl+Shift+T` |
| Next tab | `⌘⇧]` | `Ctrl+Shift+]` |
| Previous tab | `⌘⇧[` | `Ctrl+Shift+[` |
| Jump to tab 1–8 | `⌘1`–`⌘8` | `Ctrl+1`–`Ctrl+8` |
| Jump to last tab | `⌘9` | `Ctrl+9` |
| Send request | `⌘↩` | `Ctrl+Enter` |
| Save request | `⌘S` | `Ctrl+S` |

A full shortcut reference is available in-app via the **Help** footer menu.

---

## Architecture

Bridge is a Turborepo monorepo with NPM workspaces.

```
bridge/
├── apps/
│   ├── web/          # Next.js 15 web client
│   └── desktop/      # Tauri v2 desktop wrapper (Rust + Vite + React)
└── packages/
    ├── components/   # Core UI pages, Zustand stores, request engine
    ├── ui/           # Shared Radix + Tailwind v4 primitives
    ├── typescript-config/
    └── eslint-config/
```

**Tech stack:**

| Layer | Technology |
|---|---|
| Web client | Next.js 15, React 19, Tailwind CSS v4 |
| Desktop shell | Tauri v2 (Rust), Vite |
| State management | Zustand |
| Component library | Radix UI primitives |
| Code editor | Monaco Editor |
| Monorepo tooling | Turborepo, NPM Workspaces |

---

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **Rust** toolchain (for the desktop app) — [install via rustup](https://rustup.rs/)

### Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/jaideepghosh/bridge.git
cd bridge

# 2. Install dependencies
npm install

# 3. Start all dev servers (web + desktop)
npm run dev
```

The web app will be available at `http://localhost:3000`. The desktop app window opens automatically when Tauri compiles.

### Selective Development

```bash
# Web only
npx turbo dev --filter=web

# Desktop only
npx turbo dev --filter=desktop
```

### Building

```bash
# Build everything
npm run build

# Build only the desktop app
npx turbo build --filter=desktop
```

---

## Contributing

Contributions are welcome and appreciated. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

- **Bug reports:** [Open an issue](https://github.com/jaideepghosh/bridge/issues) with reproduction steps.
- **Feature requests:** [Start a discussion](https://github.com/jaideepghosh/bridge/discussions) before opening a PR.
- **Code:** Fork → branch → PR against `main`. Make sure `npm run lint` and `npm run build` pass.

### Local Development Tips

- Versioning is managed centrally in the root `package.json`. Run `npm run sync-version` after bumping to propagate to all packages and `tauri.conf.json`.
- Shared UI components live in `packages/ui`. Business logic and stores live in `packages/components`.

---

## Roadmap

- [ ] GraphQL support
- [ ] WebSocket testing
- [ ] gRPC support
- [ ] Team workspaces (shared collections)
- [ ] OpenAPI / Swagger import and export
- [ ] Built-in mock server
- [ ] Test scripting with assertions

See the [open issues](https://github.com/jaideepghosh/bridge/issues) and [project board](https://github.com/jaideepghosh/bridge/projects) for the full list.

---

## License

Bridge is released under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ♥ by the Bridge contributors.</sub>
</div>
