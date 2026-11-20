import { ZipAnalyzer } from "@/components/tools/ZipAnalyzer";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";

export const metadata = toolMetadata("analizador");

export default function Page() {
  return (
    <ToolPage slug="analizador">
      <ZipAnalyzer />
    </ToolPage>
  );
}
