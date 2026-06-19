import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Wallet, Receipt, Sparkles, CalendarClock } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  invoices: any[];
  appointments?: any[];
}

/**
 * Премиум LTV-дашборд клиента. Виден только персоналу клиники.
 * Скрыт для роли client.
 */
export function ClientLifetimeValue({ invoices, appointments = [] }: Props) {
  const { hasRole } = useAuth();
  if (hasRole('client')) return null;

  const data = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid');
    const ltv = paid.reduce((s, i) => s + Number(i.total || 0), 0);
    const count = paid.length;
    const avgCheck = count > 0 ? ltv / count : 0;

    // Last 90 days vs previous 90 days
    const now = Date.now();
    const d90 = 90 * 86400000;
    const recent = paid.filter(i => now - new Date(i.issued_at).getTime() <= d90);
    const prev = paid.filter(i => {
      const dt = now - new Date(i.issued_at).getTime();
      return dt > d90 && dt <= 2 * d90;
    });
    const recentSum = recent.reduce((s, i) => s + Number(i.total || 0), 0);
    const prevSum = prev.reduce((s, i) => s + Number(i.total || 0), 0);
    const deltaPct = prevSum > 0
      ? Math.round(((recentSum - prevSum) / prevSum) * 100)
      : (recentSum > 0 ? 100 : 0);

    // Sparkline: monthly totals last 6 months
    const months: { k: string; v: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = format(d, 'yyyy-MM');
      months.push({ k: key, v: 0 });
    }
    paid.forEach(inv => {
      const key = format(new Date(inv.issued_at), 'yyyy-MM');
      const m = months.find(x => x.k === key);
      if (m) m.v += Number(inv.total || 0);
    });

    const lastVisit = appointments.length > 0
      ? appointments
          .filter(a => new Date(a.scheduled_at) <= new Date())
          .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))[0]
      : null;
    const daysSince = lastVisit
      ? differenceInDays(new Date(), new Date(lastVisit.scheduled_at))
      : null;

    const visits = appointments.filter(a => a.status === 'completed').length || appointments.length;

    return { ltv, avgCheck, count, deltaPct, months, lastVisit, daysSince, visits };
  }, [invoices, appointments]);

  const positive = data.deltaPct >= 0;

  return (
    <div className="mx-4 mt-4 rounded-2xl glass-premium gradient-mesh-bg p-4 animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg stat-icon-purple flex items-center justify-center shadow-md ring-1 ring-white/10">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Lifetime Value
            </p>
            <p className="text-[10px] text-muted-foreground/70">Только для персонала</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-md tabular-nums',
            positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10',
          )}
          title="Динамика за последние 90 дней"
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? '+' : ''}{data.deltaPct}%
        </span>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-3 relative">
        <MetricBlock
          icon={<Wallet className="h-4 w-4 text-white" />}
          iconClass="stat-icon-emerald"
          label="Lifetime Value"
          value={formatCurrency(data.ltv)}
          sub={`${data.count} оплачено`}
        />
        <MetricBlock
          icon={<Receipt className="h-4 w-4 text-white" />}
          iconClass="stat-icon-cyan"
          label="Средний чек"
          value={formatCurrency(Math.round(data.avgCheck))}
          sub={data.visits > 0 ? `${data.visits} визитов` : '—'}
        />
      </div>

      {/* Sparkline */}
      {data.months.some(m => m.v > 0) && (
        <div className="mt-3 h-12 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.months} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="ltv-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270 70% 65%)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(195 85% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="hsl(270 70% 65%)" strokeWidth={2}
                    fill="url(#ltv-spark)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer context */}
      {data.lastVisit && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground relative">
          <CalendarClock className="h-3 w-3" />
          Последний визит {format(new Date(data.lastVisit.scheduled_at), 'd MMM yyyy', { locale: ru })}
          {data.daysSince !== null && ` • ${data.daysSince} дн. назад`}
        </div>
      )}
    </div>
  );
}

function MetricBlock({
  icon, iconClass, label, value, sub,
}: { icon: React.ReactNode; iconClass: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-background/40 backdrop-blur-sm border border-border/30 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shadow-sm ring-1 ring-white/10', iconClass)}>
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-lg md:text-xl font-bold tabular-nums leading-tight gradient-text-aurora">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
