import { ImageSearch } from "@/components/tools/ImageSearch";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";

export const metadata = toolMetadata("buscar-por-captura");

export default function Page() {
  return (
    <ToolPage slug="buscar-por-captura">
      <ImageSearch />
    </ToolPage>
  );
}
