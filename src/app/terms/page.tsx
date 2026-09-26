import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms — Noted" };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="26 September 2026">
      <p>Noted is a demonstration built for a hiring assignment, provided as-is, free of charge, with no guarantee of availability, accuracy or continued existence.</p>
      <h2>Recording other people</h2>
      <p>You are responsible for getting whatever consent the law where you and your attendees are requires before recording a call. The app captures audio only when you press record; it never joins a meeting on its own.</p>
      <h2>Your content</h2>
      <p>Your recordings, transcripts and notes are yours. The app stores them only to show them back to you and to answer your questions about them. They are not used to train anything.</p>
      <h2>No warranty</h2>
      <p>Summaries are produced by a language model reading a machine transcript. Every claim is checked against the transcript before it is shown, and claims that cannot be tied to a line are discarded rather than shown &mdash; but a transcript can still mishear, and you should treat the notes as a starting point, not a record.</p>
      <h2>Changes</h2>
      <p>This service may be changed or switched off at any time.</p>
    </LegalPage>
  );
}
