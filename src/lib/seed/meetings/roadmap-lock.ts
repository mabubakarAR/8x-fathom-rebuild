import type { MeetingSpec } from "../build";
import {
  SCENE_BRIGHTWATER_READOUT,
  SCENE_EVAL_METHOD,
  SCENE_NETSUITE_POSTMORTEM,
  SCENE_PRICING_TANGENT,
  SCENE_RELITIGATION,
} from "./roadmap-lock-scenes";

// ---------------------------------------------------------------------------
// THE HARD CASE — 8 people, ~60 minutes, internal planning.
//
// The brief calls this "the case that actually matters" and it is: every
// review complaint about Fathom clusters here. Crosstalk, speaker confusion,
// accents, jargon, and an hour of transcript with no way in.
//
// So this call is written to be genuinely hostile to a notetaker:
//   - eight speakers, two of whom interrupt constantly
//   - a stretch around 38-42 min where four people talk over each other
//   - product jargon the ASR should plausibly fumble (Dataflow, HNSW, p99,
//     "Kestrel", "Brightwater") — those lines carry shaky:true
//   - one participant who joins late and one who never speaks
//   - a decision that gets made, unmade, and remade
//
// If the UI survives this, it survives anything.
// ---------------------------------------------------------------------------

const P = {
  abu: "p-abubakar",
  priya: "p-priya",
  marcus: "p-marcus",
  dani: "p-dani",
  tom: "p-tom",
  ayesha: "p-ayesha",
  jonas: "p-jonas",
  rachel: "p-rachel",
};

