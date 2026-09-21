import type { Scene } from "../build";

// Second pass over the shorter meetings. The first draft of these came out at
// two to seven minutes each, which is not what those meetings are in real life
// — a pricing follow-up is twenty minutes, a retro is forty. Rather than
// inflate the durations and let playback drift out of sync with the
// transcript, the honest fix is more dialogue.

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
  mei: "p-mei",
  helen: "p-helen",
  owen: "p-owen",
};

// --------------------------------------------------------------- 1:1 -----
export const ONE_ON_ONE_EXTRA: Scene[] = [
  {
    title: "The migration, and why nobody noticed",
    gist: "Abubakar's Postgres migration landed invisibly. Priya uses it to explain how she'll argue for him at calibration.",
    lines: [
      [P.priya, "Before we get to the hard stuff — the Postgres migration. I want to say properly that it was excellent, because I said it in the retro and I don't think that counts."],
      [P.abu, "It went fine."],
      [P.priya, "It went fine because you spent four weeks making it go fine. There's a version of that migration where we're down for six hours on a Tuesday and everyone knows your name for the wrong reason."],
      [P.abu, "There's also a version where I over-prepared for four weeks and two would have done."],
      [P.priya, "Maybe. But I can't tell the difference from outside and neither can you, and that asymmetry is exactly the problem with prevention work. If it works you can't prove it was necessary."],
      [P.abu, "That's the thing that bothers me about it, honestly. It's unfalsifiable in both directions."],
      [P.priya, "It is. Which is why I'm going to argue it differently at calibration. Not 'the migration went well' — that sounds like nothing happened. 'He took the highest-risk piece of infrastructure work this year and the business experienced zero impact, and here is the runbook that made that repeatable.' The runbook is the artefact. That's the bit that's legible."],
      [P.abu, "So the documentation isn't overhead, it's the evidence."],
      [P.priya, "The documentation is the evidence. Which is a slightly cynical framing but it's also just true."],
      [P.abu, "I'll take slightly cynical and true."],
    ],
  },
  {
    title: "Whether to go deeper or wider",
    gist: "A real career fork: stay on platform depth or take on more surface area. Neither of them resolves it.",
    lines: [
      [P.priya, "Last thing and it's the open-ended one. Six months out — do you want to go deeper on platform or wider across the product?"],
      [P.abu, "I've been thinking about it and I don't have a clean answer."],
      [P.priya, "That's fine, I'd be suspicious of a clean answer."],
      [P.abu, "The honest version is that deeper is more comfortable and I'm not sure comfort is the right criterion. I'm good at the infrastructure work. I know what good looks like. Wider means being mediocre at things for a while in front of people who are good at them."],
      [P.priya, "That's a very clear-eyed description of the actual tradeoff."],
      [P.abu, "The thing that pushes me toward wider is that the problems I find interesting keep turning out to be product problems wearing an infrastructure costume. The connector thing isn't really an engineering problem, it's a commitment problem. The on-call thing isn't a rota problem, it's an incentive problem."],
      [P.priya, "That's a genuinely senior observation and it's the argument for wider, though I'd push back on one thing — you don't have to choose a title to choose that. You can keep doing platform work and start naming the incentive problem out loud, which you've done twice in this conversation."],
      [P.abu, "That feels like a way of avoiding the decision."],
      [P.priya, "It's a way of deferring it cheaply, which is different. The decision costs something once you make it. Noticing costs nothing and it's most of the value."],
      [P.abu, "Alright. Can we pick this up again in a month rather than resolving it badly today?"],
      [P.priya, "Yes, and I'll put it on the agenda so it doesn't quietly disappear, because these conversations always quietly disappear."],
    ],
  },
];

