import { TextureViewer } from "@/components/tools/TextureViewer";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";

export const metadata = toolMetadata("visor");

export default function Page() {
  return (
    <ToolPage slug="visor">
      <TextureViewer />
    </ToolPage>
  );
}
