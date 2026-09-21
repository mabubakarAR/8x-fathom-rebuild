import type { Scene } from "../build";

// Additional scenes for the hour-long roadmap call, kept in their own file so
// the main spec stays readable.
//
// These are the parts of a long meeting that a 25-minute meeting doesn't have:
// somebody walking through a failure in more detail than anyone needed, a
// tangent that gets shut down, a decision being quietly re-litigated twenty
// minutes after it was made, and the bit near the end where people are tired
// and start agreeing too fast. They matter for the demo because they are
// exactly what makes an hour of transcript hard to navigate — and therefore
// exactly what the chapter rail has to earn its place against.

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

/** Goes after the ingest scene. Tom walks through one failure in painful detail. */
export const SCENE_NETSUITE_POSTMORTEM: Scene = {
  title: "Digression: what a connector failure actually looks like",
  gist: "Tom walks through the Netsuite incident end to end. Longest monologue of the call. Establishes why 'just fix the connectors' is not a small ask.",
  lines: [
    [P.rachel, "Tom, can I ask you to do something that might be boring for everyone else? Walk me through one of these failures properly. I keep approving connector work without really understanding what breaks, and I think that's part of why I keep under-resourcing it."],
    [P.priya, "That's worth the clock. Go, Tom, but watch the time."],
    [P.tom, "Sure. I'll do Netsuite because Abubakar just raised it and it's the canonical one. So Netsuite exposes data through their SuiteQL endpoint, which is SQL-ish but not SQL, and it's rate limited per account rather than per integration, which is the first problem. Meaning if the customer's finance team runs a big report at the same moment our sync fires, we get throttled and they don't, because their internal tooling has priority.", { shaky: true }],
    [P.marcus, "So we're competing with our own customer for their own API budget."],
    [P.tom, "We are competing with our own customer for their own rate limit, yes, and there's no way to ask for more. So the correct design is to back off aggressively, sync incrementally, and never do a full table scan during business hours. What we actually built, in four days, in May, was a full sync on a cron."],
    [P.priya, "Ouch."],
    [P.tom, "It worked fine in testing because the test account had four hundred rows. The first real customer had two point one million. So the sync takes forty minutes, during which it's hammering their rate limit, and at some point it gets a 429, and here's the bit that actually causes the pages — we treat a 429 as a hard failure and abort the whole run. Then the cron fires again an hour later and does the same thing from scratch."],
    [P.abu, "And that's why it pages twice in a night."],
    [P.tom, "That's why it pages twice in a night. Two runs, two aborts, two pages, and no data moved in either case. The customer wakes up to stale data and we wake up to alerts, and neither of us learns anything because the error says 'sync failed' with a stack trace."],
    [P.jonas, "That's the eleven percent I was talking about, by the way. That exact scenario generates tickets because the customer can see the data is old and cannot see why."],
    [P.tom, "Right. So the fix isn't one fix, it's four. Incremental sync keyed on their modified-date field, which they do expose, thankfully. Exponential backoff with jitter on 429s rather than abort. A resumable cursor so a failed run picks up where it stopped instead of restarting. And a status surface so the customer sees 'paused, retrying at 3am' rather than nothing."],
    [P.rachel, "And how long is that, for one connector?"],
    [P.tom, "Two weeks if I'm honest, and about half of that is the resumable cursor, because the current architecture assumes runs are atomic and they're just not."],
    [P.marcus, "Is the cursor work shared across connectors or per connector?"],
    [P.tom, "It should be shared. That's the thing I keep wanting to build and keep not building, because it's a week of work that ships nothing visible. If we had a proper resumable-run primitive in the framework, every connector gets it for free and the per-connector fix drops from two weeks to about four days."],
    [P.priya, "So there's a platform piece underneath the stabilisation work."],
    [P.tom, "There's a platform piece underneath it and I've been sneaking it in in fragments, which is the worst way to build it, because half-built abstractions are worse than none."],
    [P.ayesha, "That's true of basically everything we've half-built.", { noBc: true }],
    [P.rachel, "Okay. That was genuinely useful and I'm glad I asked. My take-away is that when I hear 'fix the connectors' I've been hearing 'patch six things' and what you're describing is 'build one missing primitive and then patch six things', which is a different size of ask and a different kind of ask."],
    [P.tom, "That's exactly right, and I probably haven't communicated it well. I've been asking for the patching because it sounds smaller and more approvable."],
    [P.rachel, "Please stop doing that. Ask for the real thing. I'd rather say no to the real thing than yes to a version of it that doesn't work."],
    [P.tom, "Noted. Genuinely, noted."],
    [P.priya, "I'm going to write the resumable-run primitive down as an explicit part of the connector item rather than a hidden dependency, because otherwise it gets cut in three weeks when someone looks at the item and sees no customer-visible output."],
    [P.marcus, "That's the right call. Hidden dependencies are how the nav work died last time too.", { shaky: true }],
    [P.dani, "It died three times."],
    [P.marcus, "It died three times and it died the same way each time."],
  ],
};