// ---------------------------------------------------------- standup -----
export const STANDUP_EXTRA: Scene[] = [
  {
    title: "The staging incident from yesterday",
    gist: "A five-minute detour into why staging broke, which turns out to be the redirect logic Dani is about to delete.",
    lines: [
      [P.marcus, "One thing before we close — staging was down for about forty minutes yesterday afternoon. Does anyone know why?"],
      [P.dani, "That might have been me. I deleted a redirect to see what broke."],
      [P.marcus, "In staging, deliberately?"],
      [P.dani, "In staging, deliberately, but I didn't expect it to take the whole environment down. I expected a 404 on one route."],
      [P.abu, "What did it actually do?"],
      [P.dani, "Infinite redirect loop. The route I deleted was catching a redirect from somewhere else, so removing it meant the other one pointed at itself."],
      [P.abu, "That's genuinely useful information and it's exactly the kind of thing you only find by deleting it."],
      [P.marcus, "Agreed, no complaints about the experiment. But flag it next time so whoever's using staging knows. Tom was mid-test."],
      [P.tom, "I was, and I assumed it was my change, so I spent twenty minutes reverting something that was fine."],
      [P.dani, "Sorry, that's a fair cost and I should have said something in the channel."],
      [P.marcus, "It's a small thing. Post in the channel before you break staging on purpose, that's the whole rule."],
      [P.abu, "Can we make staging redirects loud somewhere? If there's a loop it should page or at least log obviously, rather than just hanging."],
      [P.marcus, "Add it to the nav work. If Dani's deleting eleven pieces of routing logic we're going to hit this again."],
    ],
  },
];

// --------------------------------------------------- support review -----
export const SUPPORT_EXTRA: Scene[] = [
  {
    title: "Reading three actual tickets",
    gist: "Jonas reads verbatim tickets rather than summarising, which changes how Priya and Dani respond to them.",
    lines: [
      [P.jonas, "I want to read three actual tickets rather than describing the category, because the category flattens them."],
      [P.priya, "Go ahead."],
      [P.jonas, "First one, from a Brightwater analyst. 'I have been looking for the place to add a second source for twenty minutes. I have checked Settings, Workspace Settings, the Sources page and the dashboard. Can you please just send me a link. I do not need training, I need a link.'"],
      [P.dani, "'I do not need training, I need a link.' That's brutal and it's correct."],
      [P.jonas, "Second one, different customer. 'The sync says failed. There is no other information. What am I supposed to do with this.' No question mark, which I always think is a sign of how the person was feeling."],
      [P.priya, "That's a good observation, actually."],
      [P.jonas, "Third. 'Searched for invoice reconciliation, got nothing. Searched for reconciliation, got nothing. Searched for invoice, got four hundred results. Is there a trick to this?'"],
      [P.dani, "'Is there a trick to this' is such a damning sentence. They're assuming the tool is fine and they're holding it wrong."],
      [P.priya, "That's the thing that gets me. In all three the customer blames themselves before they blame us."],
      [P.jonas, "Which is why the ticket volume undercounts the problem. The people who file are the ones who assumed it was their fault and asked for help. The people who assume it's broken just stop using it."],
      [P.priya, "So your twenty-eight percent is a floor."],
      [P.jonas, "My twenty-eight percent is a floor and I have no way to measure the ceiling. That's the bit I find frustrating."],
      [P.dani, "You could measure it, partly. If someone lands on the Sources page and leaves without adding anything, that's a signal. It's not proof but it's a lot better than nothing."],
      [P.jonas, "Can we instrument that?"],
      [P.priya, "That's about a day of work and it would tell us whether the twenty-eight is a tenth of the problem or most of it. Let's do it before we design the fix, not after."],
      [P.dani, "Agreed. I'd rather design against a real number."],
    ],
  },
  {
    title: "What Jonas needs that isn't headcount",
    gist: "Jonas asks for a macro system and permission to close tickets as product bugs rather than resolving them individually.",
    lines: [
      [P.priya, "You said earlier you're not asking for headcount. What are you asking for?"],
      [P.jonas, "Two things, both small. First, I want permission to close a ticket as 'this is a product bug, tracked here' and link it, rather than walking every individual customer through a workaround. Right now I solve the same problem forty times a month, one customer at a time."],
      [P.priya, "What stops you doing that today?"],
      [P.jonas, "Nothing formal. It just feels like giving up, and my team feels the same, so we all do the workaround instead. I'd like it to be the stated policy so it doesn't feel like failure."],
      [P.priya, "That's very easy to give you and I should have offered it."],
      [P.jonas, "Second is a proper macro system with variables. We have canned responses but they're static, so people rewrite them anyway and then they drift and now we answer the same question five different ways depending on who picked it up."],
      [P.dani, "That's a consistency problem as much as a speed one."],
      [P.jonas, "It's mostly a consistency problem. The speed saving is maybe an hour a day across the team. The consistency saving is that customers stop getting contradictory answers, which is currently a real thing that happens."],
      [P.priya, "How often?"],
      [P.jonas, "Enough that a customer sent us two different answers we'd given them and asked which one was true."],
      [P.priya, "Right. Both approved, and the macro thing can come out of the support tooling budget rather than engineering, which means it doesn't compete with the roadmap."],
    ],
  },
];

