const CDN = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

const RECORDS = [
  { slug: "google-meet", name: "Google Meet" },
  { slug: "zoom", name: "Zoom" },
  { slug: "microsoft-teams", name: "Teams" },
  { slug: "google-calendar", name: "Calendar" },
  { slug: "google-chrome", name: "Chrome" },
];
const SENDS = [
  { slug: "slack", name: "Slack" },
  { slug: "notion", name: "Notion" },
  { slug: "hubspot", name: "HubSpot" },
  { slug: "salesforce", name: "Salesforce" },
  { slug: "linear", name: "Linear" },
];

function Row({ label, items }: { label: string; items: typeof RECORDS }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
      <p className="mono w-[150px] shrink-0 text-[12px] text-(--ink-3)">{label}</p>
      <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {items.map((l) => (
          <li key={l.slug} className="lp-logo-item flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote SVG brand marks */}
            <img src={`${CDN}/${l.slug}/default.svg`} alt="" width={22} height={22} className="lp-logo h-[22px] w-[22px]" loading="lazy" />
            <span className="text-[15px] font-medium tracking-tight text-(--ink-2)">{l.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Logos() {
  return (
    <section aria-label="Integrations" className="border-y border-(--line) px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
        <Row label="Records calls on" items={RECORDS} />
        <Row label="Sends notes to" items={SENDS} />
      </div>
    </section>
  );
}
