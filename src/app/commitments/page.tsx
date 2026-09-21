import { Commitments } from "@/components/commitments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commitments — Fathom Rebuild" };

export default function CommitmentsPage() {
  return <Commitments configured={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
