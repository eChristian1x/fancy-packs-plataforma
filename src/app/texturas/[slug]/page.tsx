import { loadOr404, ResourcePage, resourceMetadata } from "@/components/resource/ResourcePage";
import { getViewer } from "@/lib/auth/viewer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return resourceMetadata("texture", (await params).slug);
}

export default async function Page({ params }: Props) {
  const r = await loadOr404("texture", (await params).slug);
  return <ResourcePage r={r} viewer={await getViewer(r)} />;
}