export const ROADMAP_LOCK: MeetingSpec = {
  id: "m-roadmap-lock",
  title: "Q4 Roadmap Lock — Platform & Ingest",
  kind: "planning",
  platform: "zoom",
  startedAt: "2026-09-17T14:00:00.000Z",
  recordedById: P.abu,
  gist: "Eight-way roadmap argument. Connector backlog and search relevance both wanted Q4; search won, connectors got two engineers and a hard cap. Brightwater renewal named as the forcing function.",
  silent: ["p-sam"],
  scenes: [
    // ===================================================================
    {
      title: "Agenda and where we actually are",
      gist: "Priya frames the session: everything cannot ship, so the meeting exists to cut. Rachel sets the renewal deadline as the constraint.",
      lines: [
        [P.priya, "Alright, I think we've got everyone except Jonas, he said he'd be five minutes late. Let's start, we've got an hour and we are not going to get through this in an hour if we're precious about it."],
        [P.marcus, "Optimistic."],
        [P.priya, "I'm managing expectations. So — the purpose of this call. We have eleven things on the Q4 list. Engineering capacity says we can do about five of them properly, or all eleven badly. I would like to leave this call with five. Not six, not a five-plus-a-stretch-goal. Five."],
        [P.rachel, "And I want to add one constraint before we start, because it'll save us arguing in circles. Brightwater renew on the fourteenth of January. Whatever we pick has to be something I can describe to Owen and Helen in a way that makes renewing feel obvious. That's not me saying build whatever Brightwater asked for. It's me saying if we ship five things and none of them touch the reason they're unhappy, I have a hard conversation in January.", { shaky: true }],
        [P.priya, "That's fair, and I'd rather have that constraint stated out loud than have it leak into every decision implicitly."],
        [P.tom, "Can I ask a clarifying thing? When you say five things — are we counting the connector backlog as one thing or as eleven things?"],
        [P.priya, "One thing. And I know that's not fair to you."],
        [P.tom, "It's wildly not fair to me but I appreciate the honesty."],
        [P.marcus, "It's also not fair to call the search rewrite one thing, for the record."],
        [P.priya, "Everyone's going to feel their thing is under-counted. That's the nature of it. Let's just get through the round-robin and then we'll argue.", { noBc: true }],
        [P.ayesha, "Are we doing this in the order on the doc?"],
        [P.priya, "Order on the doc. Tom, ingest, you're up. Eight minutes, and I'm going to be rude about the clock today."],
        [P.dani, "She's going to be rude about the clock, everyone mark it."],
        [P.rachel, "Genuinely, please be rude about the clock. Last time we spent forty minutes on the first item and then rubber-stamped everything else in ten.", { gap: 0.6 }],
        [P.priya, "That is exactly what happened and it's why I'm doing it this way. Tom, go."],
      ],
    },

    SCENE_BRIGHTWATER_READOUT,

    // ===================================================================
    {
      title: "Ingest: the connector backlog",
      gist: "Tom lays out 23 outstanding connector requests against 1.5 engineers. Argues the backlog is a sales problem, not an engineering one. Rachel pushes back on the framing.",
      lines: [
        [P.tom, "Okay. Connectors. We have twenty-three outstanding requests in the queue. Nine of those are from named accounts, meaning someone in sales has promised a date or strongly implied one. Four are from Brightwater specifically.", { gap: 3.2 }],
        [P.rachel, "Four?"],
        [P.tom, "Four. Workday, their internal claims system, a Snowflake share, and one that I genuinely cannot get a straight answer on, it's some kind of homegrown scheduling thing that Owen keeps calling Dataflow but which as far as I can tell is not the Google product and not the Apache project, it's just a thing they built and named Dataflow.", { shaky: true }],
        [P.marcus, "That's an incredible naming decision."],
        [P.tom, "It's a choice they made and now it's my problem. Anyway. Twenty-three requests. My team is Ana, me at maybe forty percent, and Dev who is still ramping and honestly won't be independently productive until November."],
        [P.priya, "So call it one and a half engineers."],
        [P.tom, "One and a half, generously. A connector, done properly — auth, incremental sync, schema drift handling, backfill, error surfacing — is three to four weeks. Done badly it's four days and then it's four days a month forever, which is where a lot of the existing ones are."],
        [P.ayesha, "Is that where the on-call load is coming from? Because the Ingest pages have gotten noticeably worse."],
        [P.tom, "That's exactly where the on-call load is coming from. Six of the twelve connectors we shipped last year were shipped in the four-day mode because someone had promised a date. Those six generate about eighty percent of our ingest pages."],
        [P.rachel, "Eighty percent from six connectors."],
        [P.tom, "Roughly. I can get you the exact number, I'd rather not quote from memory, but it's in that region and it's not close.", { noBc: true }],
        [P.abu, "I can confirm the shape of that from the on-call side. Last rotation I had eleven pages and nine were connector sync failures. Two of them were the same connector twice in one night."],
        [P.tom, "Which one?"],
        [P.abu, "The Netsuite one."],
        [P.tom, "Of course it was the Netsuite one.", { over: true }],
        [P.marcus, "It's always Netsuite.", { over: true }],
        [P.tom, "So here's my actual ask, and it's not the one you're expecting. I don't want to build more connectors this quarter. I want to stop building connectors and fix the six that are on fire, and I want us to say no to new connector requests until that's done."],
        [P.priya, "That's a real position. Say more about why not both."],
        [P.tom, "Because both is what we did last quarter and last quarter we shipped two connectors, neither of them well, and the fire got worse. If I'm given one and a half engineers and told to do both, the maintenance work is the thing that gets dropped, every single time, because the new connector has a name attached to it and a date, and the maintenance work has neither."],
        [P.rachel, "I want to push on this, not because I disagree with the diagnosis but because I think the framing is wrong. You're describing this as an engineering capacity problem. I think it's a sales commitment problem. If we stop the bleeding on the six but nothing changes about how commitments get made, we're back here in April with a different six."],
        [P.tom, "I don't disagree with that at all."],
        [P.rachel, "So the ask isn't only 'give me a quarter to fix things', it's 'change the rule about who can promise a connector'."],
        [P.priya, "And that rule change is free. That costs us nothing in engineering time. Can we just — is there a reason we haven't done that?"],
        [P.rachel, "The reason is that Leah closed a two hundred thousand dollar deal in May by promising a Workday connector in six weeks, and it worked."],
        [P.marcus, "Did we ship it in six weeks?"],
        [P.rachel, "We shipped it in fourteen and they're still with us. So the lesson sales learned is that the promise works and the slip is survivable. Which, from where they sit, is a correct read.", { shaky: true }],
        [P.tom, "It's a correct read and it's killing us."],
        [P.rachel, "Both things are true. That's why it's hard."],
        [P.priya, "Okay, I want to time-box this because it's a genuinely good conversation that is not the conversation we're in. Tom, can I characterise your ask as: connectors are on the Q4 list, but as a stabilisation project, not a build project, and separately Rachel and I take an action to change the commitment rule?"],
        [P.tom, "Yes. That's exactly it."],
        [P.rachel, "I'll own the rule change. I'd rather it come from me than from product, because it's going to land as a no to the sales team and it should come from someone who can also say why."],
        [P.priya, "Good. Next. Ayesha, search."],
        [P.jonas, "Sorry — sorry, I just joined, has support come up yet?", { gap: 1.2 }],
        [P.priya, "Not yet Jonas, you're after Ayesha. Welcome."],
        [P.jonas, "Great, sorry everyone."],
      ],
    },

    SCENE_NETSUITE_POSTMORTEM,

    // ===================================================================
    {
      title: "Search relevance rewrite — the contentious one",
      gist: "Ayesha proposes replacing lexical ranking with a hybrid retriever. Marcus objects on latency grounds and the two do not fully resolve it. Abubakar proposes the shadow-index compromise.",
      lines: [
        [P.ayesha, "So search. I want to be direct about the size of this because I don't think it's been understood as a big thing, and it is a big thing.", { gap: 4.1 }],
        [P.priya, "Please be direct about the size of it."],
        [P.ayesha, "Right now our relevance is pure lexical. Postgres full text, some hand-tuned weights on title versus body, a recency boost that Marcus added in, I think, February?"],
        [P.marcus, "March. And it was a hack and I said it was a hack at the time."],
        [P.ayesha, "It was a hack and it's now load-bearing, which is the standard lifecycle of a hack. The problem is that our customers don't search the way lexical search wants them to. I pulled six weeks of query logs. Forty-one percent of queries return zero results. Of those, a bit over half return zero because of vocabulary mismatch — the user searched for 'churn risk' and the document says 'cancellation likelihood'.", { shaky: true }],
        [P.rachel, "Forty-one percent zero results?"],
        [P.ayesha, "Forty-one. And I want to be careful, that's all queries including obvious typos and people searching for things that genuinely aren't there. But the vocabulary mismatch bucket alone is about twenty-two percent of total queries, and that's just us failing."],
        [P.priya, "That's a really bad number."],
        [P.ayesha, "It's a really bad number. And it's the number underneath basically every 'search doesn't work' complaint we get, which Jonas can probably speak to."],
        [P.jonas, "It's my second-biggest ticket category, yeah."],
        [P.ayesha, "So the proposal is a hybrid retriever. Keep the lexical index, add a dense vector index, blend the scores with a tunable alpha, and put a reranker over the top of the merged set. That's the standard architecture, there's nothing clever about it, the cleverness is all in the evaluation."],
        [P.marcus, "Can I come in here?"],
        [P.priya, "Go."],
        [P.marcus, "I'm not against the diagnosis. Twenty-two percent vocabulary miss is real and it's embarrassing. I'm against the proposal on latency, and I want to be concrete rather than hand-wavy about it. Our p99 on search right now is one hundred and eighty milliseconds. That's good. That's a number I'm proud of. A dense retrieval hop plus a cross-encoder rerank is, conservatively, another two hundred to four hundred milliseconds unless we're very careful.", { shaky: true }],
        [P.ayesha, "It's not four hundred if the reranker is distilled and we cap the candidate set."],
        [P.marcus, "It's not four hundred if everything goes right. It's four hundred on the day the index is cold, or the day someone searches something that blows out the candidate set, and that day always comes."],
        [P.ayesha, "So we cap it. Hard timeout, fall back to lexical."],
        [P.marcus, "Then on the bad day your twenty-two percent problem comes straight back and now it's intermittent, which is worse than consistent, because the user can't form a model of when search works.", { over: true }],
        [P.ayesha, "That's — okay, that's actually a good point.", { over: true }],
        [P.priya, "Say that again Marcus, I want to make sure I've got it. Intermittent is worse than consistently bad because—"],
        [P.marcus, "Because people route around a thing they know is broken. They can't route around a thing that works four days out of five. They just lose trust in the whole product."],
        [P.rachel, "That's the Brightwater complaint almost word for word, incidentally. Helen's line to me was 'I don't know when to trust it', not 'it doesn't work'."],
        [P.ayesha, "Okay. So I hear the objection and I think it's right, and I don't think it's fatal. Can I offer a different shape?"],
        [P.priya, "Please."],
        [P.ayesha, "We build the dense index as a shadow. It runs on every query, we log what it would have returned, we never show it to a user. We run that for four weeks. At the end of four weeks I can tell you, with actual numbers rather than my opinion, what it does to the zero-result rate and what the real latency distribution is under production load. Then we decide whether to turn it on."],
        [P.abu, "I was going to suggest almost exactly that. And I'd add — we can make the shadow comparison the artefact. Rather than a decision meeting in four weeks where we argue about it again, we agree the threshold now. Something like: if it cuts zero-results by more than fifteen points and p99 stays under three hundred, it ships. If it doesn't, we kill it and we don't relitigate."],
        [P.marcus, "I would sign up for that. Genuinely. My objection is to shipping it on faith, not to building it."],
        [P.ayesha, "And my objection is to not building it because someone's worried about a latency number we haven't measured. So — yes. Shadow index, agreed thresholds, decide on data."],
        [P.priya, "This is the most productive disagreement we've had in one of these in a while. Let me write the threshold down. Zero-result rate down fifteen points absolute, p99 under three hundred milliseconds. Both conditions. Agreed?"],
        [P.marcus, "Agreed."],
        [P.ayesha, "Agreed."],
        [P.rachel, "Can I ask what happens if it hits one and not the other?"],
        [P.ayesha, "Then it's a judgement call and we have the argument, but we have it with data."],
        [P.rachel, "Fine. I just don't want 'we agreed a threshold' to quietly become 'we agreed to ship it'."],
        [P.priya, "Noted and I'll write it in a way that doesn't allow that."],
      ],
    },

    SCENE_EVAL_METHOD,

    // ===================================================================
    {
      title: "Support load and the three things that actually generate tickets",
      gist: "Jonas ranks ticket drivers. Onboarding confusion is number one and is a design problem, not a bug. He argues for the unglamorous fix.",
      lines: [
        [P.jonas, "So I pulled the last ninety days of tickets and bucketed them, and I want to say up front that the result annoyed me, because I came in expecting it to say something else.", { gap: 3.6 }],
        [P.priya, "Good sign."],
        [P.jonas, "Number one category, by a distance, is not a bug. It's people who cannot work out how to connect a second data source. Twenty-eight percent of all tickets. And it's not that it's broken — it works — it's that the button is in a place nobody looks and the empty state doesn't tell you it exists."],
        [P.dani, "Oh that's — yeah. That's the settings-page problem."],
        [P.jonas, "It is exactly the settings-page problem. People find the first connection because onboarding walks them into it. Then they want a second one and there's no path. They go to the dashboard, there's nothing. They go to the source list, there's nothing obvious. Eventually they email us and we send them a link to a settings page three levels deep and they say 'oh'."],
        [P.rachel, "How long has that been true?"],
        [P.jonas, "As long as I've been here."],
        [P.marcus, "That's fourteen months."],
        [P.jonas, "That's fourteen months. Number two is search, which Ayesha just covered, about nineteen percent. Number three is sync failures where the customer can see something is wrong but can't see what, which is Tom's error surfacing point. Eleven percent."],
        [P.tom, "And that eleven percent is entirely avoidable, by the way. The error is in our logs with a perfectly clear message. We just never put it on a screen."],
        [P.jonas, "Right. So my honest read — and I know this isn't a roadmap item in the way the other things are — is that a week of unglamorous work on empty states and error surfacing would take about forty percent off my ticket volume. And I keep not asking for it because it feels small next to a search rewrite."],
        [P.priya, "That's the most useful thing anyone's said today and I want to name why. It's the only item so far with a measured cost of not doing it.", { noBc: true }],
        [P.dani, "Can I add something to that? Because I think it's actually bigger than Jonas is pitching it."],
        [P.priya, "Go."],
        [P.dani, "The second-source problem isn't a missing button. It's that the whole information architecture assumes one source. The dashboard, the source list, the nav — they're all built as if you have one connection. So you can add a button and it'll help, and people will still get lost at the next step because there's no notion of 'switch between' or 'compare across'."],
        [P.jonas, "That's fair and that's above my pay grade to diagnose."],
        [P.dani, "It's not above your pay grade, you found it, you just described it as a button. Which brings me neatly to my bit."],
        [P.priya, "It does. Hold that thought for ninety seconds. Jonas, anything else?"],
        [P.jonas, "One thing. Ticket response time has gone from four hours to eleven over the quarter and that's because volume is up and headcount isn't. I'm not asking for headcount in this meeting. I'm flagging that if we ship nothing that reduces volume, eleven becomes twenty by March and then it's a churn problem rather than a support problem."],
        [P.rachel, "Understood. That one lands."],
      ],
    },

    SCENE_PRICING_TANGENT,

    // ===================================================================
    {
      title: "Design: the information architecture problem",
      gist: "Dani argues the nav is the root cause behind several separate complaints. Heaviest crosstalk section — four people in at once on scope.",
      lines: [
        [P.dani, "So I've got a deck but I'm not going to present the deck because Priya will be rude about the clock. The short version is: I think three of the things on our list are the same thing.", { gap: 5.4 }],
        [P.priya, "Which three?"],
        [P.dani, "Jonas's second-source problem, the 'I can't find my saved views' complaint that's been in the backlog since June, and the thing Brightwater said about not knowing where to look. All three are the navigation. We have a nav that was designed when the product did one thing and it now does four, and every new thing has been bolted into a top-level slot because that was the cheap place to put it."],
        [P.marcus, "How many top-level items are there now?"],
        [P.dani, "Nine."],
        [P.marcus, "Nine."],
        [P.dani, "Nine, and two of them are called Settings.", { over: true }],
        [P.rachel, "Two are called Settings?", { over: true }],
        [P.abu, "Settings and Workspace Settings.", { over: true }],
        [P.dani, "Settings and Workspace Settings, and neither name tells you which one has the thing you want, so people check both, every time."],
        [P.rachel, "That's genuinely embarrassing."],
        [P.dani, "It is, and it's the kind of embarrassing that compounds, because every time we add a feature the honest place to put it is 'somewhere in one of the two settings pages' and so the problem grows by itself."],
        [P.priya, "What's the shape of the fix?"],
        [P.dani, "Collapse nine to five. Sources, Search, Views, Reports, Settings — one Settings. Move the second-source action into Sources as a primary affordance rather than a deep link. Rebuild the empty states so each one names the next action."],
        [P.tom, "How long?"],
        [P.dani, "Design is two weeks and it's mostly done, I've been doing it on the side out of irritation. Build is the question and I genuinely don't know, which is why I want Marcus to tell me."],
        [P.marcus, "Depends entirely on whether the nav is a component or a spread."],
        [P.abu, "It's a spread. There's route logic in about eleven places.", { over: true }],
        [P.marcus, "Then it's four weeks, not two.", { over: true }],
        [P.dani, "Four weeks of one person or four weeks of the team?", { over: true }],
        [P.marcus, "One person, four weeks, and they will be miserable.", { over: true }],
        [P.priya, "Hold on, everyone, one at a time, I've lost the thread and so has the recording. Marcus first."],
        [P.marcus, "Four weeks, one engineer, assuming we don't also redesign the pages themselves. Nav and routing only. If we start moving what's on the pages it's a quarter."],
        [P.dani, "I'm not proposing we move what's on the pages. I want to be really clear about that because I think that's where this gets killed. Same pages, same content, fewer doors."],
        [P.priya, "Say that again — 'same pages, same content, fewer doors'. That's the scope line. Anything that moves content is out."],
        [P.dani, "Same pages, same content, fewer doors. Yes."],
        [P.rachel, "I like this more than I expected to. My worry is it's invisible. I can't sell 'we reorganised the menu' to Brightwater in January."],
        [P.dani, "You can sell 'you told us you couldn't find things and now you can', which is what they actually said."],
        [P.rachel, "Mm. Maybe."],
        [P.jonas, "For what it's worth I can measure it. If the second-source ticket category drops, that's the proof. And I'd expect to see it within two weeks of ship."],
        [P.rachel, "That helps. If it's measurable I'm much more comfortable."],
        [P.ayesha, "Can I note a dependency? If the nav changes, my search results page moves, and I'd rather that happened before I start the relevance work than during."],
        [P.dani, "Agreed, and that's an argument for doing nav early in the quarter rather than late."],
        [P.marcus, "It's also an argument for the same person doing both, which we don't have.", { shaky: true }],
        [P.priya, "Let's not solve staffing in the room. Flag the dependency, I'll sequence it."],
      ],
    },

    SCENE_RELITIGATION,

    // ===================================================================
    {
      title: "The cut",
      gist: "Rachel forces the list to five. Mobile and the reporting rebuild are cut. Connectors survive only as a capped stabilisation effort.",
      lines: [
        [P.priya, "Twelve minutes left. We have four candidates that everyone seems to want: connector stabilisation, search relevance, the nav collapse, and Jonas's error surfacing. That's four. We said five. And there are seven other things on the list that nobody has defended, which tells me something.", { gap: 2.8 }],
        [P.rachel, "It tells you they should come off the list permanently, not just for Q4."],
        [P.priya, "Probably. Let me name them so it's on the record. Mobile app. Reporting rebuild. SSO. The public API v2. Audit log export. In-app chat support. The Salesforce two-way sync."],
        [P.rachel, "SSO is going to come back and bite us but not this quarter."],
        [P.tom, "Salesforce two-way has a name attached, Leah promised it to Kestrel.", { shaky: true }],
        [P.rachel, "Of course she did."],
        [P.tom, "I'm just reporting the news."],
        [P.rachel, "No, and that's — that's exactly the pattern we talked about at the top. Okay. I'll handle Kestrel. What did she promise, a date?"],
        [P.tom, "December, I think. Diego mentioned it on the call last week like it was settled."],
        [P.rachel, "Then it's already a problem and it's better I find out now. I'll take that."],
        [P.priya, "So what's the fifth? Or do we ship four things well?"],
        [P.marcus, "I'd genuinely rather ship four things well. I think five is a number you picked because it sounded right."],
        [P.priya, "It is entirely a number I picked because it sounded right."],
        [P.marcus, "Then four."],
        [P.dani, "Four, and use the slack for the thing that inevitably goes wrong. Something always goes wrong and we never budget for it, and then the budget comes out of whatever's last on the list."],
        [P.ayesha, "Which is always the measurement work, incidentally. The evaluation harness got cut three quarters running."],
        [P.priya, "That's a genuinely good catch and I'm going to make it the fifth item. Not as a feature. As protected time. Ayesha, how much do you need to build an eval harness you'd actually trust?"],
        [P.ayesha, "A week. Maybe a week and a half. And it makes the shadow index experiment real rather than vibes, so it's a dependency anyway."],
        [P.priya, "Then it's item five and it's first, not last."],
        [P.rachel, "I want to be the annoying person for a second. Connector stabilisation — what does done look like? Because 'fix the six that are on fire' is not a shippable definition and in six weeks we'll be arguing about whether it's finished."],
        [P.tom, "Fair. Done is: ingest pages per week drops below three, sustained over two weeks. Right now we're at about fourteen."],
        [P.rachel, "Fourteen to three."],
        [P.tom, "Fourteen to three. And if I get to eight I'll tell you I got to eight rather than claiming victory, but three is the target and I think it's achievable if nothing new lands on me."],
        [P.priya, "And 'nothing new lands on me' is contingent on Rachel's commitment rule."],
        [P.tom, "It's entirely contingent on that. If that rule doesn't change, none of this happens, and I'd rather say that now than in November."],
        [P.rachel, "Understood. And I'll say it plainly so it's in the recording — if I fail to change that rule, Tom's target is void and that's on me, not on him."],
        [P.priya, "Good. That's the list. Let me read it back."],
      ],
    },

    // ===================================================================
    {
      title: "Decisions, owners, and what happens next",
      gist: "Priya reads the five items back with owners and dates. Rachel closes on the renewal framing.",
      lines: [
        [P.priya, "Five items. One: evaluation harness, Ayesha, first two weeks of October, because everything else measures itself against it. Two: nav collapse, nine to five, design done by Dani, build owned by Marcus's team, scope line is same pages, same content, fewer doors. Three: search relevance as a shadow index only, Ayesha, ship decision gated on zero-results down fifteen points and p99 under three hundred. Four: connector stabilisation, Tom, target is ingest pages from fourteen a week to under three, sustained two weeks. Five: error surfacing and empty states, and I want that to be Jonas and Dani together rather than thrown over a wall to engineering.", { gap: 3.9 }],
        [P.jonas, "Happy with that."],
        [P.dani, "Same."],
        [P.priya, "Off the list permanently, pending someone making a case: mobile, reporting rebuild, SSO, API v2, audit export, in-app chat, Salesforce two-way. Rachel is handling the Kestrel conversation about that last one."],
        [P.rachel, "I'll have that conversation this week. And the commitment rule — I'll have something written by Friday and I'll socialise it with the sales team on Monday rather than just announcing it."],
        [P.abu, "Do you want me to write up the shadow index threshold as an actual doc? I think if it lives only in this recording it'll get remembered differently by different people."],
        [P.ayesha, "Please do, and put the query log numbers in it so we're not re-deriving them."],
        [P.abu, "I'll have it by Wednesday."],
        [P.marcus, "One more thing — who's the one engineer on nav? Because I've got two people and both are on the reliability work."],
        [P.priya, "Let's take that offline, you and me, today. I don't want to allocate a person in a room of eight."],
        [P.marcus, "Agreed, just didn't want it to fall off."],
        [P.rachel, "Last word from me. I think this is the first roadmap meeting in a while where we cut things instead of reordering them, and I want to say that's the good outcome, not a failure to fit everything in. Four real things and protected measurement time beats eleven half-things. In January when I sit down with Helen and Owen I'd much rather say 'here are three things you asked for and we did them properly' than list eleven things in progress."],
        [P.priya, "Thanks everyone. Notes will go out this afternoon, and if you disagree with how I've written something down, tell me before Friday, not in December."],
      ],
    },
  ],

  // =======================================================================
  summaries: {
    general: [
      {
        heading: "Overview",
        bullets: [
          ["Eleven Q4 candidates were cut to five, with the explicit goal of shipping fewer things properly rather than everything partially.", "eleven things on the Q4 list"],
          ["The Brightwater renewal on 14 January was set as the framing constraint for the whole quarter.", "Brightwater renew on the fourteenth"],
          ["The team cut items permanently rather than reordering them, which Rachel named as the meeting's real outcome.", "we cut things instead of reordering"],
        ],
      },
      {
        heading: "Key points",
        bullets: [
          ["41% of search queries return zero results; roughly 22% of all queries fail purely on vocabulary mismatch.", "Forty-one percent of queries return zero"],
          ["Six connectors shipped under time pressure now generate about 80% of ingest pages.", "eighty percent of our ingest pages"],
          ["28% of support tickets are users unable to find how to connect a second data source — a navigation problem, not a bug.", "cannot work out how to connect a second"],
          ["The product has nine top-level nav items, two of which are called Settings.", "two of them are called Settings"],
          ["Support response time has gone from 4 hours to 11 over the quarter on flat headcount.", "four hours to eleven"],
        ],
      },
      {
        heading: "Decisions",
        bullets: [
          ["Search relevance ships as a shadow index only. Gate to turn it on: zero-result rate down 15 points absolute AND p99 under 300ms. Both conditions required.", "Zero-result rate down fifteen points"],
          ["Nav collapses from nine top-level items to five. Hard scope line: same pages, same content, fewer doors.", "same pages, same content, fewer doors. Yes"],
          ["Connector work is stabilisation, not new builds. Definition of done: ingest pages from ~14/week to under 3, sustained two weeks.", "Fourteen to three. And if I get to eight"],
          ["The evaluation harness is item five and runs first, on the grounds that it has been cut three quarters running.", "it's item five and it's first"],
          ["Permanently off the list: mobile, reporting rebuild, SSO, API v2, audit log export, in-app chat, Salesforce two-way sync.", "Mobile app. Reporting rebuild. SSO"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Rachel to draft the sales commitment rule by Friday and socialise it with the sales team Monday.", "something written by Friday"],
          ["Rachel to handle the Kestrel conversation about the Salesforce two-way sync that was promised for December.", "I'll handle Kestrel"],
          ["Abubakar to document the shadow index thresholds with the query log numbers, by Wednesday.", "I'll have it by Wednesday"],
          ["Priya and Marcus to resolve nav staffing offline today.", "take that offline, you and me, today"],
        ],
      },
    ],
    "project-update": [
      {
        heading: "Status by workstream",
        bullets: [
          ["Ingest: 23 outstanding connector requests against roughly 1.5 engineers. Team is Ana, Tom at 40%, and Dev who will not be independently productive until November.", "Ana, me at maybe forty percent"],
          ["Search: relevance is pure lexical with a recency boost added in March that was acknowledged as a hack at the time.", "it was a hack and I said it was a hack"],
          ["Support: 11-hour response time, up from 4, driven by volume against flat headcount.", "four hours to eleven"],
          ["Design: nav redesign is roughly two weeks of design work, already largely done off the side of the desk.", "Design is two weeks and it's mostly done"],
        ],
      },
      {
        heading: "What changed",
        bullets: [
          ["Connector strategy inverted — from shipping new connectors to a stabilisation freeze.", "I don't want to build more connectors"],
          ["Search rewrite reframed from a build to a measured experiment with pre-agreed ship criteria.", "We build the dense index as a shadow"],
          ["Measurement work promoted from perpetually-cut to first item in the quarter.", "it's item five and it's first"],
        ],
      },
      {
        heading: "Slipping",
        bullets: [
          ["Salesforce two-way sync was promised to Kestrel for December and is not on the Q4 list.", "Leah promised it to Kestrel"],
          ["Second-source discoverability has been a known problem for at least 14 months.", "That's fourteen months"],
          ["Nav build estimate went from 2 weeks to 4 once route logic spread across 11 places was accounted for.", "Then it's four weeks, not two"],
        ],
      },
      {
        heading: "Decisions",
        bullets: [
          ["Four real items plus protected measurement time, rather than five features.", "I'd genuinely rather ship four things well"],
          ["Shadow index ship gate: −15pp zero results and p99 < 300ms, both required.", "Zero-result rate down fifteen points"],
          ["Ingest done-condition: <3 pages/week sustained over two weeks, contingent on the commitment rule changing.", "It's entirely contingent on that"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Commitment rule drafted Friday, socialised Monday — Rachel.", "something written by Friday"],
          ["Shadow index threshold doc — Abubakar, Wednesday.", "I'll have it by Wednesday"],
          ["Nav staffing resolved offline — Priya and Marcus.", "take that offline, you and me, today"],
        ],
      },
    ],
    retro: [
      {
        heading: "Went well",
        bullets: [
          ["The search disagreement resolved into an experiment with pre-agreed thresholds rather than a stalemate.", "most productive disagreement we've had"],
          ["Support brought measured cost-of-inaction rather than anecdote, which is what made the unglamorous work fundable.", "the only item so far with a measured cost"],
          ["Items were cut permanently instead of being reordered into the next quarter.", "we cut things instead of reordering"],
        ],
      },
      {
        heading: "Did not go well",
        bullets: [
          ["A known 14-month navigation problem went unaddressed because it never looked big enough next to feature work.", "That's fourteen months"],
          ["Sales commitments have been setting engineering priority without a rule, and everyone knew it.", "it's a sales commitment problem"],
          ["The evaluation harness has been cut three quarters running.", "cut three quarters running"],
        ],
      },
      {
        heading: "Start doing",
        bullets: [
          ["Attach a measurable done-condition to every roadmap item before it is accepted.", "what does done look like"],
          ["Budget explicitly for the thing that goes wrong, instead of taking it from the last item on the list.", "use the slack for the thing that inevitably"],
          ["Agree ship thresholds before building, so the decision meeting is about data rather than opinion.", "we agree the threshold now"],
        ],
      },
      {
        heading: "Stop doing",
        bullets: [
          ["Stop letting connector commitments be made outside engineering with a date attached.", "change the rule about who can promise"],
          ["Stop shipping connectors in the four-day mode that generates permanent maintenance load.", "four days and then it's four days a month"],
        ],
      },
      {
        heading: "Next steps",
        bullets: [
          ["Rachel owns the commitment rule and explicitly owns the failure case if it does not change.", "that's on me, not on him"],
        ],
      },
    ],
  },

  actionItems: [
    { text: "Draft the sales connector-commitment rule and socialise it with the sales team", assignee: "p-rachel", anchor: "something written by Friday", dueHint: "Fri 25 Sep" },
    { text: "Handle the Kestrel conversation about the Salesforce two-way sync promised for December", assignee: "p-rachel", anchor: "I'll handle Kestrel", dueHint: "This week" },
    { text: "Write up the shadow index thresholds including the query log numbers", assignee: "p-abubakar", anchor: "I'll have it by Wednesday", dueHint: "Wed 23 Sep" },
    { text: "Resolve nav build staffing offline", assignee: "p-priya", anchor: "take that offline, you and me, today", done: true },
    { text: "Get the exact page-share number for the six unstable connectors rather than quoting from memory", assignee: "p-tom", anchor: "I'd rather not quote from memory" },
    { text: "Build the evaluation harness — first two weeks of October, ahead of everything else", assignee: "p-ayesha", anchor: "A week. Maybe a week and a half", dueHint: "Mid Oct" },
    { text: "Finish nav design at nine-to-five scope and hand to Marcus's team", assignee: "p-dani", anchor: "Design is two weeks and it's mostly done" },
    { text: "Pair with Dani on error surfacing and empty states rather than handing off to engineering", assignee: "p-jonas", anchor: "Jonas and Dani together" },
    { text: "Send roadmap notes out this afternoon; objections due before Friday", assignee: "p-priya", anchor: "Notes will go out this afternoon" },
    { text: "Check whether the Netsuite connector needs its own stabilisation slot — it paged twice in one night", assignee: "p-tom", anchor: "the same connector twice in one night", userGenerated: true },
  ],

  highlights: [
    { category: "decision", title: "Shadow index ship gate agreed", from: "Zero-result rate down fifteen points", seconds: 38, note: "Both conditions required. Rachel explicitly guarded against this softening into 'we agreed to ship it'.", by: "p-abubakar" },
    { category: "risk", title: "80% of ingest pages come from six rushed connectors", from: "eighty percent of our ingest pages", seconds: 30, by: "p-abubakar" },
    { category: "quote", title: "Intermittent is worse than consistently bad", from: "Because people route around a thing", seconds: 26, note: "Marcus's framing. Matches Helen's renewal complaint almost word for word.", by: "p-priya" },
    { category: "risk", title: "41% of searches return nothing", from: "Forty-one percent of queries return zero", seconds: 34, by: "p-ayesha" },
    { category: "objection", title: "Rachel: this is a sales commitment problem, not a capacity problem", from: "I think the framing is wrong", seconds: 42, by: "p-priya" },
    { category: "decision", title: "Scope line for nav: same pages, same content, fewer doors", from: "same pages, same content, fewer doors. Yes", seconds: 22, by: "p-dani" },
    { category: "idea", title: "Measurement as a protected item, not the thing that gets cut", from: "cut three quarters running", seconds: 40, by: "p-priya" },
    { category: "followup", title: "Kestrel was promised Salesforce two-way for December", from: "Leah promised it to Kestrel", seconds: 28, note: "Not on the Q4 list. Rachel taking the conversation.", by: "p-rachel" },
  ],
};
