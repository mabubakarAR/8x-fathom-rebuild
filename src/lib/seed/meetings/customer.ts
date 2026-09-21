import type { MeetingSpec } from "../build";

// External-facing calls. These are the ones that get shared outside the
// company, so they are what the public share link and clip flows demo against.
//
// They also thread into the internal calls on purpose: the escalation Helen
// delivers here is the one Rachel reads out in the roadmap call, and the
// Salesforce promise Leah makes to Diego is the one Rachel has to walk back.
// Cross-meeting search is only worth building if the corpus has threads.

const P = {
  abu: "p-abubakar",
  rachel: "p-rachel",
  leah: "p-leah",
  jonas: "p-jonas",
  priya: "p-priya",
  ayesha: "p-ayesha",
  tom: "p-tom",
  helen: "p-helen",
  owen: "p-owen",
  diego: "p-diego",
  mei: "p-mei",
};

export const BRIGHTWATER_QBR: MeetingSpec = {
  id: "m-brightwater-qbr",
  title: "Brightwater Health — Q3 business review",
  kind: "customer",
  platform: "teams",
  startedAt: "2026-09-10T15:00:00.000Z",
  recordedById: "p-rachel",
  gist: "Renewal is genuinely at risk. Helen names three problems — search returns nothing, connectors are late with no comms, nobody can find anything. Owen adds a security review dependency nobody knew about.",
  scenes: [
    {
      title: "Where the account stands",
      gist: "Usage numbers are up but concentrated in four people. Helen reframes that as a bad sign rather than a good one.",
      lines: [
        [P.rachel, "Thanks both for making time. I want to keep this short and mostly listen, because I don't think a slide deck is what's useful today."],
        [P.helen, "Appreciated."],
        [P.leah, "I'll do two minutes on usage and then get out of the way. Queries are up about thirty percent quarter on quarter, weekly active is at thirty-one people out of the forty-two seats, and you've added one new source."],
        [P.helen, "Can I push on the thirty-one? Because I think that number flatters us both."],
        [P.rachel, "Please."],
        [P.helen, "If you look at who those thirty-one are, I'd guess four of them account for most of the actual queries and the rest log in, try something, and leave. I know that because those four are the people my team goes to when they need something found. We've essentially created four human search engines."],
        [P.leah, "That's — yeah, I can check the distribution but I suspect you're right."],
        [P.helen, "I'd rather you check than agree with me. But my point is that adoption numbers going up isn't the thing I'd celebrate. Concentration going up is a risk, not a win.", { shaky: true }],
        [P.owen, "It's also a bus-factor problem for us internally. Two of those four are contractors."],
      ],
    },
    {
      title: "The three problems, in Helen's words",
      gist: "Search returning nothing with no explanation; four connector requests since March with one delivered and no proactive comms; an interface nobody can navigate.",
      lines: [
        [P.rachel, "So let's do the hard part. What's not working."],
        [P.helen, "Three things and I'll try to be precise rather than just venting. First, search. It's not that it gives wrong answers. It gives nothing. Someone searches for a term, gets an empty screen, and has no way to tell whether the thing doesn't exist or the tool failed to find it. And once you've had that happen twice, you stop trusting it entirely."],
        [P.rachel, "That distinction matters a lot and I don't think we'd internalised it."],
        [P.helen, "People have gone back to keeping their own spreadsheets. Which is precisely the thing we bought you to eliminate."],
        [P.leah, "That's painful to hear."],
        [P.helen, "It should be. Second thing — connectors. We've asked for four since March. One has landed. I genuinely understand that engineering is hard and things take longer than planned. What I don't accept is that the only way I learn about a delay is by asking."],
        [P.rachel, "That one's entirely on us and it's a communication failure rather than an engineering one, which makes it worse rather than better."],
        [P.helen, "Third, and this is the one I feel silly raising because it sounds trivial. Nobody on my team can find anything in the interface. We have a Slack channel — an actual dedicated channel — where people ask each other where things are in your product."],
        [P.rachel, "A channel for asking where things are."],
        [P.helen, "Yes. It has about sixty messages a month in it. And I've seen your product demoed three times and I still couldn't tell you where the saved views are."],
        [P.owen, "It's the thing that generates the most eye-rolling internally, for what it's worth. More than the search."],
        [P.helen, "None of this is unfixable and I'd much rather fix it with you than go through a migration. But I need to see movement before January, not another roadmap."],
      ],
    },
    {
      title: "Owen's security review — the dependency nobody knew about",
      gist: "A SOC 2 evidence request lands as a hard renewal blocker with a six-week lead time, previously unmentioned.",
      lines: [
        [P.owen, "There's a fourth thing which isn't a complaint, it's a process item, and it might be the one with the tightest deadline."],
        [P.rachel, "Go on."],
        [P.owen, "Our security team has moved to an annual re-review for anything holding patient-adjacent data. You're in scope. That means a fresh SOC 2 report, a completed vendor questionnaire, and a pen test summary. Our team needs six weeks with it before they'll sign off."],
        [P.rachel, "Six weeks before the fourteenth of January means we need it with you in early December."],
        [P.owen, "Early December, and I'd say end of November to be safe, because our security lead takes three weeks off over Christmas."],
        [P.rachel, "Is this a blocker or a formality?"],
        [P.owen, "It is a hard blocker. I cannot sign a renewal without it, regardless of how the product conversation goes. I'm telling you now because I only found out myself last week and I'd rather you weren't surprised.", { shaky: true }],
        [P.rachel, "I'm very glad you told me now. That reorders my week."],
        [P.helen, "That's why we asked for the extra fifteen minutes."],
      ],
    },
    {
      title: "What happens next",
      gist: "Rachel commits to a written plan with dates rather than a roadmap, and to proactive delay comms.",
      lines: [
        [P.rachel, "Let me say back what I'm taking away, and please correct me. Search that fails silently is the biggest one. Connector delays without proactive communication is second and is the easiest for me to fix immediately. Navigation is third by your ranking but might be first by impact. And the security review is a hard blocker with a November deadline."],
        [P.helen, "That's an accurate summary. I'd only swap the order of the first and third, actually, now I hear it back."],
        [P.rachel, "Noted, and that's useful. What I'm going to send you is not a roadmap. It's a list with dates and names against each item, and I'll send you a status against it every two weeks whether or not there's progress, including the weeks where the answer is 'no movement'."],
        [P.helen, "That last part is the bit I actually want. The silence is worse than the delay."],
        [P.rachel, "Understood. Jonas, can you get Helen's team a direct line rather than the general queue?"],
        [P.jonas, "I'll set up a shared channel today and put myself and Ana in it."],
        [P.owen, "That would help a lot."],
      ],
    },
  ],
  summaries: {
    "customer-success": [
      {
        heading: "Account health",
        bullets: [
          ["Queries up ~30% QoQ, 31 of 42 seats weekly active — but Helen believes usage is concentrated in roughly four people acting as human search engines for everyone else.", "four of them account for most"],
          ["Two of those four power users are contractors, making it a bus-factor risk on the customer side too.", "Two of those four are contractors"],
          ["Renewal date is 14 January and is explicitly not a formality this year.", "movement before January, not another roadmap"],
        ],
      },
      {
        heading: "Friction and complaints",
        bullets: [
          ["Search returns empty results with no way to distinguish 'nothing exists' from 'the tool failed'. Teams have reverted to private spreadsheets.", "gone back to keeping their own spreadsheets"],
          ["Four connector requests since March, one delivered, and delays only surface when the customer asks.", "the only way I learn about a delay is by asking"],
          ["The customer runs a dedicated Slack channel, ~60 messages/month, purely for asking each other where things are in the product.", "where people ask each other where things are"],
          ["Helen reordered her own ranking on reflection: navigation may be the top problem, not the third.", "swap the order of the first and third"],
        ],
      },
      {
        heading: "Requests",
        bullets: [
          ["A dated plan with owners, not a roadmap.", "It's a list with dates and names"],
          ["Fortnightly status updates including the weeks with no progress.", "The silence is worse than the delay"],
          ["A direct support channel rather than the general queue.", "shared channel today"],
        ],
      },
      {
        heading: "Risk signals",
        bullets: [
          ["HARD BLOCKER: annual security re-review requires SOC 2 report, vendor questionnaire and pen test summary, delivered by end November. Owen cannot sign without it.", "It is a hard blocker"],
          ["Security lead is away for three weeks over Christmas, removing all December slack.", "takes three weeks off over Christmas"],
          ["Trust erosion is the underlying theme — twice-burned users stop using search entirely.", "you stop trusting it entirely"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Rachel to send a dated plan and commit to fortnightly status.", "every two weeks whether or not there's progress"],
          ["Jonas to open a shared support channel with himself and Ana today.", "shared channel today"],
          ["Security pack owed by end November.", "end of November to be safe"],
        ],
      },
    ],
    qa: [
      {
        heading: "Questions and answers",
        bullets: [
          ["Q: Is the 31-of-42 weekly active number meaningful? A: Helen believes it is concentrated in ~4 people; Leah agreed to check the distribution rather than assume.", "I'd rather you check than agree with me"],
          ["Q: Is the security review a blocker or a formality? A: A hard blocker — no renewal signature without it.", "It is a hard blocker"],
          ["Q: What does Helen actually want from us? A: Dates with names, and status even when there is no progress.", "The silence is worse than the delay"],
        ],
      },
      {
        heading: "Unanswered",
        bullets: [
          ["The actual query-concentration distribution — Leah to come back with real numbers.", "I can check the distribution"],
          ["Whether the navigation work can land before January was not addressed on this call.", "swap the order of the first and third"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Dated plan from Rachel; support channel from Jonas; security pack by end November.", "It's a list with dates and names"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Send Brightwater a dated plan with owners — explicitly not a roadmap", assignee: "p-rachel", anchor: "It's a list with dates and names", dueHint: "This week" },
    { text: "Set up fortnightly status updates to Helen, including no-progress weeks", assignee: "p-rachel", anchor: "every two weeks whether or not there's progress" },
    { text: "Open a shared support channel for Brightwater with Jonas and Ana", assignee: "p-jonas", anchor: "shared channel today", done: true },
    { text: "Assemble the security pack: SOC 2, vendor questionnaire, pen test summary", assignee: "p-rachel", anchor: "a fresh SOC 2 report", dueHint: "End Nov" },
    { text: "Pull the real query-concentration distribution rather than assuming Helen is right", assignee: "p-leah", anchor: "I can check the distribution" },
  ],
  highlights: [
    { category: "risk", title: "Security review is a hard renewal blocker, due end November", from: "It is a hard blocker", seconds: 34, note: "Six-week lead time and their security lead is out for three weeks at Christmas. No slack at all.", by: "p-rachel" },
    { category: "quote", title: "\"A Slack channel for asking where things are\"", from: "where people ask each other where things are", seconds: 26, by: "p-rachel" },
    { category: "risk", title: "Users have reverted to private spreadsheets", from: "gone back to keeping their own spreadsheets", seconds: 22, by: "p-jonas" },
    { category: "quote", title: "\"The silence is worse than the delay\"", from: "The silence is worse than the delay", seconds: 18, by: "p-rachel" },
    { category: "risk", title: "Usage concentrated in four people acting as human search engines", from: "four of them account for most", seconds: 30, by: "p-leah" },
  ],
};

export const KESTREL_DISCOVERY: MeetingSpec = {
  id: "m-kestrel-discovery",
  title: "Kestrel Freight — technical discovery",
  kind: "discovery",
  platform: "meet",
  startedAt: "2026-09-08T16:30:00.000Z",
  recordedById: "p-leah",
  gist: "Strong fit on the data side. Mei is the technical blocker to win over; Diego is already sold. Salesforce two-way sync surfaces as a requirement, not a nice-to-have.",
  scenes: [
    {
      title: "What Kestrel actually does with data today",
      gist: "Mei describes a warehouse-plus-spreadsheets setup with a two-day reporting lag.",
      lines: [
        [P.leah, "Diego, Mei — thanks. Abubakar's here from our engineering side because last time you had questions I couldn't answer properly and I'd rather not repeat that."],
        [P.diego, "Appreciated, that was a frustrating call."],
        [P.mei, "It was fine, you just didn't know and said so, which is better than guessing."],
        [P.leah, "Let's start with what you've got today."],
        [P.mei, "Snowflake as the warehouse, Fivetran pulling from about nine sources, dbt for transforms, and then — honestly — a lot of Google Sheets. The warehouse is clean. Everything downstream of the warehouse is not."],
        [P.diego, "The number I care about is that a question from an ops manager takes two days to answer. Not because it's hard, because it queues behind Mei's team."],
        [P.mei, "It's a queue problem, yes. We get maybe forty ad-hoc requests a week and we're three people."],
        [P.abu, "Of those forty, roughly what fraction are genuinely novel versus a variation on something you've answered before?"],
        [P.mei, "That's a good question. I'd say seventy percent are variations. Same shape, different date range or different depot."],
        [P.abu, "Then the self-serve case is strong, because variations are exactly what self-serve handles well and novel analysis is exactly what it doesn't."],
        [P.mei, "That's a more honest answer than I usually get from a vendor, so thank you."],
      ],
    },
    {
      title: "The Salesforce requirement",
      gist: "Diego states two-way Salesforce sync as a requirement. Leah commits to December without checking. This is the promise Rachel later has to walk back.",
      lines: [
        [P.diego, "I want to flag the thing that will kill this if it's not there. We run everything through Salesforce. Not just as a CRM, it's where our account managers live all day. If your insights sit in a separate tool, my team won't look at them."],
        [P.leah, "Understood, and we do have a Salesforce integration."],
        [P.diego, "One-way or two-way? Because one-way is a report and two-way is a workflow."],
        [P.leah, "Two-way is on the roadmap for Q4. I'd expect that in December.", { shaky: true }],
        [P.diego, "December works. If it's December I can build the rollout around it."],
        [P.abu, "I'd want to check the specifics of what two-way means for your case before we hold anyone to a month. Writing back a field is different from writing back an object, and they're very different amounts of work."],
        [P.diego, "Field-level is what we need. Writing a risk score and a last-touch summary onto the account record."],
        [P.abu, "That's the more tractable one, but I still want to confirm rather than agree in the room."],
        [P.leah, "Fair. I'll come back with a firm answer rather than a roadmap answer."],
        [P.mei, "Can I say that I appreciate the engineer pumping the brakes on the salesperson? That's a good sign about how you'll behave after we sign."],
      ],
    },
    {
      title: "Objections and what would make this a no",
      gist: "Mei's concern is lock-in and export. Diego's is change fatigue after a failed rollout last year.",
      lines: [
        [P.mei, "My objection is lock-in. We got burned on a tool two years ago where getting our own data back out was deliberately painful. What does export look like?"],
        [P.abu, "Everything is exportable, and the API is the same API our own front end uses, so there's no second-class path. I'd rather you tested that during a trial than took my word for it."],
        [P.mei, "I will absolutely test that during a trial."],
        [P.diego, "My objection is different. We rolled out a BI tool last year, it failed, and the failure was adoption rather than technology. My people are tired of new tools. So whatever we do has to look like less work on day one, not more."],
        [P.leah, "What did the last rollout get wrong?"],
        [P.diego, "We trained everyone at once, in a big session, three weeks before anyone needed it. By the time they needed it they'd forgotten."],
        [P.abu, "The pattern that works better is usually one team, one real question they already care about, and no training at all — if they need training for the first query, we've built it wrong."],
        [P.diego, "That I'd buy. Start with the depot managers, they complain the loudest and they'd notice immediately."],
      ],
    },
  ],
  summaries: {
    discovery: [
      {
        heading: "Current state",
        bullets: [
          ["Snowflake warehouse, Fivetran across ~9 sources, dbt for transforms — clean upstream, heavy Google Sheets downstream.", "a lot of Google Sheets"],
          ["~40 ad-hoc requests a week against a three-person data team; ops questions take two days to answer.", "takes two days to answer"],
          ["Roughly 70% of requests are variations on prior questions, not novel analysis.", "seventy percent are variations"],
        ],
      },
      {
        heading: "Desired state",
        bullets: [
          ["Ops managers self-serving the 70% of repeat-shape questions, freeing the data team for novel work.", "the self-serve case is strong"],
          ["Insights surfaced inside Salesforce where account managers already work, not in a separate tool.", "my team won't look at them"],
        ],
      },
      {
        heading: "Blockers",
        bullets: [
          ["Two-way Salesforce sync is a hard requirement — field-level writeback of a risk score and last-touch summary.", "Field-level is what we need"],
          ["Lock-in and data export are Mei's stated concern after a bad experience two years ago.", "My objection is lock-in"],
          ["Change fatigue after a failed BI rollout last year that failed on adoption, not technology.", "the failure was adoption rather than technology"],
        ],
      },
      {
        heading: "Success criteria",
        bullets: [
          ["Mei will test data export herself during a trial rather than take assurances.", "I will absolutely test that"],
          ["Rollout must start with one team and one question they already care about — depot managers named.", "Start with the depot managers"],
          ["No training required for the first query, or the product is wrong.", "if they need training for the first query"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Leah to come back with a firm Salesforce two-way answer, not a roadmap answer.", "a firm answer rather than a roadmap answer"],
          ["Scope a trial around the depot managers.", "Start with the depot managers"],
        ],
      },
    ],
    sales: [
      {
        heading: "Company context",
        bullets: [
          ["Freight operator; Snowflake + Fivetran + dbt, three-person data team, ~40 ad-hoc requests/week.", "we're three people"],
        ],
      },
      {
        heading: "Pain and priorities",
        bullets: [
          ["Two-day turnaround on ops questions purely from queueing.", "takes two days to answer"],
          ["Account managers live in Salesforce and will ignore anything outside it.", "my team won't look at them"],
        ],
      },
      {
        heading: "Objections raised",
        bullets: [
          ["Lock-in / export difficulty, from a prior bad vendor experience.", "My objection is lock-in"],
          ["Change fatigue from a failed BI rollout.", "My people are tired of new tools"],
        ],
      },
      {
        heading: "Buying signals",
        bullets: [
          ["Diego offered to build the rollout plan around a December delivery date.", "If it's December I can build the rollout around it"],
          ["Mei explicitly praised the engineer overriding the salesperson as a trust signal.", "I appreciate the engineer pumping the brakes"],
          ["Diego named the specific first team for rollout unprompted.", "Start with the depot managers"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["RISK: Salesforce two-way was committed to December in the room without engineering sign-off.", "I'd expect that in December"],
          ["Firm answer owed on two-way scope.", "a firm answer rather than a roadmap answer"],
        ],
      },
    ],
  },
  actionItems: [
    { text: "Get a firm engineering answer on field-level Salesforce two-way sync scope and date", assignee: "p-leah", anchor: "a firm answer rather than a roadmap answer", dueHint: "Next week" },
    { text: "Confirm whether field-level writeback is materially cheaper than object-level before committing", assignee: "p-abubakar", anchor: "confirm rather than agree in the room" },
    { text: "Scope a depot-manager trial with one real question and no training", assignee: "p-leah", anchor: "Start with the depot managers" },
    { text: "Prepare an export/portability walkthrough for Mei to test during trial", assignee: "p-abubakar", anchor: "tested that during a trial" },
  ],
  highlights: [
    { category: "risk", title: "December committed for Salesforce two-way, without engineering", from: "I'd expect that in December", seconds: 30, note: "This is the promise that shows up in the Q4 roadmap call as a problem.", by: "p-abubakar" },
    { category: "objection", title: "Lock-in — burned by a previous vendor on export", from: "My objection is lock-in", seconds: 26, by: "p-leah" },
    { category: "objection", title: "Change fatigue after a failed BI rollout", from: "the failure was adoption rather than technology", seconds: 28, by: "p-leah" },
    { category: "quote", title: "70% of requests are variations, not novel analysis", from: "seventy percent are variations", seconds: 20, note: "This is the self-serve case in one number.", by: "p-abubakar" },
  ],
};
