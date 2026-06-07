# Bridge Config Packages Reference

## `packages/typescript-config`

```
typescript-config/
├── base.json           ← strict TS, Node/lib usage
├── nextjs.json         ← + Next.js plugin + JSX preserve
├── react-library.json  ← + JSX react-jsx (for component libs)
└── package.json        ← no main, no build, just files
```

**`package.json`:**
```json
{
  "name": "@bridge/typescript-config",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nextjs.json", "react-library.json"]
}
```

**How consumers extend:**
```json
{ "extends": "@bridge/typescript-config/base.json" }
{ "extends": "@bridge/typescript-config/react-library.json" }
{ "extends": "@bridge/typescript-config/nextjs.json" }
```

Adding a new base variant (e.g. `node-esm.json`):
1. Create the file in `packages/typescript-config/`
2. Add it to the `"files"` array in `package.json`
3. Document which packages should use it in this file

---

## `packages/eslint-config`

```
eslint-config/
├── base.js             ← TS + general rules
├── next.js             ← + Next.js rules
├── react-internal.js   ← + React rules (for internal packages)
└── package.json
```

**How consumers use it:**
```js
// eslint.config.mjs or eslint.config.js
import baseConfig from "@bridge/eslint-config/base.js";
export default [...baseConfig];
```

Adding a new config variant:
1. Create `<name>.js` in `packages/eslint-config/`
2. Export a flat config array (ESLint v9 format used in `apps/api/eslint.config.mjs` and
   `apps/desktop` — check `apps/web/eslint.config.js` for the exact export shape)
3. Add to `"exports"` map in `package.json` if not already covered by `"./*"`

---

## `packages/ui`

shadcn/ui component primitives.

```
ui/src/
├── components/ui/      ← shadcn components (button, dialog, tabs, etc.)
├── hooks/              ← use-mobile, use-toast
├── lib/utils.ts        ← cn() tailwind class merger
├── styles/globals.css  ← CSS variables + Tailwind base
└── index.ts            ← barrel
```

**Adding a new shadcn component:**
```bash
# From packages/ui:
npx shadcn@latest add <component-name>
```
This places the file under `src/components/ui/`. Then re-export from `src/index.ts`.

**`packages/ui` must NOT contain business logic.** Business logic and composition goes
in `packages/components`.