// ---------------------------------------------------------- retro -----
export const RETRO_EXTRA: Scene[] = [
  {
    title: "The thing nobody wanted to say first",
    gist: "Ayesha raises that the team keeps agreeing to things in retros and not doing them. The room takes it seriously.",
    lines: [
      [P.ayesha, "Can I raise something that isn't about August specifically?"],
      [P.marcus, "Go on."],
      [P.ayesha, "I went back through the last four retros before this one. We generated nineteen actions. Four got done. And of the four, three were things somebody was going to do anyway."],
      [P.dani, "Oh, that's grim."],
      [P.ayesha, "It's grim and I'm partly responsible, I've got two undone ones with my name on them. I'm not pointing at anyone. But if we do this meeting every month and the output is a list nobody executes, then the meeting is a feelings exercise and we should either fix it or be honest that that's what it is."],
      [P.tom, "I think it's partly that retro actions don't have a home. They're not tickets, they're not in the sprint, they're in a doc."],
      [P.abu, "And they're usually process changes, which don't have an obvious owner in the way a bug does."],
      [P.marcus, "What would actually fix it?"],
      [P.ayesha, "Fewer actions. If we came out of this with two, and both had a name and a date and got read out at the next one, I'd bet we'd do both. Nineteen across four months means we weren't choosing, we were listing."],
      [P.dani, "That matches my experience of every retro I've ever been in, honestly."],
      [P.marcus, "Then let's do that. Two actions maximum from today, and the first agenda item next month is reading out whether we did them. Not a status round — just did it happen, yes or no."],
      [P.tom, "Can the answer be no?"],
      [P.marcus, "The answer can absolutely be no. The point is that it's said out loud rather than quietly rolling over."],
      [P.ayesha, "That's all I wanted."],
      [P.abu, "I'd add one thing — we should probably drop the fifteen open ones rather than pretending they're still live. Carrying a list you know you won't do makes the whole list feel optional."],
      [P.marcus, "Agreed. I'll close them all out as won't-do with a note, and if anyone wants one back they can say so."],
    ],
  },
];

// ------------------------------------------------- kestrel followup -----
export const KESTREL_FU_EXTRA: Scene[] = [
  {
    title: "Security and procurement",
    gist: "Diego walks through Kestrel's procurement path, which adds four weeks nobody had accounted for.",
    lines: [
      [P.diego, "There's a process thing I should flag because I don't think either of us has factored it in."],
      [P.leah, "Go on."],
      [P.diego, "Anything above forty thousand goes through procurement rather than straight from my budget. That's a security questionnaire, a legal review of your terms, and a finance check on your company. Realistically four weeks, and that's four weeks after we've agreed commercially, not in parallel."],
      [P.leah, "So if we agree in mid-October we're signing in mid-November at the earliest."],
      [P.diego, "Mid-November if nothing snags. And the thing that usually snags is the legal review, because our standard terms have an indemnity clause that most vendors push back on."],
      [P.leah, "Can you send me the clause now, before we've agreed anything? If our legal team has an issue I'd rather find out in week one than week five."],
      [P.diego, "That's a sensible ask and yes, I'll send it today."],
      [P.leah, "And the two-year structure we just discussed — does that change the procurement threshold?"],
      [P.diego, "It makes it worse, because they look at total contract value. A two-year deal at forty-four is eighty-eight and that's a different approval tier again."],
      [P.leah, "Which needs who?"],
      [P.diego, "CFO sign-off. Which is not a problem exactly, but it's another person and another two weeks, and she'll ask why we're committing for two years to a vendor we haven't used."],
      [P.leah, "That's a fair question and it's one I should give you an answer to rather than making you invent one. What if year two is at the locked rate but with a break clause after twelve months — so you get the price certainty without the commitment risk?"],
      [P.diego, "That would answer her objection almost exactly. Can you actually do that?"],
      [P.leah, "I'd need to check, and I'm not going to tell you yes in the room and walk it back later. I'll confirm tomorrow."],
      [P.diego, "Honestly, after last time, I appreciate you not saying yes in the room."],
      [P.leah, "That's a fair hit and I'll take it."],
    ],
  },
];
