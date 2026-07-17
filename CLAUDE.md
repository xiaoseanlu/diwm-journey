# CLAUDE.md — conventions for this TurboTax prototype

This prototype was scaffolded by the cgpm-open-market `@create-prototype` skill. Anyone editing it — human or Claude — should read this file first.

## Prerequisites

**Node 20 is required.** This template uses Vite 8 + rolldown, which has native ARM64 bindings that only install correctly under Node ≥20.19.

If `npm install` ran under Node 18 (the rolldown binding error), fix it with:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 20
rm -rf node_modules package-lock.json
npm install && npm run build
```

## What this prototype is

A single Vite + React + TypeScript app that hosts one or more TurboTax flows. The shells (Web / mWeb / iOS / Android) match CGDS and are committed; flows are edited on demand inside `src/prototypes/local/`.

The built output lives in `dist/` and is served by the cgpm dashboard at `http://localhost:8080/workspace/prototypes/<name>/dist/`. For live dev with HMR, run `npm run dev` inside this folder (port 5173).

## File layout — committed vs. gitignored

**Committed (the shared base):**
- `src/main.tsx`, `src/App.tsx`, `src/App.css` — React bootstrap + hash router
- `src/Home.tsx`, `src/home.css` — the prototype's internal hub
- `src/tokens.css`, `src/index.css` — CGDS tokens + global reset
- `src/Shell.tsx`, `src/shell.css` — Web shell
- `src/MWebShell.tsx`, `src/mweb-shell.css` — mWeb shell
- `src/NativeShell.tsx`, `src/native-shell.css` — iOS + Android shell
- `src/HubBackButton.tsx`, `src/hub-back.css` — floating "back to hub" pill
- `src/Tooltip.tsx`, `src/tooltip.css` — shared tooltip
- `src/icons/`, `src/icons.tsx` — CGDS icons
- `src/prototypes/index.ts` — merges registry + registry.local (don't edit)
- `src/prototypes/registry.tsx` — empty by default; shared flows go here

**Gitignored (your per-session work):**
- `src/prototypes/local/` — your flow components
- `src/prototypes/registry.local.tsx` — your registry entries
- `node_modules/`, `dist/`

## Where to find authoritative references

The full CGDS catalog + pattern + shell docs live in the **parent cgpm-open-market repo**:

- `skills/design/create-prototype/references/cgds-catalog.md` — every design token, component, Figma key + CGDS plugin install path
- `skills/design/create-prototype/references/turbotax-patterns.md` — flow skeleton, validation pattern, registry conventions
- `skills/design/create-prototype/references/turbotax-shells.md` — shell APIs + mobile guardrails

Don't duplicate these here — consult them in place so they stay authoritative.

## CGDS — two paths

This template ships CGDS tokens and shells out of the box (see `src/tokens.css` and `src/Shell.tsx`). For richer component fidelity, the cookbook's TurboTax workshop also recommends installing the `cgds-component-plugin`:

```bash
npx @dev-platformexps/devassist-plugin-manager@latest add --scope global --agents claude cgds-component-plugin
```

This gives Claude live access to CGDS component docs (`cgds-components` skill). Tell it explicitly to use them: *"Before adding any component, look up the actual CGDS docs for real props/variants."* See `cgds-catalog.md` § "Two ways to use CGDS in this prototype" for the full breakdown.

## Build a new flow — step-by-step

1. **Decide the scope** — one flow = one user journey (e.g., "enter a 1099-INT"). Multiple screens inside the flow are fine; they're state transitions on a single component.

2. **Create the files:**
   - `src/prototypes/local/MyNewFlow.tsx` — flow component (state-machine pattern — see `turbotax-patterns.md` skeleton)
   - `src/prototypes/local/mynewflow.css` — flow-specific styles (tokens only — no hex)

3. **Register it** in `src/prototypes/registry.local.tsx` (create if missing):
   ```tsx
   import type { PrototypeEntry } from "./registry";
   import { Shell } from "../Shell";
   import { MWebShell } from "../MWebShell";
   import { MyNewFlow } from "./local/MyNewFlow";

   export const localPrototypes: PrototypeEntry[] = [
     {
       slug: "my-new-flow",
       title: "My new flow",
       description: "One-line description for the hub card.",
       section: "Federal · Wages & income",
       platforms: {
         web: {
           route: "my-new-flow/web",
           render: () => (
             <Shell selectedNav="Income" progressPct={32}>
               <MyNewFlow />
             </Shell>
           ),
         },
         mweb: {
           route: "my-new-flow/mweb",
           render: () => (
             <MWebShell progressPct={32}>
               <MyNewFlow />
             </MWebShell>
           ),
         },
       },
     },
   ];
   ```

4. **Rebuild** so the dashboard shows the updated flow:
   ```bash
   npm run build
   ```

5. **Open** the dashboard → Prototypes → this prototype's card, click into the flow you just added (the internal hub surfaces all registered flows).

## Conventions to follow (summary — full rules in `turbotax-patterns.md`)

- **Tokens only** — never hex values, never hardcoded px. Colors, spacing, type, radii all come from `src/tokens.css`.
- **Reuse shell button classes** — `.btn .btn--primary | --secondary | --tertiary` are defined in `shell.css`. Don't reinvent.
- **Validation pattern** — blur + on-submit, inline errors below fields, summary banner at top when errors exist. See `turbotax-patterns.md` for the canonical code.
- **State machine** — one `useState<Step>` + early returns per step. No routing library.
- **Icons** — components live in `src/icons.tsx`. If you need a new icon, pull from Figma via MCP, save the SVG to `src/icons/`, inline as a React component. Asset URLs expire in 7 days.
- **Refund consistency** — if your flow shows a refund amount inside content, the shell's `headerRefund` prop must match.

## Use cgpm-open-market skills upstream

This prototype is the build step in a larger PM flow. Use the cgpm-open-market skills for the upstream work:

- `@create-prd` — write the PRD this prototype implements
- `@create-story` — turn the PRD into dev-ready stories (if you'll hand off to eng)
- `@brainstorming` — ideate feature variants before prototyping
- `@working-backwards` — if you want a PR/FAQ definition before building

## Mobile design principles (mWeb + NativeShell)

Both `mweb-shell.css` and `native-shell.css` enforce 7 rules that keep flows readable at 375–412px. Don't reimplement per flow; don't add fixed widths or new multi-column grids without a mobile fallback. See `turbotax-shells.md` for the full list.

## Verification

After editing:

1. `npm run build` — rebuild the static output
2. Open `http://localhost:8080/workspace/prototypes/<name>/dist/` (via dashboard)
3. Walk the happy path — click through each step
4. If your flow has forms, trigger at least one invalid submit to confirm validation fires

For live HMR development:
```bash
npm run dev
# Opens http://localhost:5173/
```
Only one prototype can run `npm run dev` at a time (port 5173). Stop with Ctrl+C.

## Things to never do

- ❌ Hardcode hex colors or px values — always use tokens
- ❌ Reinvent button / card / form styles that already exist in `shell.css`
- ❌ Edit `src/prototypes/index.ts` (the merger — don't touch)
- ❌ Hardcode routes in `App.tsx` or `Home.tsx` — both read from the registry
- ❌ Use react-router or other routing libs — hash routing only
- ❌ Regenerate the shells from Figma unless the user explicitly asks

## Things to always do

- ✅ Read `cgds-catalog.md` (parent repo) before adding new components
- ✅ Use `disableCodeConnect: true` on any `get_design_context` Figma MCP calls
- ✅ Register new flows in `registry.local.tsx` so they appear on this prototype's hub
- ✅ Rebuild (`npm run build`) after edits so the dashboard shows the latest
- ✅ Consult `turbotax-patterns.md` + `turbotax-shells.md` in the parent repo when in doubt
