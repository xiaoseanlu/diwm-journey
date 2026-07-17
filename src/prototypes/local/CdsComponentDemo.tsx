import { Badge, Button, Header } from "cds-react-components/src/components";
import { HomeIcon } from "cds-react-components/src/icons";

/** CDS library smoke test — use in Figma prototype development flows */
export function CdsComponentDemo() {
  return (
    <div className="bg-page-base text-foreground-base flex min-h-full flex-col gap-4 p-4">
      <Header
        header="CDS components"
        description="cds-react-components library"
        position="page"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Badge color="green" label="Active" />
        <Button label="Continue" variant="primary" onClick={() => {}} />
        <HomeIcon className="size-6 text-blue-6" />
      </div>
    </div>
  );
}