/** Goes after the search scene. Ayesha's methodology, and Marcus half-relitigating. */
export const SCENE_EVAL_METHOD: Scene = {
  title: "How we'd actually know if search got better",
  gist: "Ayesha explains the evaluation approach. Marcus partly re-opens the latency argument. Priya cuts it off and the threshold holds.",
  lines: [
    [P.priya, "Before we move on — Ayesha, one minute on how you'd measure it, because 'we'll look at the numbers' means different things to different people in this room."],
    [P.ayesha, "Yeah, fair, and this is the part I actually care most about. There are three numbers and they're not equally trustworthy. The first is zero-result rate, which is easy and honest — either the query returned nothing or it didn't, no judgement involved. That one I'd bet on."],
    [P.priya, "And the other two?"],
    [P.ayesha, "The second is click-through position, meaning when someone does click a result, how far down was it. That's a decent proxy for relevance and it's free to collect, but it's biased by presentation — people click the first thing. So an improvement there might just mean we reordered, not that we improved."],
    [P.marcus, "Position bias."],
    [P.ayesha, "Position bias, exactly. Which you can correct for, but the correction needs a randomised slice and I don't want to degrade some users' search on purpose to get a cleaner measurement. Not at our size."],
    [P.rachel, "Agreed, please don't."],
    [P.ayesha, "The third one is the honest one and it's expensive. Human relevance judgements. I take three hundred real queries, pull the top five results from both systems, and have people rate each result as relevant or not, blind to which system produced it. That gives you a real number. It costs about two days of somebody's time and it's the only one I'd put in front of a customer."],
    [P.priya, "Who does the rating?"],
    [P.ayesha, "That's the awkward part. It should be people who understand the domain, which means it's us, which means it's two days of engineering time and everyone will hate it."],
    [P.jonas, "My team could do a chunk of it. We read customer data all day, we're probably better judges of what a support-adjacent query should return than engineering is."],
    [P.ayesha, "That's — actually yes. That's a much better answer than mine. Can I take you up on that?"],
    [P.jonas, "Half a day a week for three weeks, I can absorb that."],
    [P.ayesha, "Then that's the plan and it's better than what I came in with."],
    [P.marcus, "Can I go back to latency for thirty seconds? Not to reopen the decision, I want to add a constraint to the shadow run itself."],
    [P.priya, "Thirty seconds."],
    [P.marcus, "If the shadow index runs on every query, it's doing real work on the request path even though we throw the result away. I want that to be genuinely out of band — a queue, a separate worker, not a parallel call inside the request. Otherwise the shadow experiment itself degrades p99 and we'll have proven nothing except that we made search slower."],
    [P.ayesha, "That's a correct objection and I'd already planned for it, but you're right that I hadn't said so out loud."],
    [P.marcus, "Then I'm happy. That was my whole concern."],
    [P.abu, "Should we write that into the threshold doc? 'Shadow runs out of band, no shared request path'?"],
    [P.marcus, "Please."],
    [P.priya, "Good. Moving. Jonas, support, and you've got your eight minutes back because Tom overran and that's on me, not on you."],
  ],
};

