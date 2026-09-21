import type { MeetingSpec } from "../build";
import {
  KESTREL_FU_EXTRA,
  ONE_ON_ONE_EXTRA,
  RETRO_EXTRA,
  STANDUP_EXTRA,
  SUPPORT_EXTRA,
} from "./extra-scenes";

// The everyday calls. Shorter, and deliberately varied in shape so the meeting
// list doesn't look like ten copies of the same thing: a 9-minute standup next
// to a 45-minute interview next to a tense 1:1.

const P = {
  abu: "p-abubakar",
  priya: "p-priya",
  marcus: "p-marcus",
  dani: "p-dani",
  tom: "p-tom",
  ayesha: "p-ayesha",
  jonas: "p-jonas",
  rachel: "p-rachel",
  leah: "p-leah",
  nina: "p-nina",
  diego: "p-diego",
};

export const ONE_ON_ONE: MeetingSpec = {
  id: "m-1on1-priya-abu",
  title: "Priya / Abubakar — weekly 1:1",
  kind: "one-on-one",
  platform: "meet",
  startedAt: "2026-09-18T09:30:00.000Z",
  recordedById: "p-abubakar",
  gist: "On-call load is the real topic. Abubakar raises that he's been absorbing ingest pages that aren't his team's, and asks for the threshold doc to count as real work rather than a favour.",
  scenes: [
    {
      title: "On-call, and the thing that isn't being said",
      gist: "Nine of eleven pages last rotation were connector failures on another team's surface.",
      lines: [
        [P.priya, "How was the rotation?"],
        [P.abu, "Bad, and I want to be precise about why rather than just saying bad. Eleven pages. Nine of them were ingest connector failures. None of those nine were things I could fix — I acknowledged, checked the data wasn't corrupted, and went back to sleep."],
        [P.priya, "So you were woken up nine times to confirm that someone else's thing was broken in a way you already knew about."],
        [P.abu, "That's exactly it. And I'm not raising it as a complaint about Tom, because he knows and he's been asking for the time to fix it. I'm raising it because the on-call rota makes it invisible. The pages land on platform, the fix lives in ingest, and so the cost of not fixing it is paid by a team that can't fix it."],
        [P.priya, "That's a good framing and I hadn't seen it that way. The cost is disconnected from the decision."],
        [P.abu, "Right. If Tom's team got paged for Tom's connectors, the stabilisation work would have been prioritised nine months ago."],
        [P.priya, "Do you want me to change the rota?"],
        [P.abu, "Honestly, no — I think that's punishing a team for a problem sales created. I'd rather the page count just be visible somewhere Rachel looks."],
        [P.priya, "That I can do, and it's easier than a rota change. I'll put it in the Monday numbers."],
      ],
    },
    {
      title: "The threshold doc and how work gets counted",
      gist: "Abubakar asks for the shadow-index threshold doc to be counted as real work rather than something done around the edges.",
      lines: [
        [P.abu, "Second thing, and it's smaller but it's been bugging me. I picked up the shadow index threshold doc in the roadmap call. I'm happy to do it, it's the right thing to write. But it's the third time this quarter I've taken something that's genuinely important and genuinely invisible."],
        [P.priya, "Say more."],
        [P.abu, "The migration runbook, the on-call handover doc, now this. Each one takes two or three days and none of them appear anywhere. So when we do calibration, my output looks thin next to someone who shipped a feature."],
        [P.priya, "That's a completely legitimate thing to raise and I'd rather you raised it in September than in December when calibration is happening."],
        [P.abu, "That's why I'm raising it in September."],
        [P.priya, "Two things. One, I'll write these into your goals explicitly rather than treating them as overhead, so they're countable. Two — and this is the harder one — I want you to start saying no sometimes, because I keep giving you these precisely because you do them well and don't complain."],
        [P.abu, "I'd find that easier if there were an obvious other person."],
        [P.priya, "There isn't, which is the actual problem, and that's mine to fix rather than yours."],
      ],
    },
    {
      title: "Growth",
      gist: "Priya nudges toward the ingest platform primitive as visible, senior-scoped work.",
      lines: [
        [P.priya, "On the growth conversation — the thing I'd push you toward is the resumable-run primitive Tom described. It's exactly the shape of work that reads as staff-level: it's a platform capability, it unblocks another team, and it has a measurable outcome."],
        [P.abu, "It's also Tom's."],
        [P.priya, "It's in Tom's area and Tom has one and a half engineers. I think there's a version where you build the primitive and his team consumes it, and that's better for both of you than him squeezing it in."],
        [P.abu, "I'd want to talk to him before that gets decided anywhere."],
        [P.priya, "Obviously. Talk to him this week and tell me what he says, and if he'd rather own it then we find you something else."],
      ],
    },
    ...ONE_ON_ONE_EXTRA,
  ],
  summaries: {
    "one-on-one": [
      {
        heading: "Updates",
        bullets: [
          ["Last on-call rotation: 11 pages, 9 of them ingest connector failures Abubakar could not action.", "Eleven pages. Nine of them were ingest"],
        ],
      },
      {
        heading: "Blockers",
        bullets: [
          ["The on-call rota disconnects the cost of unstable connectors from the team that can fix them.", "the cost of not fixing it is paid by a team that can't"],
          ["Three significant pieces of invisible work this quarter (migration runbook, on-call handover, threshold doc) with no representation in goals.", "genuinely important and genuinely invisible"],
        ],
      },
      {
        heading: "Support needed",
        bullets: [
          ["Page counts surfaced in the Monday numbers so the cost is visible to Rachel — Priya agreed, easier than a rota change.", "I'll put it in the Monday numbers"],
          ["Invisible work written into goals explicitly so it counts at calibration.", "write these into your goals explicitly"],
          ["Priya acknowledged the load is concentrated on Abubakar because he doesn't push back, and named that as her problem to fix.", "that's mine to fix rather than yours"],
        ],
      },
      {
        heading: "Growth",
        bullets: [
          ["Suggested next scope: own the resumable-run primitive as a platform capability another team consumes.", "the resumable-run primitive Tom described"],
          ["Abubakar wants to speak with Tom before any ownership change is decided elsewhere.", "talk to him before that gets decided"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Abubakar to speak to Tom this week about primitive ownership.", "Talk to him this week"],
          ["Priya to add page counts to the Monday numbers and rewrite goals.", "I'll put it in the Monday numbers"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Talk to Tom about who owns the resumable-run primitive, then report back", assignee: "p-abubakar", anchor: "Talk to him this week", dueHint: "This week" },
    { text: "Add ingest page counts to the Monday numbers so the cost is visible", assignee: "p-priya", anchor: "I'll put it in the Monday numbers" },
    { text: "Rewrite Abubakar's goals to include platform/documentation work explicitly", assignee: "p-priya", anchor: "write these into your goals explicitly" },
  ],
  highlights: [
    { category: "risk", title: "The team paying for unstable connectors can't fix them", from: "the cost of not fixing it is paid by a team that can't", seconds: 26, by: "p-abubakar" },
    { category: "followup", title: "Invisible work isn't counted at calibration", from: "genuinely important and genuinely invisible", seconds: 30, by: "p-abubakar" },
  ],
};

export const PLATFORM_STANDUP: MeetingSpec = {
  id: "m-standup-platform",
  title: "Platform standup",
  kind: "standup",
  platform: "meet",
  startedAt: "2026-09-19T09:05:00.000Z",
  recordedById: "p-marcus",
  gist: "Nine minutes. Netsuite paged again overnight, the nav spike is blocked on a routing question, and Ayesha needs a decision on index storage by Monday.",
  scenes: [
    {
      title: "Round the room",
      gist: "Three updates, one blocker, one decision needed.",
      lines: [
        [P.marcus, "Quick one, nine minutes, I've got another thing at quarter past."],
        [P.abu, "Netsuite paged again at two forty this morning. Same 429-then-abort. I've filed it against Tom's stabilisation epic rather than opening a new incident, because it's the fourth time and it's not news."],
        [P.marcus, "Agreed, don't open incidents for known-broken. Anything else from you?"],
        [P.abu, "I'm on the threshold doc today and tomorrow. Should be out Wednesday."],
        [P.ayesha, "I need a decision from you by Monday on where the vector index lives. If it's in the main Postgres, I can start Tuesday. If it's a separate service, I need two weeks of setup first and the eval harness slips."],
        [P.marcus, "What's your preference?"],
        [P.ayesha, "Main Postgres with pgvector, honestly. It's slower than a dedicated store at scale but we're nowhere near the scale where that matters, and it halves the operational surface."],
        [P.marcus, "Then that, and I'll take the blame if we outgrow it. Decision made, don't wait until Monday."],
        [P.ayesha, "Great, that unblocks me."],
        [P.dani, "Nav spike is blocked on something I can't answer. There's route logic in eleven places and I don't know if the redirect behaviour is intentional or accumulated. Who would know?"],
        [P.marcus, "Nobody, is the honest answer. Treat it as accumulated, delete it, and see what breaks in staging."],
        [P.dani, "That's what I wanted permission to do."],
        [P.marcus, "Granted. Anything blocking anyone else? No? Nine minutes, we're done in five."],
      ],
    },
    ...STANDUP_EXTRA,
  ],
  summaries: {
    "project-update": [
      {
        heading: "Status by workstream",
        bullets: [
          ["Netsuite connector paged overnight for the fourth time — filed against the stabilisation epic rather than as a new incident.", "paged again at two forty"],
          ["Shadow index threshold doc in progress, due Wednesday.", "Should be out Wednesday"],
          ["Nav spike blocked on redirect behaviour across 11 route locations.", "route logic in eleven places"],
        ],
      },
      {
        heading: "What changed",
        bullets: [
          ["Vector index will live in main Postgres with pgvector rather than a separate service — decided on the call to avoid a two-week slip.", "Main Postgres with pgvector"],
          ["Team agreed not to open incidents for known-broken connectors.", "don't open incidents for known-broken"],
        ],
      },
      {
        heading: "Slipping",
        bullets: [
          ["Nothing slipping — the index decision was pulled forward specifically to stop the eval harness slipping.", "that unblocks me"],
        ],
      },
      {
        heading: "Decisions",
        bullets: [
          ["pgvector in main Postgres; Marcus explicitly took ownership of the consequence if it doesn't scale.", "I'll take the blame if we outgrow it"],
          ["Dani cleared to delete accumulated redirect logic and find out what breaks in staging.", "delete it, and see what breaks"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Ayesha starts the index work Tuesday.", "I can start Tuesday"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Ship the shadow index threshold doc", assignee: "p-abubakar", anchor: "Should be out Wednesday", dueHint: "Wed" },
    { text: "Start vector index work on pgvector in main Postgres", assignee: "p-ayesha", anchor: "I can start Tuesday", dueHint: "Tue" },
    { text: "Delete accumulated redirect logic and test in staging", assignee: "p-dani", anchor: "delete it, and see what breaks" },
  ],
  highlights: [
    { category: "decision", title: "pgvector in main Postgres, decided on the spot to avoid a slip", from: "Main Postgres with pgvector", seconds: 24, by: "p-marcus" },
  ],
};

export const SUPPORT_REVIEW: MeetingSpec = {
  id: "m-support-review",
  title: "Support review — September ticket drivers",
  kind: "planning",
  platform: "zoom",
  startedAt: "2026-09-15T13:00:00.000Z",
  recordedById: "p-jonas",
  gist: "The ticket data that Jonas takes into the roadmap call. Second-source discoverability is 28% of volume and it is a design problem, not a bug.",
  scenes: [
    {
      title: "The buckets",
      gist: "Jonas presents the 90-day breakdown; Dani reframes the top category as an IA failure.",
      lines: [
        [P.jonas, "Ninety days of tickets, bucketed. I want to walk you through it before the roadmap meeting so you're not seeing it cold."],
        [P.priya, "Appreciated."],
        [P.jonas, "Twenty-eight percent: cannot find how to add a second data source. Nineteen percent: search returned nothing useful. Eleven percent: sync failed and I can't see why. Then a long tail of genuine bugs, about eight percent combined, and the rest is billing, access, and people asking us to do things for them."],
        [P.dani, "The twenty-eight percent one — how many of those are new customers versus established?"],
        [P.jonas, "Mostly established, which surprised me. It's not an onboarding gap, it's people who've been using us for months and hit the second-source moment for the first time."],
        [P.dani, "That's actually a much worse finding, because it means the problem is invisible until someone succeeds enough to need more. You only hit it if you're going well."],
        [P.priya, "So the people we're failing are our best customers."],
        [P.dani, "The people you're failing are the ones about to expand. Which is also the revenue you most want."],
        [P.jonas, "I hadn't put it in those terms and I'm going to steal that for the roadmap meeting."],
      ],
    },
    {
      title: "What a week of unglamorous work would buy",
      gist: "Jonas quantifies the fix at roughly 40% of ticket volume and flags the response-time trend.",
      lines: [
        [P.jonas, "My estimate is that empty states that name the next action, plus surfacing the actual sync error on screen, takes about forty percent off my volume."],
        [P.priya, "How confident are you in forty?"],
        [P.jonas, "Reasonably. The twenty-eight and the eleven are both pure information problems — the system knows the answer and doesn't say it. If we say it, those tickets mostly don't get filed. I'd be surprised if it were below thirty."],
        [P.priya, "And what's the trend if we do nothing?"],
        [P.jonas, "Response time has gone four hours to eleven over the quarter. Volume is up about twenty percent, headcount is flat. If both trends hold we're at twenty hours by March, and at twenty hours people stop filing tickets and start churning quietly instead."],
        [P.priya, "That last sentence is the one to lead with. Not the eleven hours — the quiet churn."],
        [P.jonas, "Noted."],
      ],
    },
    ...SUPPORT_EXTRA,
  ],
  summaries: {
    general: [
      {
        heading: "Overview",
        bullets: [
          ["90-day ticket analysis ahead of the Q4 roadmap call.", "Ninety days of tickets, bucketed"],
        ],
      },
      {
        heading: "Key points",
        bullets: [
          ["28% — cannot find how to add a second data source. 19% — search returned nothing. 11% — sync failed with no visible reason.", "Twenty-eight percent: cannot find how"],
          ["The second-source problem hits established customers, not new ones — it only surfaces when a customer is succeeding and about to expand.", "It's not an onboarding gap"],
          ["Response time is 4h → 11h over the quarter on flat headcount, with volume up ~20%.", "four hours to eleven"],
        ],
      },
      {
        heading: "Decisions",
        bullets: [
          ["Frame the roadmap ask around quiet churn rather than response time.", "the quiet churn"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Jonas to take the 40% volume-reduction estimate into the roadmap call.", "forty percent off my volume"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Take the ticket breakdown and the 40% estimate into the Q4 roadmap call", assignee: "p-jonas", anchor: "forty percent off my volume", done: true },
    { text: "Reframe the support ask around quiet churn rather than response time", assignee: "p-jonas", anchor: "the quiet churn", done: true },
  ],
  highlights: [
    { category: "risk", title: "The second-source gap hits customers who are about to expand", from: "the ones about to expand", seconds: 24, by: "p-priya" },
    { category: "risk", title: "At 20-hour response times people churn quietly instead of complaining", from: "start churning quietly instead", seconds: 22, by: "p-priya" },
  ],
};

export const CANDIDATE_INTERVIEW: MeetingSpec = {
  id: "m-nina-interview",
  title: "Nina Petrova — systems design interview",
  kind: "interview",
  platform: "meet",
  startedAt: "2026-09-16T11:00:00.000Z",
  recordedById: "p-marcus",
  gist: "Strong hire signal. Nina designs the ingest problem we actually have, unprompted, and pushes back well when challenged. One concern about scope of prior ownership.",
  scenes: [
    {
      title: "Background",
      gist: "Six years, mostly data infrastructure at two companies.",
      lines: [
        [P.marcus, "Thanks for making time. Abubakar's here too. This is ninety percent design discussion, ten percent me asking about your background, and I'd rather do the background bit fast."],
        [P.nina, "Works for me."],
        [P.nina, "Six years. Four at Corvid on their ingestion platform, last two at Halden doing more general backend. The Corvid work is the relevant bit — we built the connector framework that about forty integrations sat on top of."],
        [P.abu, "Forty integrations on one framework. What broke first?"],
        [P.nina, "Error semantics. We had a Result type that every connector returned, and for the first year it was just success or failure. Which is useless, because 'failed' covers rate-limited-retry-later and your-credentials-are-wrong-stop-forever, and those need completely opposite handling."],
        [P.abu, "That's — we have exactly that problem right now."],
        [P.nina, "Most people do. The fix is boring: make the failure type an enum with retry semantics attached, and make the framework rather than the connector decide what to do about it."],
      ],
    },
    {
      title: "Design: resumable ingestion",
      gist: "Nina designs incremental resumable sync unprompted, including the exactly-once question.",
      lines: [
        [P.marcus, "Let's do the design. You've got a source with two million rows, a per-account rate limit you share with the customer's own tooling, and syncs that currently take forty minutes and abort on the first 429. Design it."],
        [P.nina, "Can I ask three questions first?"],
        [P.marcus, "Please."],
        [P.nina, "Does the source expose a reliable modified-at? Is ordering guaranteed on that field? And do we need exactly-once delivery downstream or is at-least-once acceptable?"],
        [P.abu, "Modified-at yes, ordering not guaranteed, and at-least-once is acceptable if we're idempotent on write."],
        [P.nina, "Then the shape is: a cursor table keyed on source plus connector plus watermark. You sync in windows on modified-at with a deliberate overlap — say five minutes — to cover the unordered writes. Each window commits its watermark only after the downstream write acknowledges. A 429 pauses the run and schedules a retry with backoff; it doesn't discard the watermark, so you resume from the last committed window rather than from zero."],
        [P.marcus, "What's the overlap cost?"],
        [P.nina, "You reprocess a few minutes of rows each window, which is fine if writes are idempotent, and it's the cheapest insurance against out-of-order updates I know of. The alternative is a full reconciliation pass and that's much more expensive."],
        [P.marcus, "Push back on yourself. Where does that design fail?"],
        [P.nina, "Backfill. Everything I described is good for the steady state and bad for the first run, where you've got two million rows and no watermark. You need a separate backfill path that chunks by primary key rather than time, runs at lower priority, and can be paused entirely during business hours. If you try to make one code path do both you get a system that's bad at each."],
        [P.abu, "That's the thing we got wrong, precisely."],
      ],
    },
    {
      title: "Concerns and candidate questions",
      gist: "Marcus probes ownership scope. Nina asks a sharp question about how decisions get made.",
      lines: [
        [P.marcus, "One thing I want to test. You've described the Corvid framework as 'we built'. What was yours specifically?"],
        [P.nina, "Fair challenge. I owned the error semantics and the retry layer end to end. The cursor design was mostly a colleague, Ravi — I reviewed it and argued about the overlap window but it was his. The scheduling layer I didn't touch at all."],
        [P.marcus, "I appreciate that answer a lot."],
        [P.nina, "I'd rather tell you now than have you find out in month two."],
        [P.nina, "My question. When engineering and sales disagree about a date, how does that actually get resolved here? Not the official answer."],
        [P.marcus, "Honestly? Historically sales won and engineering absorbed it, and we're about three weeks into trying to change that. There's a rule being written right now precisely because of this.", { shaky: true }],
        [P.nina, "That's a better answer than a confident one would have been. Is the rule being written because someone senior got burned, or because someone junior complained until it was heard?"],
        [P.abu, "The second, mostly."],
        [P.nina, "Then I'd be interested."],
      ],
    },
  ],
  summaries: {
    interview: [
      {
        heading: "Background",
        bullets: [
          ["6 years total; 4 at Corvid on an ingestion platform supporting ~40 integrations, 2 at Halden on general backend.", "Four at Corvid on their ingestion platform"],
        ],
      },
      {
        heading: "Technical signal",
        bullets: [
          ["Identified error semantics as the first thing to break at scale, unprompted, and described exactly the failure mode we currently have.", "We had a Result type"],
          ["Asked three precise scoping questions before designing — modified-at reliability, ordering guarantees, delivery semantics.", "Can I ask three questions first"],
          ["Designed watermark-based resumable sync with a deliberate overlap window, and justified the reprocessing cost against the alternative.", "cheapest insurance against out-of-order"],
          ["Self-critiqued accurately when asked: identified backfill as the weak point of her own design and argued against a single code path.", "You need a separate backfill path"],
        ],
      },
      {
        heading: "Concerns",
        bullets: [
          ["Initially described team work as 'we built'; on challenge, drew a clean and credible line around what was hers (error semantics, retry) versus a colleague's (cursor design).", "I owned the error semantics"],
          ["No exposure to the scheduling layer — a gap if the role needs it.", "The scheduling layer I didn't touch"],
        ],
      },
      {
        heading: "Candidate questions",
        bullets: [
          ["Asked how engineering/sales date disagreements actually resolve, and explicitly asked for the unofficial answer.", "Not the official answer"],
          ["Followed up on whether the change came from senior pain or junior persistence — a good read on how the org works.", "or because someone junior complained"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Strong signal on the exact problem domain we are hiring for. Recommend advancing.", "Then I'd be interested"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Write up interview feedback — recommend advance", assignee: "p-marcus", anchor: "Then I'd be interested", dueHint: "Today" },
    { text: "Ask Nina about scheduling-layer exposure in the next round", assignee: "p-abubakar", anchor: "The scheduling layer I didn't touch" },
  ],
  highlights: [
    { category: "quote", title: "Designs our exact ingest problem, unprompted", from: "cheapest insurance against out-of-order", seconds: 34, by: "p-abubakar" },
    { category: "quote", title: "Clean self-assessment of what was actually hers", from: "I owned the error semantics", seconds: 26, note: "Volunteered the limits of her ownership under challenge. Strong signal.", by: "p-marcus" },
    { category: "idea", title: "Failure type as an enum with retry semantics attached", from: "make the failure type an enum", seconds: 22, by: "p-abubakar" },
  ],
};

export const AUGUST_RETRO: MeetingSpec = {
  id: "m-retro-august",
  title: "August retrospective — Platform",
  kind: "retro",
  platform: "zoom",
  startedAt: "2026-09-02T14:00:00.000Z",
  recordedById: "p-marcus",
  gist: "The migration went well and nobody noticed, which becomes the actual topic. Recurring theme: work that prevents problems is invisible and therefore unfunded.",
  scenes: [
    {
      title: "Went well",
      gist: "The Postgres 16 migration landed with zero downtime and zero recognition.",
      lines: [
        [P.marcus, "Start with what went well. Anyone."],
        [P.abu, "The Postgres migration. Zero downtime, zero rollbacks, and it took four weeks of prep to make it look like nothing happened."],
        [P.ayesha, "And nobody said anything about it, which I think is worth noticing rather than just being noble about."],
        [P.dani, "That's genuinely a pattern. The stuff that goes well is invisible by construction."],
        [P.marcus, "It's the same shape as the on-call conversation. Prevention doesn't show up anywhere."],
        [P.tom, "It shows up in the absence of an incident, which is a thing nobody writes a doc about."],
        [P.abu, "Could we write the doc? Genuinely. A one-paragraph 'here's what didn't happen this month and why' in the Monday numbers."],
        [P.marcus, "That's a small idea and I like it a lot. Let's try it for a month."],
      ],
    },
    {
      title: "Did not go well",
      gist: "Two incidents, both from unreviewed config changes. The review rule exists and was skipped both times.",
      lines: [
        [P.marcus, "Didn't go well."],
        [P.tom, "Two incidents, both config changes, both pushed without review."],
        [P.ayesha, "Was the rule unclear or was it ignored?"],
        [P.tom, "Ignored, and I did one of them, so I'll say it plainly. I skipped review because it was a one-line change at six in the evening and I wanted to go home."],
        [P.marcus, "Thank you for saying that straight. Most people would have said the process was unclear."],
        [P.tom, "The process is clear. I just didn't follow it."],
        [P.abu, "Then the fix isn't more process, it's making review fast enough that skipping it isn't tempting. If review takes ten minutes at six pm, nobody skips it."],
        [P.dani, "How long does it take now?"],
        [P.tom, "Realistically? Next morning."],
        [P.marcus, "So the actual problem is review latency, not discipline. That's a much more tractable thing."],
      ],
    },
    {
      title: "Actions",
      gist: "Config review gets a fast path; the prevention paragraph goes into the Monday numbers.",
      lines: [
        [P.marcus, "So: config changes get a fast-path review, any two engineers, target under thirty minutes in working hours. And after hours, the rule is you don't push config after six unless it's an incident."],
        [P.tom, "I can live with that and I'd have followed it."],
        [P.marcus, "And Abubakar's prevention paragraph goes in the Monday numbers for a month, then we decide whether it's earning its place."],
        [P.ayesha, "Can I add one? The eval harness has been cut three quarters running and I'd like that noted in a retro rather than only being annoyed about it privately."],
        [P.marcus, "Noted, in writing, and I'll carry it into the roadmap meeting myself so it isn't only you making the case."],
      ],
    },
    ...RETRO_EXTRA,
  ],
  summaries: {
    retro: [
      {
        heading: "Went well",
        bullets: [
          ["Postgres 16 migration: zero downtime, zero rollbacks, four weeks of preparation.", "Zero downtime, zero rollbacks"],
          ["The team noticed that invisible prevention work goes unrecognised — and treated that as a problem to solve rather than a virtue.", "invisible by construction"],
        ],
      },
      {
        heading: "Did not go well",
        bullets: [
          ["Two incidents, both from config changes pushed without review.", "both pushed without review"],
          ["Tom owned one of them directly and named the real reason rather than blaming process clarity.", "I skipped review because it was a one-line change"],
        ],
      },
      {
        heading: "Start doing",
        bullets: [
          ["Fast-path config review: any two engineers, target under 30 minutes during working hours.", "target under thirty minutes"],
          ["A 'what didn't happen this month and why' paragraph in the Monday numbers, trialled for a month.", "here's what didn't happen this month"],
        ],
      },
      {
        heading: "Stop doing",
        bullets: [
          ["No config pushes after 6pm unless responding to an incident.", "you don't push config after six"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Marcus to carry the eval harness case into the roadmap meeting so Ayesha isn't the only advocate.", "carry it into the roadmap meeting myself"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Set up fast-path config review, two engineers, 30-minute target", assignee: "p-marcus", anchor: "target under thirty minutes", done: true },
    { text: "Add a monthly 'what didn't happen' paragraph to the Monday numbers", assignee: "p-abubakar", anchor: "here's what didn't happen this month" },
    { text: "Carry the eval harness case into the Q4 roadmap meeting", assignee: "p-marcus", anchor: "carry it into the roadmap meeting myself", done: true },
  ],
  highlights: [
    { category: "idea", title: "Review latency, not discipline, is the real problem", from: "the actual problem is review latency", seconds: 24, by: "p-marcus" },
    { category: "quote", title: "Tom owns the skipped review without blaming process", from: "The process is clear. I just didn't follow it", seconds: 18, by: "p-marcus" },
  ],
};

export const KESTREL_FOLLOWUP: MeetingSpec = {
  id: "m-kestrel-followup",
  title: "Kestrel Freight — pricing and timeline follow-up",
  kind: "sales",
  platform: "zoom",
  startedAt: "2026-09-19T15:00:00.000Z",
  recordedById: "p-leah",
  gist: "Diego pushes for a discount tied to the December Salesforce date. Leah holds on price but is now exposed on a date engineering has not confirmed.",
  scenes: [
    {
      title: "Commercial",
      gist: "Diego anchors low, Leah trades term length instead of discount.",
      lines: [
        [P.leah, "Where did you land internally?"],
        [P.diego, "Positive, broadly. Mei's on board, which I wasn't sure about after the first call. The sticking point is price — I've got budget for about thirty-eight, you're at fifty-two."],
        [P.leah, "What's in the thirty-eight? Is that a hard ceiling or an opening position?"],
        [P.diego, "It's what's allocated. I could go higher with a business case but I'd need something to point at."],
        [P.leah, "Then let me not discount and instead give you something to point at. If you go two years rather than one, I can hold year-one at forty-four and lock year two at the same number, so your three-year total is better than a one-year deal at thirty-eight renewed twice at list."],
        [P.diego, "That's a better answer than a discount, actually. Send me that as a model and I'll take it up."],
      ],
    },
    {
      title: "The December problem",
      gist: "Diego treats the Salesforce date as settled. Leah does not correct it.",
      lines: [
        [P.diego, "The other thing is the Salesforce two-way. I've built my rollout plan assuming December, because that's what you said last time. Am I safe there?"],
        [P.leah, "Let me come back to you on the exact date rather than confirming it here.", { shaky: true }],
        [P.diego, "But it's Q4, right? That was fairly definite."],
        [P.leah, "It's what's planned, yes. I want to give you a date I'm confident in rather than repeat one I'm not."],
        [P.diego, "Okay, but Leah — if that moves, my rollout plan moves, and I've already socialised it internally. I'd much rather know now than in November."],
        [P.leah, "Understood. I'll have an answer for you this week, and if the answer is bad I'll tell you it's bad rather than managing it."],
        [P.diego, "That's all I'd ask."],
      ],
    },
    ...KESTREL_FU_EXTRA,
  ],
  summaries: {
    sales: [
      {
        heading: "Company context",
        bullets: [
          ["Mei is now bought in, which was the open question after discovery.", "Mei's on board"],
        ],
      },
      {
        heading: "Pain and priorities",
        bullets: [
          ["Budget allocated at 38k against a 52k list price; Diego needs a business case to go higher.", "I've got budget for about thirty-eight"],
          ["Rollout plan has already been socialised internally against a December Salesforce date.", "I've already socialised it internally"],
        ],
      },
      {
        heading: "Objections raised",
        bullets: [
          ["Price gap of 14k, framed as an allocation ceiling rather than a negotiating position.", "It's what's allocated"],
        ],
      },
      {
        heading: "Buying signals",
        bullets: [
          ["Diego responded well to a term-length trade over a discount and asked for it as a model.", "Send me that as a model"],
          ["Internal champion secured on the technical side.", "Mei's on board"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["ESCALATE: Diego has an internal rollout plan built on a December date engineering has not confirmed, and the feature is off the Q4 list.", "if that moves, my rollout plan moves"],
          ["Leah to send the two-year model.", "Send me that as a model"],
          ["Leah owes a firm Salesforce date this week and has committed to delivering bad news as bad news.", "I'll tell you it's bad rather than managing it"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Send Diego the two-year model: 44k year one, locked year two", assignee: "p-leah", anchor: "Send me that as a model", dueHint: "Today" },
    { text: "Get a firm answer on the Salesforce two-way date and tell Diego straight", assignee: "p-leah", anchor: "an answer for you this week", dueHint: "This week" },
  ],
  highlights: [
    { category: "risk", title: "Customer rollout plan already built on an unconfirmed December date", from: "I've already socialised it internally", seconds: 28, note: "Feature is off the Q4 list. Rachel is taking this conversation.", by: "p-rachel" },
    { category: "idea", title: "Term length traded instead of discount", from: "let me not discount and instead", seconds: 30, by: "p-leah" },
  ],
};
