import Link from "next/link";
import { corpus } from "@/lib/data/store";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "What's real and what isn't — Sonar",
};

export default function AboutPage() {
  const c = corpus();
  const hero = c.byMeeting.get("m-roadmap-lock")!;

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 md:px-8">
      <PageHeader
        title="What's real and what isn't"
        subtitle="A rebuild of Fathom, built in a day. This page is the honest accounting."
      />

      <div className="flex flex-col gap-6 text-[14px] leading-[1.68]" style={{ color: "var(--ink-2)" }}>
        <Section title="Simulated">
          <ul className="flex flex-col gap-2">
            <Li label="The recording bot">
              Nothing joins a meeting and nothing captures audio. The brief said stubbing this was a
              legitimate call, and it is where a whole day would have gone. The{" "}
              <Link href="/live" className="underline" style={{ color: "var(--accent-ink)" }}>
                live page
              </Link>{" "}
              streams a real transcript against a clock at 8× so the mid-call interactions are still
              demonstrable rather than described.
            </Li>
            <Li label="Playback">
              There is no video or audio file. The player is a clock running over the transcript's
              own timeline. Everything downstream — the active line, the chapter, the scrubber, the
              speaker lanes — reads from that clock exactly as it would from a media element.
            </Li>
            <Li label="The meetings">
              Nine meetings, {c.segments.length.toLocaleString()} spoken lines, all written for this
              build. They are fiction, but they are internally consistent fiction: the Salesforce
              date promised in the Kestrel call is the one walked back in the roadmap call, and the
              escalation Helen delivers is the one read aloud a week later. Search is only worth
              building if the corpus has threads running through it.
            </Li>
            <Li label="Ask">
              No language model. Answers are composed from retrieval over the transcript and the
              structured summary, with shallow intent routing. Less fluent than an LLM, and
              incapable of making something up — every sentence it surfaces is a line somebody
              actually said, with a timestamp.
            </Li>
            <Li label="Summaries and chapters">
              Authored alongside the transcripts rather than generated at runtime. The structure is
              the real claim here: each bullet is a row carrying its own anchor, which is what makes
              citations clickable data rather than links buried in prose.
            </Li>
          </ul>
        </Section>

        <Section title="Real">
          <ul className="flex flex-col gap-2">
            <Li label="Search">
              BM25 plus TF-IDF cosine similarity with curated query expansion, blended and
              normalised, running over every line and every summary bullet. The ranking, the
              highlighting and the score breakdown on each result are all genuine. The blend slider
              really re-ranks.{" "}
              <em>
                The caveat: the &ldquo;meaning&rdquo; half is sparse retrieval with a synonym table,
                not neural embeddings.
              </em>{" "}
              It solves the vocabulary-mismatch problem Fathom&rsquo;s users complain about. It will
              not solve true paraphrase.
            </Li>
            <Li label="Speaker repair">
              Fully working, and it back-propagates — correct one line or every line attributed to
              that voice. This is the answer to the best-evidenced complaint about the original.
            </Li>
            <Li label="Clips and sharing">
              Real. Cut a range from the transcript, get a link, open it signed-out in a private
              window. A clip link ships only the clip&rsquo;s segments — the rest of the call is
              never sent to that browser.
            </Li>
            <Li label="Export">
              Markdown, WebVTT, SubRip and JSON, generated client-side. Fathom has no transcript
              export at all; clipboard copy is the only route out.
            </Li>
            <Li label="Everything you change">
              Ticking an action item, cutting a clip, fixing a speaker, asking a question — all
              persist across reloads.
            </Li>
          </ul>
        </Section>

        <Section title="Why there is no database">
          <p>
            Every read is server-rendered from a deterministic seed; everything you change is kept
            in your own browser and merged over it. That is a deliberate choice rather than a corner
            cut, for three reasons.
          </p>
          <p className="mt-2">
            A shared mutable demo is a demo where the third reviewer sees whatever the second one
            broke. Per-viewer state means everyone gets the workspace as intended, while their own
            changes still survive a refresh — which is what &ldquo;does this feel real&rdquo;
            actually requires. And it removes a credential and a cold start from the path between a
            reviewer and a working link.
          </p>
          <p className="mt-2">
            The honest cost: two people do not see each other&rsquo;s edits. Share links carry their
            payload in the URL precisely so that sharing still crosses the browser boundary — which
            also means the scope on a share link is honoured by the interface, not enforced by a
            server. With accounts, it would be.
          </p>
        </Section>

        <Section title="What was deliberately left out">
          <p>
            CRM sync, deal pipelines, coaching scorecards, calendar connection, authentication,
            billing, integrations, mobile, admin. Some of it is Fathom&rsquo;s actual moat, and all
            of it is downstream of the core loop working. Building a shallow version of any of it
            would have shown less judgement than not building it.{" "}
            <Link
              href="https://github.com/"
              className="underline"
              style={{ color: "var(--accent-ink)" }}
            >
              PRODUCT-NOTES.md
            </Link>{" "}
            in the repository has the full reasoning, and the research the decisions came from.
          </p>
        </Section>

        <Section title="The case this was built for">
          <p>
            The brief pointed at the eight-person call that runs an hour, because that is where the
            product actually gets tested. That call is{" "}
            <Link
              href="/m/m-roadmap-lock"
              className="underline"
              style={{ color: "var(--accent-ink)" }}
            >
              the roadmap lock
            </Link>{" "}
            — {Math.round(hero.meeting.durationMs / 60000)} minutes, {hero.segments.length} lines,{" "}
            {hero.chapters.length} chapters, eight speakers and one who never says a word. It is
            written to be hostile: overlapping speech, jargon the transcriber fumbles, a late
            joiner, and a decision that gets made, re-opened and re-made.
          </p>
          <p className="mt-2">
            The chapter rail, the speaker-lane minimap, the confidence filter and the repair flow
            all exist because of that call. On a two-person sales call none of them earn their
            place.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-[var(--radius-lg)] p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <h2 className="mb-2.5 text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Li({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col">
      <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
        {label}
      </span>
      <span className="text-[13.5px] leading-[1.65]">{children}</span>
    </li>
  );
}
