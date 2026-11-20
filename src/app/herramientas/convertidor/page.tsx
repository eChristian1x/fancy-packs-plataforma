import { VersionConverter } from "@/components/tools/VersionConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";

export const metadata = toolMetadata("convertidor");

export default function Page() {
  return (
    <ToolPage slug="convertidor">
      <VersionConverter />
    </ToolPage>
  );
}
