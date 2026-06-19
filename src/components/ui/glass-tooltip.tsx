import { TooltipProps } from 'recharts';

interface GlassTooltipProps extends TooltipProps<number, string> {
  /** Optional formatter for the numeric value. */
  valueFormatter?: (value: number, name?: string) => string;
  /** Override accent color (CSS color). Defaults to first payload stroke/fill. */
  accentColor?: string;
}

/**
 * Premium glass tooltip with backdrop blur, glow accent and a thin colored frame
 * matching the active series. Designed to look great in light and dark themes.
 */
export function GlassTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
  accentColor,
}: GlassTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const accent =
    accentColor ||
    (payload[0] as any).stroke ||
    (payload[0] as any).fill ||
    'hsl(var(--primary))';

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs font-medium tabular-nums shadow-2xl backdrop-blur-xl"
      style={{
        background: 'hsl(var(--popover) / 0.7)',
        border: `1px solid ${accent}`,
        boxShadow: `0 8px 32px -8px ${accent}66, 0 0 0 1px hsl(var(--border) / 0.4) inset`,
        color: 'hsl(var(--popover-foreground))',
      }}
    >
      {label !== undefined && (
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => {
          const color = (p as any).stroke || (p as any).fill || accent;
          const v = typeof p.value === 'number' ? p.value : Number(p.value);
          const formatted = valueFormatter && isFinite(v)
            ? valueFormatter(v, p.name as string)
            : (p.value as any);
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
              {p.name && (
                <span className="text-muted-foreground">{p.name}:</span>
              )}
              <span className="font-semibold">{formatted}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
