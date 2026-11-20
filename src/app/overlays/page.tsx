import { CatalogView, catalogMetadata } from "@/components/catalog/CatalogView";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateMetadata({ searchParams }: Props) {
  return catalogMetadata("overlay", searchParams);
}

export default function Page({ searchParams }: Props) {
  return <CatalogView type="overlay" searchParams={searchParams} />;
}
