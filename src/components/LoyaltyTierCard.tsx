import { useEffect, useState } from 'react';
import { Crown, Gem, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Tier = 'silver' | 'gold' | 'vip';

const tierStyles: Record<Tier, { label: string; Icon: any; gradient: string; ring: string; iconColor: string; chip: string }> = {
  silver: {
    label: 'Silver',
    Icon: Award,
    gradient: 'from-slate-400/20 via-slate-300/10 to-transparent',
    ring: 'ring-slate-400/40',
    iconColor: 'text-slate-300',
    chip: 'bg-slate-400/15 text-slate-200 border-slate-400/40',
  },
  gold: {
    label: 'Gold',
    Icon: Gem,
    gradient: 'from-yellow-500/25 via-amber-400/10 to-transparent',
    ring: 'ring-yellow-500/50',
    iconColor: 'text-yellow-400',
    chip: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  },
  vip: {
    label: 'VIP',
    Icon: Crown,
    gradient: 'from-purple-500/25 via-pink-500/15 to-transparent',
    ring: 'ring-purple-500/50',
    iconColor: 'text-purple-400',
    chip: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40',
  },
};

interface Props {
  tier?: string | null;
  lifetimeSpend?: number;
  className?: string;
  variant?: 'full' | 'compact';
}

export function LoyaltyTierCard({ tier, lifetimeSpend = 0, className, variant = 'full' }: Props) {
  const [settings, setSettings] = useState<{ gold_threshold: number; vip_threshold: number; silver_percent: number; gold_percent: number; vip_percent: number } | null>(null);

  useEffect(() => {
    supabase.from('loyalty_settings').select('gold_threshold, vip_threshold, silver_percent, gold_percent, vip_percent').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as any);
    });
  }, []);

  const t = ((tier || 'silver').toLowerCase() as Tier);
  const style = tierStyles[t] || tierStyles.silver;
  const Icon = style.Icon;

  const goldT = Number(settings?.gold_threshold ?? 50000);
  const vipT = Number(settings?.vip_threshold ?? 200000);
  const spend = Number(lifetimeSpend || 0);

  const currentPct = t === 'silver' ? (settings?.silver_percent ?? 3) : t === 'gold' ? (settings?.gold_percent ?? 5) : (settings?.vip_percent ?? 10);

  let nextLabel: string | null = null;
  let needed = 0;
  let progress = 100;
  if (t === 'silver') {
    nextLabel = 'Gold';
    needed = Math.max(0, goldT - spend);
    progress = Math.min(100, (spend / Math.max(1, goldT)) * 100);
  } else if (t === 'gold') {
    nextLabel = 'VIP';
    needed = Math.max(0, vipT - spend);
    progress = Math.min(100, ((spend - goldT) / Math.max(1, vipT - goldT)) * 100);
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 ring-1', style.gradient, style.ring, className)}>
      <div className="absolute -top-8 -right-8 opacity-10">
        <Icon className={cn('h-32 w-32', style.iconColor)} />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center bg-background/40 backdrop-blur border', style.ring)}>
              <Icon className={cn('h-6 w-6', style.iconColor)} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Уровень лояльности</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold leading-tight">{style.label}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-md border font-semibold', style.chip)}>
                  {currentPct}% бонусов
                </span>
              </div>
            </div>
          </div>
        </div>

        {variant === 'full' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Потрачено за 12 мес
              </span>
              <span className="font-semibold">{formatCurrency(spend)}</span>
            </div>

            {nextLabel ? (
              <>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">До уровня <span className="font-medium text-foreground">{nextLabel}</span></span>
                  <span className="font-semibold text-primary">{formatCurrency(needed)}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-center py-2 px-3 rounded-md bg-background/40 border border-purple-500/30 text-purple-300">
                ✨ Максимальный уровень — спасибо за доверие!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
