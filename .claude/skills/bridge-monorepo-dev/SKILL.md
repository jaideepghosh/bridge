---
name: bridge-monorepo-dev
description: >
  Use this skill for ANY work in the `bridge` monorepo: creating new packages, scaffolding
  apps, implementing or modifying features, refactoring, architectural changes, or documenting
  what was built. Trigger whenever the user says "create a package", "add a feature",
  "scaffold a new app/library", "add to components", "add a code generator", "what did we
  build last time", "continue from last time", or any task that touches one or more packages
  in the bridge repo. Also trigger when the user wants to review prior work — this skill
  maintains a living MONOREPO_CHANGELOG.md that makes cross-session continuity possible.
---

# Bridge Monorepo Dev Skill

This skill encodes the exact conventions of the **bridge** monorepo so every session
produces consistent, immediately-runnable code.

---

## Repo at a Glance

```
bridge/                          ← root (npm workspaces + Turborepo)
├── apps/
│   ├── api/                     ← NestJS backend (Node 20, TypeScript)
│   ├── desktop/                 ← Tauri + React + Vite + Tailwind
│   └── web/                     ← Next.js 14 (App Router) + React + Tailwind
├── packages/
│   ├── codegen/                 ← HTTP code generators (multi-language)
│   ├── components/              ← Shared React component library (the main UI)
│   ├── eslint-config/           ← Shared ESLint rules
│   ├── typescript-config/       ← Shared tsconfig bases
│   └── ui/                      ← shadcn/ui primitives + Tailwind
├── scripts/
│   └── sync-version.js          ← version sync utility
├── package.json                 ← workspaces root
├── turbo.json                   ← Turborepo pipeline
└── tsconfig.json                ← root tsconfig
```

**Package manager**: npm workspaces (`package-lock.json` present, no `pnpm-workspace.yaml`)  
**Build orchestration**: Turborepo (`turbo.json`)  
**Package scope**: Check existing packages — use the same scope pattern found in their `package.json#name`  
**TypeScript**: Each app/package has its own `tsconfig.json` extending `packages/typescript-config/`

---

## Phase 0 — Orient Before Touching Anything

Always start here, every session.

### 0.1 Read the changelog

```bash
cat MONOREPO_CHANGELOG.md 2>/dev/null || echo "No changelog yet"
```

If it exists, summarise relevant prior decisions to the user before proceeding.
If it doesn't exist, you will create it at the end of this session.

### 0.2 Confirm the task type, then jump to the right phase

```
"create a new package"          → Phase 1
"add/change/fix a feature"      → Phase 2
"what did we build / continue"  → Phase 0 only, then ask what's next
"document what we just did"     → Phase 3 only
```

---

## Phase 1 — Create a New Package

### 1.1 Understand where it lives

| Kind                     | Directory          | Examples                             |
| ------------------------ | ------------------ | ------------------------------------ |
| Shared library / utility | `packages/<name>/` | `codegen`, `components`, `ui`        |
| Full application         | `apps/<name>/`     | `api`, `web`, `desktop`              |
| Config-only              | `packages/<name>/` | `eslint-config`, `typescript-config` |

### 1.2 Determine the package name

Look at existing packages to get the exact scope:

```bash
grep '"name"' packages/*/package.json apps/*/package.json
```

Match the naming pattern exactly. Never invent a new scope.

### 1.3 Scaffold — minimum required files

**Every new `packages/<name>/` needs:**

```
packages/<name>/
├── package.json        ← see template below
├── tsconfig.json       ← extends typescript-config
└── src/
    └── index.ts        ← named exports only, no default export
```

**`package.json` template for a library:**

```json
{
  "name": "@bridge/<name>",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@bridge/eslint-config": "*",
    "@bridge/typescript-config": "*",
    "typescript": "catalog:"
  }
}
```

> Note: Check `packages/components/package.json` and `packages/codegen/package.json` for the
> exact scope string and `"catalog:"` usage before writing — match them exactly.

**`tsconfig.json` template:**

