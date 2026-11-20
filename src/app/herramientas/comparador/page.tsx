import { PackComparator } from "@/components/tools/PackComparator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";

export const metadata = toolMetadata("comparador");

export default function Page() {
  return (
    <ToolPage slug="comparador">
      <PackComparator />
    </ToolPage>
  );
}
