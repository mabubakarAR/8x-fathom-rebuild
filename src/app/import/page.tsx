import { ImportFlow } from "@/components/import-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import a transcript — Noted" };

export default function ImportPage() {
  return <ImportFlow configured={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
