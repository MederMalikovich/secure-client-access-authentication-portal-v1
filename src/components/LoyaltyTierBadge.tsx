import { Crown, Gem, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoyaltyTier = 'silver' | 'gold' | 'vip';

const tierConfig: Record<LoyaltyTier, { label: string; cls: string; Icon: any }> = {
  silver: { label: 'Silver', cls: 'bg-muted text-muted-foreground border-muted-foreground/30', Icon: Award },
  gold: { label: 'Gold', cls: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/40', Icon: Gem },
  vip: { label: 'VIP', cls: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/40', Icon: Crown },
};

export function LoyaltyTierBadge({ tier, className }: { tier?: string | null; className?: string }) {
  const t = (tier || 'silver') as LoyaltyTier;
  const c = tierConfig[t] || tierConfig.silver;
  const Icon = c.Icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border', c.cls, className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
