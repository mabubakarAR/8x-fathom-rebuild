import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy — Noted" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="26 September 2026">
      <p>Noted is a take-home project built for a hiring assignment. It is not a commercial service and has no customers. This page exists because Google requires one before an app can ask for calendar access, and because you deserve to know what happens to your data even in a demo.</p>
      <h2>What is collected</h2>
      <p><strong>When you sign in with Google:</strong> your Google account id, email address, name and profile picture. These identify your workspace so only you see your meetings.</p>
      <p><strong>Calendar:</strong> with your consent, read-only access to your primary Google Calendar. Events for the next seven days are read at the moment you open the home page, to show which meetings could be recorded. Calendar data is not stored. A refresh token is stored so the calendar can be read again on your next visit without asking again.</p>
      <p><strong>Recordings:</strong> when you choose to record a meeting, the audio you capture, the transcript produced from it, and the notes generated from that transcript are stored in a database so they are there when you come back. Nothing is recorded without you pressing a record button.</p>
      <h2>Who processes it</h2>
      <p>Audio is transcribed by Deepgram. Transcripts are read by Anthropic&rsquo;s Claude to produce summaries, action items and answers to your questions. Data is hosted on Vercel and stored in a Neon Postgres database. None of these providers are given your calendar.</p>
      <h2>Deleting it</h2>
      <p>Every meeting has a delete action that removes it and everything derived from it, including the audio. To remove the app&rsquo;s access to your Google account entirely, revoke it at <a href="https://myaccount.google.com/permissions" className="underline">myaccount.google.com/permissions</a>.</p>
      <h2>Contact</h2>
      <p>Questions go to the project&rsquo;s GitHub repository, linked from the front page.</p>
    </LegalPage>
  );
}
