import { PvpCustomizer } from "@/components/tools/PvpCustomizer";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";

export const metadata = toolMetadata("personalizador");

export default function Page() {
  return (
    <ToolPage slug="personalizador">
      <PvpCustomizer />
    </ToolPage>
  );
}
