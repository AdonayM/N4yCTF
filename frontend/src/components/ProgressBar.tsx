export function ProgressBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full h-3 rounded-full bg-panelAlt border border-border overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-accentDim to-accent transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}