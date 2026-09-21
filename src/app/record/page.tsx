import { RecordStudio } from "@/components/record-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record a meeting — Fathom Rebuild" };

export default function RecordPage() {
  return <RecordStudio configured={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