/** Goes after support. A tangent that gets killed — meetings have these. */
export const SCENE_PRICING_TANGENT: Scene = {
  title: "Tangent: pricing, and why we're not doing this today",
  gist: "Sam's packaging question surfaces via Rachel and derails briefly. Priya shuts it down and books it separately.",
  lines: [
    [P.rachel, "Can I raise something adjacent that I promised Sam I'd raise, and then we can decide in ten seconds whether it belongs in this meeting?"],
    [P.priya, "Ten seconds of raising it, then I'm going to rule."],
    [P.rachel, "Sam's point is that three of the things we're discussing — search, connectors, the nav — are all things we currently give away on every tier, and he thinks at least one of them should be the thing that makes people upgrade. He's not saying paywall search. He's saying if we're about to spend a quarter making search dramatically better, we should decide before we build it whether better search is a Pro thing."],
    [P.marcus, "Oh, that's a real question."],
    [P.ayesha, "That's a real question and I hate it."],
    [P.dani, "Why do you hate it?"],
    [P.ayesha, "Because the answer changes what I build. A Pro-tier retriever means per-tenant index isolation and a whole billing-aware code path, and that's not a decoration on top, it's a design constraint from day one."],
    [P.tom, "Same for connectors. 'Which connectors are on which plan' is a question I'd need answered before I touch the framework, not after."],
    [P.rachel, "Which is Sam's whole point, and why he wanted it raised now rather than in November."],
    [P.priya, "Okay. Ruling. This is a real and important question and it is not a roadmap question, it's a packaging question, and if we start it now it will eat the remaining twenty minutes and we will not finish the roadmap. So: not today. I'm booking ninety minutes with Rachel, Sam and myself this week, and whatever comes out of that is an input to the roadmap, not a replacement for it."],
    [P.ayesha, "As long as it happens before I start building."],
    [P.priya, "It'll happen this week. And Ayesha — the eval harness is first anyway, which buys us two weeks before the packaging answer actually constrains anything."],
    [P.ayesha, "That works."],
    [P.rachel, "I'll tell Sam it's booked. He'll be fine with that, he mostly wanted it not to be forgotten."],
    [P.priya, "It's not forgotten, it's scheduled, and there's a difference and I want us to get better at making that difference visible. Half the things people think we ignored, we actually deferred and never told them."],
    [P.jonas, "That is extremely true from where I sit."],
    [P.priya, "Right. Dani, nav. Go."],
  ],
};

/** Goes after the nav scene, before the cut. The tired bit where things nearly slip. */
export const SCENE_RELITIGATION: Scene = {
  title: "The search decision gets quietly re-opened",
  gist: "Rachel tests whether the shadow index can be accelerated for the renewal. Ayesha and Marcus both hold the line. The threshold survives.",
  lines: [
    [P.rachel, "I want to test something and I'm aware I might be doing the thing I said I wouldn't do at the top of the call."],
    [P.priya, "Say it anyway."],
    [P.rachel, "The shadow index takes four weeks of running before we decide, plus build time before that, plus ship time after. Realistically that's search improving in, what, late December? January?"],
    [P.ayesha, "Late January, honestly, if the decision goes yes."],
    [P.rachel, "Which is after the renewal conversation."],
    [P.ayesha, "It is after the renewal conversation, yes."],
    [P.rachel, "So is there a version where we ship something to Brightwater in December that makes search visibly better, even if it's not the real fix?"],
    [P.marcus, "This is exactly the thing that created the six connectors."],
    [P.rachel, "I know. I know it is. That's why I said I might be doing the thing. But I'd rather ask it in the room and be told no than decide it on my own in December when I'm under pressure."],
    [P.ayesha, "Can I answer it properly rather than just saying no? Because there might be a version."],
    [P.priya, "Go."],
    [P.ayesha, "The twenty-two percent vocabulary miss — a chunk of that is a small number of very common synonym pairs. Churn and cancellation. Invoice and bill. Client and customer. If I built a synonym table by hand from the query logs, covering maybe the top forty pairs, that's two days of work and no architectural risk at all. It doesn't fix the problem. It moves the zero-result rate by, I'd guess, five or six points."],
    [P.marcus, "And it doesn't touch latency, because it's a query expansion at the lexical layer."],
    [P.ayesha, "It doesn't touch latency at all. It's a lookup."],
    [P.rachel, "That's exactly what I was hoping existed."],
    [P.ayesha, "But I want one thing in exchange, and I want it on the record. When the synonym table lands and the number improves, nobody gets to say 'search is fixed, do we still need the rewrite'. Because that conversation will happen, in January, and I will lose it if it's not pre-empted now."],
    [P.priya, "That's a completely reasonable thing to ask for and I'm writing it down in those words."],
    [P.rachel, "Agreed, and I'll be the one who'd have been tempted, so I'll say it explicitly — the synonym table is a stopgap, it does not close out the search item, and if I argue otherwise in January somebody should play me this recording."],
    [P.marcus, "I will absolutely play you this recording."],
    [P.dani, "Clip it now, honestly."],
    [P.priya, "Alright — two days, Ayesha, and it's additive to the item rather than instead of it. Does that break your October?"],
    [P.ayesha, "Two days doesn't break anything. The eval harness is still first."],
    [P.priya, "Good. That's a better outcome than either the yes or the no I was expecting."],
  ],
};

