# Bridge Monorepo — Deep Conventions Reference

Loaded by the bridge-monorepo-dev skill when extra detail is needed.

---

## Table of Contents

1. [Package naming & scope](#naming)
2. [TypeScript config inheritance](#tsconfig)
3. [Storage backends in components](#storage)
4. [State management (app-store)](#state)
5. [HTTP execution pipeline](#http)
6. [Tauri vs Web differences](#tauri-web)
7. [Codegen generator interface](#codegen)
8. [Prisma / API patterns](#prisma)
9. [Versioning (sync-version.js)](#versioning)

---

## 1. Package naming & scope <a name="naming"></a>

Read the `"name"` field in existing `package.json` files to confirm the scope.
Based on the tree, packages appear to use a consistent scope — check:

```bash
grep '"name"' packages/*/package.json
```

Common patterns seen in monorepos like this: `@bridge/*`, `@repo/*`, or unscoped.
**Always match whatever is already there.**

File naming:

- React components: `PascalCase.tsx` (e.g. `RequestBuilder.tsx`)
- Services / utilities: `camelCase.ts` (e.g. `http-client.ts`, `curl-parser.ts`)
- Hooks: `useCapitalCamel.ts` (e.g. `useAppVersion.ts`)
- NestJS: `kebab-case.<role>.ts` (e.g. `proxy.service.ts`, `proxy.controller.ts`)

---

## 2. TypeScript config inheritance <a name="tsconfig"></a>

```
packages/typescript-config/
├── base.json          ← strict TS, no JSX
├── nextjs.json        ← extends base, adds Next.js + JSX
└── react-library.json ← extends base, adds JSX for component libs
```

Rules:

- `apps/api` → extends `base.json` (NestJS, no JSX)
- `apps/web` → extends `nextjs.json`
- `apps/desktop` → its own tsconfig (Vite/Tauri handles it); check `tsconfig.json` +
  `tsconfig.node.json`
- `packages/components` → extends `react-library.json` (has JSX)
- `packages/codegen` → extends `base.json` (pure TS, no JSX)
- `packages/ui` → extends `react-library.json` (has JSX, shadcn)
- New config-only package → extends `base.json`
- New React package → extends `react-library.json`

Each app/package also has `tsconfig.build.json` (api) or just `tsconfig.json`.
Check the existing one before creating a new variant.

---

## 3. Storage backends in components <a name="storage"></a>

`packages/components/src/services/storage/` has four backends:

| File                   | Backend                 | Used by                      |
| ---------------------- | ----------------------- | ---------------------------- |
| `indexedDb.ts`         | IndexedDB               | Web browser (persistent)     |
| `localStorage.ts`      | localStorage            | Web browser (simple KV)      |
| `browserFileSystem.ts` | File System Access API  | Web (file-based collections) |
| `apiStorage.ts`        | Remote API (`apps/api`) | Web (server-side storage)    |

`types.ts` defines the `StorageBackend` interface that all four implement.

When adding a **new storage backend**:

1. Create `packages/components/src/services/storage/<name>.ts` implementing `StorageBackend`
2. Export it from `storage/types.ts` or a new barrel
3. Register it in `context/app-store.tsx` where the active backend is selected

The desktop app (`apps/desktop`) has its own `services/storage.ts` — a Tauri-specific
implementation that wraps the OS filesystem via Tauri APIs, not the components package storage.

---

## 4. State management (app-store) <a name="state"></a>

`packages/components/src/context/app-store.tsx` is the global state container.
Inspect it to understand the shape before adding new state — it's likely Zustand or
React context + useReducer.

Rules:

- App-wide state (active request, collections, environment variables, etc.) → `app-store.tsx`
- HTTP execution state (loading, response, error) → `http-executor.tsx`
- Local component state → `useState` inside the component, not in the store

---

## 5. HTTP execution pipeline <a name="http"></a>

Two paths exist:

**Web (`apps/web`):**

```
services/proxy-executor.ts
  → app/api/proxy/execute/route.ts   (Next.js API route)
    → apps/api (NestJS proxy service)
      → target URL
```

**Desktop (`apps/desktop`):**

```
services/http-executor.ts
  → direct HTTP via Tauri (no proxy needed — native HTTP)
```

**Shared (`packages/components`):**

- `services/http-client.ts` — abstract HTTP client interface
- `context/http-executor.tsx` — React context that injects the right executor

When adding new HTTP functionality:

1. Define the interface change in `packages/components/src/services/http-client.ts`
2. Implement for web in `apps/web/services/`
3. Implement for desktop in `apps/desktop/src/services/`
4. The components package stays platform-agnostic

---

## 6. Tauri vs Web differences <a name="tauri-web"></a>

| Capability    | Web (`apps/web`)                   | Desktop (`apps/desktop`) |
| ------------- | ---------------------------------- | ------------------------ |
| HTTP requests | Via NestJS proxy (CORS bypass)     | Native Tauri HTTP plugin |
| File storage  | File System Access API / IndexedDB | OS filesystem via Tauri  |
| App version   | API call                           | `@tauri-apps/api`        |
| OS access     | None                               | Tauri commands (Rust)    |

`packages/components` is consumed by **both** — never put platform-specific code there.
Use the `http-executor` context to inject the right executor per platform.

---

## 7. Codegen generator interface <a name="codegen"></a>

`packages/codegen/src/types.ts` defines the generator interface. Check it before writing
a new generator. Expected shape (inferred from the generator files):

```typescript
// types.ts (verify actual interface before implementing)
export interface CodeGenerator {
  id: string; // e.g. "python-requests"
  label: string; // e.g. "Python (requests)"
  generate(request: HttpRequest): string;
}
```

Each generator file in `src/generators/` exports one object/class matching this interface.
`src/registry.ts` imports and registers all generators — add new ones there.
`src/index.ts` exports `registry` (and optionally individual generators).

---

## 8. Prisma / API patterns <a name="prisma"></a>

`apps/api/prisma/schema.prisma` — single source of truth for DB schema.
`apps/api/prisma.config.ts` — Prisma client config.

After any schema change:

```bash
cd apps/api
npx prisma generate          # regenerate client
npx prisma migrate dev       # create & apply migration (dev only)
```

NestJS module anatomy (follow `apps/api/src/proxy/` as the canonical example):

```
proxy.module.ts     ← @Module({ controllers, providers })
proxy.controller.ts ← @Controller, @Get/@Post, uses DTOs
proxy.service.ts    ← @Injectable, business logic
proxy.dto.ts        ← class-validator DTOs for request bodies
```

---

## 9. Versioning <a name="versioning"></a>

`scripts/sync-version.js` synchronises the version field across all `package.json` files.
Run it after bumping the root version:

```bash
node scripts/sync-version.js
```

The GitHub Actions workflow `release.yml` likely calls this automatically on release.
Do not manually bump individual package versions — always go through the root.
