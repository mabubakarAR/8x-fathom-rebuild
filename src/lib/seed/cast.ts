import type { HighlightCategory, Person, Template } from "@/lib/types";

// The workspace belongs to Lumen Labs, a ~40 person company that sells a data
// ingest + search platform. Everything in the seed hangs together: the same
// people recur across weeks, the customer in the Tuesday call is the one whose
// escalation shows up in Thursday's support review, and the roadmap decisions
// in the hero call get referenced in the 1:1s afterwards. Cross-meeting search
// is only interesting if the corpus actually has threads running through it.

export const PEOPLE: Person[] = [
  // ---- Lumen Labs ----
  {
    id: "p-abubakar",
    name: "Abubakar Muhammad",
    email: "abubakar@lumenlabs.io",
    title: "Staff Engineer",
    external: false,
    company: "Lumen Labs",
    hue: 0,
  },
  {
    id: "p-priya",
    name: "Priya Raghunathan",
    email: "priya@lumenlabs.io",
    title: "VP Product",
    external: false,
    company: "Lumen Labs",
    hue: 1,
  },
  {
    id: "p-marcus",
    name: "Marcus Bell",
    email: "marcus@lumenlabs.io",
    title: "Engineering Lead, Platform",
    external: false,
    company: "Lumen Labs",
    hue: 2,
  },
  {
    id: "p-dani",
    name: "Dani Okonkwo",
    email: "dani@lumenlabs.io",
    title: "Design Lead",
    external: false,
    company: "Lumen Labs",
    hue: 3,
  },
  {
    id: "p-tom",
    name: "Tom Vasquez",
    email: "tom@lumenlabs.io",
    title: "Engineering Lead, Ingest",
    external: false,
    company: "Lumen Labs",
    hue: 4,
  },
  {
    id: "p-ayesha",
    name: "Ayesha Karim",
    email: "ayesha@lumenlabs.io",
    title: "Staff Data Scientist",
    external: false,
    company: "Lumen Labs",
    hue: 5,
  },
  {
    id: "p-jonas",
    name: "Jonas Lindqvist",
    email: "jonas@lumenlabs.io",
    title: "Support Lead",
    external: false,
    company: "Lumen Labs",
    hue: 6,
  },
  {
    id: "p-rachel",
    name: "Rachel Moss",
    email: "rachel@lumenlabs.io",
    title: "CEO",
    external: false,
    company: "Lumen Labs",
    hue: 7,
  },
  {
    id: "p-sam",
    name: "Sam Tran",
    email: "sam@lumenlabs.io",
    title: "Product Marketing",
    external: false,
    company: "Lumen Labs",
    hue: 8,
  },
  {
    id: "p-leah",
    name: "Leah Braun",
    email: "leah@lumenlabs.io",
    title: "Account Executive",
    external: false,
    company: "Lumen Labs",
    hue: 9,
  },

  // ---- Brightwater Health (existing customer, mid-renewal) ----
  {
    id: "p-helen",
    name: "Helen Gao",
    email: "helen.gao@brightwaterhealth.com",
    title: "VP Operations",
    external: true,
    company: "Brightwater Health",
    hue: 10,
  },
  {
    id: "p-owen",
    name: "Owen Fitzgerald",
    email: "owen.f@brightwaterhealth.com",
    title: "CTO",
    external: true,
    company: "Brightwater Health",
    hue: 11,
  },

  // ---- Kestrel Freight (open opportunity) ----
  {
    id: "p-diego",
    name: "Diego Salas",
    email: "dsalas@kestrelfreight.com",
    title: "Director of RevOps",
    external: true,
    company: "Kestrel Freight",
    hue: 12,
  },
  {
    id: "p-mei",
    name: "Mei Watanabe",
    email: "m.watanabe@kestrelfreight.com",
    title: "Head of Data",
    external: true,
    company: "Kestrel Freight",
    hue: 13,
  },

  // ---- Candidate ----
  {
    id: "p-nina",
    name: "Nina Petrova",
    email: "nina.petrova@hey.com",
    title: "Candidate — Senior Engineer",
    external: true,
    company: "—",
    hue: 14,
  },
];

