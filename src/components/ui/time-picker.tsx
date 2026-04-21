import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string; // 'HH:MM' or ''
  onChange: (value: string) => void;
  startHour?: number;
  endHour?: number;
  minuteStep?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Удобный выбор времени двумя выпадающими списками: часы и минуты.
 */
export function TimePicker({
  value,
  onChange,
  startHour = 0,
  endHour = 23,
  minuteStep = 5,
  className,
  disabled,
}: TimePickerProps) {
  const [hStr = '', mStr = ''] = value.split(':');

  const setHour = (h: string) => {
    const m = mStr || '00';
    onChange(`${h}:${m}`);
  };
  const setMinute = (m: string) => {
    const h = hStr || String(startHour).padStart(2, '0');
    onChange(`${h}:${m}`);
  };

  const hours: string[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(String(h).padStart(2, '0'));

  const minutes: string[] = [];
  for (let m = 0; m < 60; m += minuteStep) minutes.push(String(m).padStart(2, '0'));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={hStr} onValueChange={setHour} disabled={disabled}>
        <SelectTrigger className="w-[90px]">
          <SelectValue placeholder="чч" />
        </SelectTrigger>
        <SelectContent className="max-h-[260px]">
          {hours.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={mStr} onValueChange={setMinute} disabled={disabled}>
        <SelectTrigger className="w-[90px]">
          <SelectValue placeholder="мм" />
        </SelectTrigger>
        <SelectContent className="max-h-[260px]">
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
