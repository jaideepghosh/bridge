# 🌐 Bridge Web Client (Next.js)

This directory houses the **Next.js Web Application** for Bridge, a premium, browser-based REST API testing workbench. 

---

## 🛠️ Tech Stack & Key Implementations

- **Core Framework**: Next.js 15, React 19, and Tailwind CSS v4.
- **Development Tooling**: Turbopack (`next dev --turbopack`) for instant, ultra-fast compilation.
- **Direct Workspace File Storage**:
  - Leverages the native **HTML5 File System Access API** (`window.showDirectoryPicker()`) to let users select a local folder.
  - Safely saves all collections, environments, folders, and request histories inside a `bridge-data.json` file inside the selected folder.
  - Caches `FileSystemDirectoryHandle` objects securely inside browser-sandboxed **IndexedDB** storage. On reload, the application automatically attempts to restore the directory connection.
  - Implements a one-click session re-authorization overlay on startup to respect browser sandboxing rules, allowing users to re-grant read/write access with a single click.
- **Environmental Versioning**: Exposes the root monorepo version dynamically to the browser at build time via `process.env.NEXT_PUBLIC_APP_VERSION` injected inside `next.config.js`.

---

## 🚀 Getting Started

### Run the development server
From the root workspace directory, run:
```bash
npx turbo dev --filter=web
```
Or directly inside this folder:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the Bridge web workspace.

---

## 📦 Production Builds

To compile the production Next.js application, run:
```bash
npx turbo build --filter=web
```
This performs a type-safe static site generation (SSG) and build trace optimization.
