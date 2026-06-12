# Copilot Instructions for Bridge Monorepo Development

## Purpose

This instruction set guides Copilot when assisting with tasks in the **bridge monorepo**.  
It ensures consistent, runnable code and maintains continuity across sessions.

---

## When to Trigger

Copilot must load this skill whenever the user requests:

- **Create a package**
- **Add a feature**
- **Scaffold a new app/library**
- **Modify or refactor code**
- **Add to components**
- **Add a code generator**
- **Review prior work**
- **Continue from last time**
- **Document changes**

---

## Repository Structure

```
bridge/
├── apps/                # Applications
│   ├── api/             # NestJS backend
│   ├── desktop/         # Tauri + React
│   └── web/             # Next.js 14
├── packages/            # Shared libraries
│   ├── codegen/         # HTTP code generators
│   ├── components/      # Shared React components
│   ├── eslint-config/   # Shared ESLint rules
│   ├── typescript-config/ # Shared tsconfig bases
│   └── ui/              # shadcn/ui primitives
├── scripts/             # Utilities
├── package.json         # npm workspaces root
├── turbo.json           # Turborepo pipeline
└── tsconfig.json        # Root config
```

---

## Workflow Phases

### Phase 0 — Orientation

- Always start by reading `MONOREPO_CHANGELOG.md`.
- Summarize prior decisions before proceeding.
- Confirm task type, then jump to the correct phase.

### Phase 1 — New Package

- Place libraries in `packages/`, apps in `apps/`.
- Match naming scope (`@bridge/<name>`).
- Scaffold with `package.json`, `tsconfig.json`, and `src/index.ts`.
- Wire into root `package.json` and `turbo.json`.
- Run `npm install`, then verify with `npm run typecheck` and `npm run lint`.

### Phase 2 — Features & Modifications

- Respect boundaries of each app/package:
  - `api`: NestJS + Prisma
  - `web`: Next.js 14 App Router
  - `desktop`: Tauri + React
  - `components`: Shared React library
  - `codegen`: Generators in `src/generators/`
  - `ui`: Tailwind primitives
- Follow strict TypeScript rules, named exports, colocated tests.
- Verify with typecheck, lint, and build.

### Phase 3 — Documentation

- Append to `MONOREPO_CHANGELOG.md` using the provided template.
- Update or create `README.md` for changed packages.
- Suggest commit messages in conventional format (`feat`, `fix`, `refactor`, etc.).

---

## Quick Reference

| Task               | Phases    |
| ------------------ | --------- |
| New package/app    | 0 → 1 → 3 |
| New feature/bugfix | 0 → 2 → 3 |
| Add code generator | 0 → 2 → 3 |
| Add UI component   | 0 → 2 → 3 |
| Continue work      | 0         |
| Document only      | 3         |

---

## Rules of Engagement

- **Never invent scope names** — always match existing.
- **No default exports** in `index.ts`.
- **No circular dependencies** between packages.
- **`components` must not import from `apps/*`.**
- **`ui` must not import from `components`.**

---

## References

- `.claude/skills/bridge-monorepo-dev/references/bridge-conventions.md` — naming, storage, context patterns
- `.claude/skills/bridge-monorepo-dev/references/config-packages.md` — ESLint and TypeScript config details