export const PERSON_BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

export function person(id: string): Person {
  const p = PERSON_BY_ID.get(id);
  if (!p) throw new Error(`Unknown person: ${id}`);
  return p;
}

// Highlight categories. Fathom ships no defaults at all — users invent their
// own from an empty list, which is a cold start nobody wants. A seeded set that
// covers the common cases, still fully editable, is strictly better.
export const HIGHLIGHT_CATEGORIES: HighlightCategory[] = [
  { key: "decision", label: "Decision", color: "emerald" },
  { key: "risk", label: "Risk", color: "rose" },
  { key: "quote", label: "Good quote", color: "violet" },
  { key: "objection", label: "Objection", color: "amber" },
  { key: "followup", label: "Follow up", color: "sky" },
  { key: "idea", label: "Idea", color: "fuchsia" },
];

export const CATEGORY_BY_KEY = new Map(
  HIGHLIGHT_CATEGORIES.map((c) => [c.key, c]),
);

// Summary templates. Fathom ships 17 and gates them behind Team Edition; the
// count is marketing. What matters is that switching one re-shapes the summary
// rather than just re-wording it, so each template here declares its own
// section structure and the generator fills only those sections.
export const TEMPLATES: Template[] = [
  {
    key: "general",
    label: "General",
    blurb: "Decisions, next steps and the moments that mattered.",
    sections: ["Overview", "Key points", "Decisions", "Next steps"],
  },
  {
    key: "sales",
    label: "Sales",
    blurb: "Needs, objections, buying signals and where the deal stands.",
    sections: [
      "Company context",
      "Pain and priorities",
      "Objections raised",
      "Buying signals",
      "Next steps",
    ],
  },
  {
    key: "discovery",
    label: "Discovery",
    blurb: "Current state, desired state and what sits between them.",
    sections: [
      "Current state",
      "Desired state",
      "Blockers",
      "Success criteria",
      "Next steps",
    ],
  },
  {
    key: "customer-success",
    label: "Customer Success",
    blurb: "Health, friction, expansion signals and churn risk.",
    sections: [
      "Account health",
      "Friction and complaints",
      "Requests",
      "Risk signals",
      "Next steps",
    ],
  },
  {
    key: "one-on-one",
    label: "One-on-one",
    blurb: "Updates, blockers, support needed and growth.",
    sections: ["Updates", "Blockers", "Support needed", "Growth", "Next steps"],
  },
  {
    key: "project-update",
    label: "Project Update",
    blurb: "Status by workstream, slippage and what changed.",
    sections: [
      "Status by workstream",
      "What changed",
      "Slipping",
      "Decisions",
      "Next steps",
    ],
  },
  {
    key: "retro",
    label: "Retrospective",
    blurb: "Start, stop, continue — and what actually gets actioned.",
    sections: ["Went well", "Did not go well", "Start doing", "Stop doing", "Next steps"],
  },
  {
    key: "interview",
    label: "Candidate Interview",
    blurb: "Experience, signal against the bar, and concerns.",
    sections: [
      "Background",
      "Technical signal",
      "Concerns",
      "Candidate questions",
      "Next steps",
    ],
  },
  {
    key: "qa",
    label: "Q&A",
    blurb: "Every question asked, paired with the answer given.",
    sections: ["Questions and answers", "Unanswered", "Next steps"],
  },
];

export const TEMPLATE_BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

/** Which templates make sense to offer first, per meeting kind. */
export const SUGGESTED_TEMPLATES: Record<string, string[]> = {
  sales: ["sales", "discovery", "general", "qa"],
  discovery: ["discovery", "sales", "general", "qa"],
  customer: ["customer-success", "qa", "general"],
  "one-on-one": ["one-on-one", "general"],
  standup: ["project-update", "general"],
  planning: ["project-update", "general", "retro"],
  retro: ["retro", "general"],
  interview: ["interview", "qa", "general"],
  "all-hands": ["general", "qa"],
};
