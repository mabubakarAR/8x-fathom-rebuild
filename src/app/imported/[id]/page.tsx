import { ImportedView } from "@/components/imported-view";

export const dynamic = "force-dynamic";

export default async function ImportedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ImportedView id={id} />;
}
