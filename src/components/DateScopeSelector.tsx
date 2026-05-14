import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export type DateScope = 'today' | 'week' | 'month' | 'all' | 'custom';

interface Props {
  scope: DateScope;
  customDate: string;
  onChange: (scope: DateScope, customDate?: string) => void;
}

export function DateScopeSelector({ scope, customDate, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Button size="sm" variant={scope === 'today' ? 'default' : 'outline'} onClick={() => onChange('today')}>Сегодня</Button>
      <Button size="sm" variant={scope === 'week' ? 'default' : 'outline'} onClick={() => onChange('week')}>7 дней</Button>
      <Button size="sm" variant={scope === 'month' ? 'default' : 'outline'} onClick={() => onChange('month')}>30 дней</Button>
      <Button size="sm" variant={scope === 'all' ? 'default' : 'outline'} onClick={() => onChange('all')}>Все</Button>
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={customDate || format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => onChange('custom', e.target.value)}
          className={`h-9 w-[160px] ${scope === 'custom' ? 'border-primary' : ''}`}
        />
      </div>
    </div>
  );
}

export function filterByScope<T extends { [k: string]: any }>(items: T[], scope: DateScope, customDate: string, dateField: string): T[] {
  if (scope === 'all') return items;
  const now = new Date();
  let from: Date, to: Date;
  if (scope === 'today') {
    from = new Date(now); from.setHours(0, 0, 0, 0);
    to = new Date(now); to.setHours(23, 59, 59, 999);
  } else if (scope === 'week') {
    from = new Date(now); from.setDate(from.getDate() - 7);
    to = new Date(now);
  } else if (scope === 'month') {
    from = new Date(now); from.setDate(from.getDate() - 30);
    to = new Date(now);
  } else {
    if (!customDate) return items;
    from = new Date(customDate); from.setHours(0, 0, 0, 0);
    to = new Date(customDate); to.setHours(23, 59, 59, 999);
  }
  return items.filter(i => {
    const d = new Date(i[dateField]);
    return d >= from && d <= to;
  });
}
