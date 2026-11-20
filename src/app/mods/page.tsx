import { CatalogView, catalogMetadata } from "@/components/catalog/CatalogView";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateMetadata({ searchParams }: Props) {
  return catalogMetadata("mod", searchParams);
}

export default function Page({ searchParams }: Props) {
  return <CatalogView type="mod" searchParams={searchParams} />;
}
