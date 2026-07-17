# CDS React Components — this prototype

`cds-react-components` is installed here for **Figma prototype development** (DIWM vision components).

## Open in Cursor

Use this folder as the workspace root (or ensure your chat’s workspace includes it):

```
workspace/prototypes/fy27-assisted-vignettes-diwm/
```

## Run

```bash
nvm use
npm install
npm run dev
```

## Use in a flow

```tsx
import { Button, Header, Badge } from "cds-react-components/src/components";
import { HomeIcon } from "cds-react-components/src/icons";

export function MyScreen() {
  return (
    <div className="bg-page-base text-foreground-base p-4 flex flex-col gap-4">
      <Header header="Welcome" description="Get started" position="page" />
      <Badge color="green" label="Active" />
      <Button label="Continue" variant="primary" onClick={() => {}} />
      <HomeIcon className="size-6 text-blue-6" />
    </div>
  );
}
```

See hub flow **cds-component-demo** (if registered) or add screens under `src/prototypes/local/`.

## Files

| File | Purpose |
|------|---------|
| `src/cds.css` | Tailwind v4 + `@source` + CDS tokens |
| `src/cds-fonts.css` | Tally / Tally Display `@font-face` |
| `vite.config.ts` | Transpile `cds-react-components` |

Do **not** `@import` `node_modules/cds-react-components/src/styles/tokens.css` directly.
