import { dbConfigured } from "@/lib/db/client";
import { storageConfigured } from "@/lib/pipeline/media";
import { transcriptionConfigured } from "@/lib/pipeline/transcribe";
import { analysisConfigured } from "@/lib/pipeline/analyse";
import { UploadFlow } from "@/components/upload-flow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Upload a recording — Verbatim" };

export default function UploadPage() {
  return (
    <UploadFlow
      ready={{
        database: dbConfigured(),
        storage: storageConfigured(),
        transcription: transcriptionConfigured(),
        analysis: analysisConfigured(),
      }}
    />
  );
}
