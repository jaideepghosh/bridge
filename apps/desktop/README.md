# 🖥️ Bridge Desktop Client

This directory houses the **Tauri Desktop Application** for Bridge, a lightning-fast, native desktop REST API testing client built to test local and remote APIs without any CORS limits or browser sandboxing restrictions.

---

## 🛠️ Tech Stack & Key Implementations

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4.
- **Backend**: Rust compilation wrapper using Tauri v2.
- **Direct Workspace File Storage**:
  - Uses the **Tauri Dialog Plugin** (`@tauri-apps/plugin-dialog`) to invoke the native OS directory picker.
  - Resolves file reads and writes natively using Tauri's native filesystem commands.
  - All workspace collections and request configurations are saved inside `bridge-data.json` inside the selected folder.
- **Tauri v2 Permissions (Capabilities)**:
  - Configured inside `capabilities/default.json` to authorize access to critical platform capabilities:
    - `"fs:default"`, `"fs:read-all"`, `"fs:write-all"` for reading/writing workspace directories.
    - `"dialog:default"` for displaying the native OS save/select directory alerts.
- **Unified Versioning**: Synchronized prebuild and predev with the root monorepo `package.json` version. The React frontend retrieves the active platform version dynamically at runtime via Tauri's asynchronous native `getVersion()` API.

---

## 🚀 Development Setup

### Prerequisites
- Node.js >= 18
- Rust compiler and Cargo toolchain: [Install Rust](https://www.rust-lang.org/tools/install)

### Run the Desktop development environment
From the root workspace directory, run:
```bash
npx turbo dev --filter=desktop
```
This launches a local Vite dev server and opens the native Tauri desktop window frame with real-time hot module reloading (HMR).

---

## 📦 Compile the Desktop Application

To build the native desktop bundle and compile the Rust backend:
```bash
npx turbo build --filter=desktop
```
This triggers a native production compiler compile and packages the application binary inside the target output.