```json
{
  "extends": "@bridge/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

> Cross-check against `packages/typescript-config/base.json` and
> `packages/typescript-config/react-library.json` — use `react-library.json` if the
> package contains JSX/TSX.

### 1.4 Wire into the workspace

1. **Root `package.json`** — verify the new path is under an existing `"workspaces"` glob.
   If not, add it. Typical pattern: `"packages/*"` and `"apps/*"` cover most cases.

2. **Consumer packages** — add the dependency:

   ```json
   "@bridge/<name>": "*"
   ```

3. **`turbo.json`** — verify `build`, `typecheck`, `lint` pipeline entries cover the new
   package. They usually do via the wildcard pipeline; only add entries for non-standard scripts.

4. **Install:**
   ```bash
   npm install
   ```

### 1.5 Verify

```bash
npm run typecheck --workspace=packages/<name>
npm run lint --workspace=packages/<name>
```

---

## Phase 2 — Implement or Modify a Feature

### 2.1 Know the app boundaries

| App / Package         | Stack                             | Key constraint                                                            |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `apps/api`            | NestJS + Prisma + TypeScript      | Module/Controller/Service pattern; Prisma for DB                          |
| `apps/web`            | Next.js 14 App Router + React     | Server components by default; `"use client"` only when needed             |
| `apps/desktop`        | Tauri + React + Vite + Tailwind   | Runs offline; uses Tauri APIs for OS access                               |
| `packages/components` | React + TypeScript (no framework) | Consumed by both `web` and `desktop`; no Next.js imports                  |
| `packages/codegen`    | Pure TypeScript                   | Each generator in `src/generators/<lang>.ts`; registered in `registry.ts` |
| `packages/ui`         | shadcn/ui + Tailwind              | Primitives only; no business logic                                        |

### 2.2 The components package — primary UI workhorse

This is where most feature work lives. Its structure:

```
packages/components/src/
├── components/          ← React components (grouped by feature subdirectory)
│   ├── request-builder/ ← request editing UI
│   ├── response-viewer/ ← response display
│   ├── config-panel/    ← settings/config
│   └── layout/          ← TopBar, Footer
├── context/
│   ├── app-store.tsx    ← global state (likely Zustand or React context)
│   └── http-executor.tsx← HTTP execution context
├── hooks/               ← custom React hooks
├── services/            ← business logic (http-client, resolver, storage)
│   └── storage/         ← multi-backend storage (indexedDB, localStorage, API, browserFS)
├── types/               ← shared TypeScript types
├── utils/               ← pure utilities (curl-parser etc.)
└── index.ts             ← public barrel
```

**Rules when adding to `packages/components`:**

- New feature → new subdirectory under `components/` (e.g. `components/my-feature/`)
- New shared type → `types/index.ts`
- New service → `services/<name>.ts`
- New hook → `hooks/use<Name>.ts`
- Export everything public via `index.ts`

### 2.3 Adding a code generator (`packages/codegen`)

```
packages/codegen/src/
├── generators/<lang>.ts   ← one file per language
├── registry.ts            ← register generator here
├── types.ts               ← CodeGenerator interface lives here
└── utils/formatting.ts    ← shared formatting helpers
```

Steps:

1. Create `src/generators/<lang>.ts` implementing the `CodeGenerator` interface from `types.ts`
2. Register it in `registry.ts`
3. Export from `src/index.ts` if the generator class/function is part of the public API

### 2.4 NestJS API (`apps/api`)

Follow NestJS module pattern:

```
src/
└── <feature>/
    ├── <feature>.module.ts
    ├── <feature>.controller.ts
    ├── <feature>.service.ts
    └── <feature>.dto.ts
```

Import the new module into `app.module.ts`.
For DB changes: update `prisma/schema.prisma`, then run `npx prisma generate`.

### 2.5 Next.js web app (`apps/web`)

- API routes: `app/api/<route>/route.ts`
- Pages: `app/<route>/page.tsx`
- Services: `services/<name>.ts` (mirrors `packages/components/services` but web-specific)
- Only import from `packages/components` via its public `index.ts`

### 2.6 Implementation rules (all packages)

- TypeScript strict mode — no `any` without a `// eslint-disable` comment explaining why
- Named exports only in barrel files — no default exports in `index.ts`
- Co-locate tests: `src/foo.test.ts` next to `src/foo.ts`
- No circular dependencies between packages
- `packages/components` must not import from `apps/*`
- `packages/ui` must not import from `packages/components`

### 2.7 Run verification after changes

```bash
# Type-check everything
npm run typecheck

# Lint changed packages
npm run lint --workspace=packages/<name>

# Full build
npm run build
```

---

## Phase 3 — Document the Change (MANDATORY)

Run this after every Phase 1 or Phase 2 session. Never skip it.

### 3.1 Append to `MONOREPO_CHANGELOG.md` at the repo root

Use this exact template:

```markdown
## [YYYY-MM-DD] <Short title>

### What changed

- <bullet: file or package created/modified and what it does>

### Why

<One paragraph: motivation, requirement, or problem solved.>

### Architecture decisions

- **Decision**: <what>  
  **Rationale**: <why this over alternatives>

### Package graph delta

| Package       | Before | After                             |
| ------------- | ------ | --------------------------------- |
| `@bridge/foo` | —      | New package, exports `FooService` |
| `apps/web`    | no X   | imports `@bridge/foo`             |

### Breaking changes

<"None." or description + migration steps>

### Follow-ups / known gaps

- <anything deferred or TODO>
```

### 3.2 Update the package README

If you created a new package or changed a public API, update (or create)
`packages/<name>/README.md`:

- One-paragraph description
- Import example
- Minimal usage snippet

### 3.3 Suggest a commit message

```
<type>(<scope>): <short description>

- <bullet of main change>
- <bullet of secondary change>
```

Types: `feat` · `fix` · `refactor` · `chore` · `docs`  
Scope: package or app name, e.g. `codegen`, `components`, `api`, `web`

---

## Quick Reference

```
Task                                   Phase(s)
─────────────────────────────────────────────────
New package / app                      0 → 1 → 3
New feature or bugfix                  0 → 2 → 3
Add a code generator language          0 → 2 → 3
Add a UI component                     0 → 2 → 3
Continue from last session             0 (read changelog) → ask user
Document only                          3
```

---

## References

- `references/bridge-conventions.md` — deeper detail on naming, storage backends,
  context/store patterns, Tauri ↔ web differences
- `references/config-packages.md` — how `typescript-config` and `eslint-config` work

Read the relevant reference before scaffolding if anything is ambiguous.