/** Goes early, right after the agenda. Rachel reads out the actual escalation. */
export const SCENE_BRIGHTWATER_READOUT: Scene = {
  title: "The Brightwater escalation, read out in full",
  gist: "Rachel reads Helen's escalation email verbatim so the quarter is planned against what the customer actually said rather than a paraphrase of it.",
  lines: [
    [P.rachel, "One more thing before Tom starts, and it's short. I'm going to read you the actual email Helen sent me, because I've noticed we've been working off my paraphrase of it for three weeks and my paraphrase has been drifting.", { gap: 2.4 }],
    [P.priya, "Please do, I've definitely been repeating your paraphrase."],
    [P.rachel, "So. Quote. 'Rachel — following up on our call. I want to be straightforward with you because I think you'd rather have it straight. The renewal is not a formality this year. Three things. First, my team does not trust the search. It's not that it returns wrong answers, it's that it returns nothing and we can't tell whether that means nothing exists or the tool failed. People have started keeping their own spreadsheets again, which is exactly what we bought you to stop.'", { shaky: true }],
    [P.ayesha, "Oof."],
    [P.marcus, "That's the intermittent thing again."],
    [P.rachel, "It's the intermittent thing again, and I hadn't connected those until you said it ten minutes ago. Second point. 'Second, we have four data sources we've asked to connect since March and we have connected one. I understand these things take time. What I don't understand is why I find out about a delay by asking.'"],
    [P.tom, "That one's fair and it's mine."],
    [P.rachel, "It's partly yours and mostly mine, because the communication failure is not an engineering failure. Third. 'Third, and this is the one I find hardest to raise because it sounds petty — nobody on my team can find anything in the interface without asking someone. We have a Slack channel that exists purely for people to ask each other where things are. I've seen your product three times in demos and I still could not tell you where the saved views live.'"],
    [P.dani, "A Slack channel for asking where things are."],
    [P.rachel, "A Slack channel for asking where things are. That's the line I keep coming back to."],
    [P.dani, "That's not petty at all, that's the most damning of the three."],
    [P.jonas, "And it maps exactly onto my ticket buckets, which is either reassuring or terrifying."],
    [P.rachel, "She finishes with, 'None of this is unfixable and I'd rather fix it with you than switch. But I need to see movement before January, not a roadmap.' End quote."],
    [P.priya, "'Movement before January, not a roadmap' is a hell of a sentence to read out at the start of a roadmap meeting."],
    [P.rachel, "I know. I nearly didn't read it. But I think if we plan the quarter against my summary of that email rather than the email, we'll plan a quarter that makes me feel better and doesn't make her renew."],
    [P.abu, "Can I ask a question about the first one? When she says people can't tell whether nothing exists or the tool failed — is that a relevance problem or a messaging problem? Because if search returns zero and we say 'no results found', that's technically true and completely useless.", { gap: 1.1 }],
    [P.ayesha, "It's both, and honestly the messaging half is much cheaper. 'No results for X. We searched 14,000 documents across 3 sources.' That sentence costs nothing and it changes what the user concludes."],
    [P.dani, "And if we know the query had a vocabulary miss, we could even say 'did you mean' with the synonym."],
    [P.ayesha, "That's a good idea and it's free once the synonym table exists."],
    [P.priya, "Write both of those down, they're the kind of thing that evaporates."],
    [P.rachel, "The thing I want everyone to hold onto is the third complaint, because it's the one we'd naturally rank last. Search is a hard technical problem so it feels important. Connectors have a number attached so they feel important. 'I can't find anything' sounds like a training issue and it isn't, it's the one she called hardest to raise, which usually means it's the one that actually hurts."],
    [P.marcus, "People apologise for the complaints they believe most."],
    [P.rachel, "Yes. Exactly that."],
    [P.priya, "Okay. That reframes my sense of the priority order and I'm glad we did it before the round-robin rather than after. Tom, now you actually go."],
  ],
};
