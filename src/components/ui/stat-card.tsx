import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { AnimatedNumber } from '@/components/ui/animated-number';

type Accent = 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'default';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Цветовой акцент иконки и свечения */
  accent?: Accent;
  /** Мини-график (sparkline). Массив чисел по периодам. */
  sparkline?: number[];
  /** Index in a grid for stagger animation. */
  index?: number;
  className?: string;
}

const accentMap: Record<Accent, { icon: string; glow: string; stroke: string; gradId: string }> = {
  cyan:    { icon: 'stat-icon-cyan',    glow: 'hover:glow-cyan',    stroke: 'hsl(195 85% 60%)', gradId: 'sp-cyan' },
  purple:  { icon: 'stat-icon-purple',  glow: 'hover:glow-purple',  stroke: 'hsl(270 70% 65%)', gradId: 'sp-purple' },
  amber:   { icon: 'stat-icon-amber',   glow: 'hover:glow-amber',   stroke: 'hsl(38 92% 60%)',  gradId: 'sp-amber' },
  emerald: { icon: 'stat-icon-emerald', glow: 'hover:glow-emerald', stroke: 'hsl(142 70% 50%)', gradId: 'sp-emerald' },
  rose:    { icon: 'stat-icon-rose',    glow: 'hover:glow-rose',    stroke: 'hsl(340 75% 60%)', gradId: 'sp-rose' },
  default: { icon: 'stat-icon-default', glow: '',                   stroke: 'hsl(var(--primary))', gradId: 'sp-default' },
};

// Auto-cycle accents by title hash so dashboards look varied without manual config
const autoAccents: Accent[] = ['cyan', 'purple', 'amber', 'emerald', 'rose'];
function autoAccent(seed: string): Accent {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return autoAccents[Math.abs(h) % autoAccents.length];
}

export function StatCard({ title, value, icon, description, trend, accent, sparkline, className }: StatCardProps) {
  const a = accentMap[accent ?? autoAccent(title)];
  const sparkData = sparkline?.map((v, i) => ({ i, v })) ?? null;

  return (
    <Card className={cn(
      'glass-premium hover-lift animate-fade-in min-w-0 relative group',
      a.glow,
      className,
    )}>
      <CardContent className="p-4 md:p-5 relative">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground/90 uppercase tracking-wide truncate">{title}</p>
            <p
              className="text-lg md:text-xl xl:text-2xl font-bold tabular-nums leading-tight truncate animate-count-up"
              title={String(value)}
            >
              {value}
            </p>
            {(description || trend) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
                {trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md tabular-nums',
                      trend.isPositive
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-rose-400 bg-rose-500/10',
                    )}
                  >
                    {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </span>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground truncate">{description}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              'p-2.5 md:p-3 rounded-xl text-white shrink-0 shadow-lg ring-1 ring-white/10 transition-transform group-hover:scale-110',
              a.icon,
            )}
          >
            {icon}
          </div>
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="mt-3 h-10 -mx-1 opacity-90">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id={a.gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={a.stroke} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={a.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={a.stroke}
                  strokeWidth={2}
                  fill={`url(#${a.gradId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
