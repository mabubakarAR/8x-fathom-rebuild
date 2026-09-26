export function Sonar({ size = 900, className = "" }: { size?: number; className?: string }) {
  const rings = [0, 2, 4, 6];
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {[12, 22, 32, 42, 49.5].map((r, i) => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="oklch(100% 0 0)" strokeOpacity={0.07 - i * 0.01} strokeWidth="0.12" />
        ))}
        <line x1="50" y1="0" x2="50" y2="100" stroke="oklch(100% 0 0)" strokeOpacity="0.035" strokeWidth="0.1" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="oklch(100% 0 0)" strokeOpacity="0.035" strokeWidth="0.1" />
      </svg>
      <div className="lp-sweep" />
      {rings.map((d) => (
        <span key={d} className="lp-ping" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}
