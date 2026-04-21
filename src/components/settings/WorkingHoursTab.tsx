import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimePicker } from '@/components/ui/time-picker';
import { dayLabel, useWorkingHours, type WorkingHoursDay } from '@/hooks/useWorkingHours';
import { getUserFriendlyError } from '@/lib/errorHandler';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

export function WorkingHoursTab() {
  const { workingHours, refetch } = useWorkingHours();
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<number, WorkingHoursDay>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workingHours) {
      // normalize to HH:MM only
      const normalized: Record<number, WorkingHoursDay> = {};
      Object.values(workingHours).forEach((d) => {
        normalized[d.day_of_week] = {
          ...d,
          start_time: d.start_time.slice(0, 5),
          end_time: d.end_time.slice(0, 5),
        };
      });
      setRows(normalized);
    }
  }, [workingHours]);

  const updateRow = (day: number, patch: Partial<WorkingHoursDay>) => {
    setRows((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.values(rows).map((r) =>
        supabase
          .from('clinic_working_hours')
          .update({
            is_working: r.is_working,
            start_time: r.start_time,
            end_time: r.end_time,
            slot_duration_minutes: r.slot_duration_minutes,
          })
          .eq('day_of_week', r.day_of_week)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      toast({ title: 'Успешно', description: 'График работы обновлён' });
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(err) });
    } finally {
      setSaving(false);
    }
  };

  if (!workingHours) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          График работы клиники
        </CardTitle>
        <CardDescription>
          Установите рабочие дни и часы. На основе этих настроек строятся доступные слоты для записи в календаре и личном кабинете клиента.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {DAY_ORDER.map((day) => {
            const row = rows[day];
            if (!row) return null;
            return (
              <div
                key={day}
                className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-muted/20 md:flex-row md:items-center md:gap-4"
              >
                <div className="flex items-center justify-between md:w-40">
                  <Label className="font-medium">{dayLabel(day)}</Label>
                  <Switch
                    checked={row.is_working}
                    onCheckedChange={(checked) => updateRow(day, { is_working: checked })}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Открытие</Label>
                    <TimePicker
                      value={row.start_time}
                      onChange={(v) => updateRow(day, { start_time: v })}
                      startHour={0}
                      endHour={23}
                      minuteStep={15}
                      disabled={!row.is_working}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Закрытие</Label>
                    <TimePicker
                      value={row.end_time}
                      onChange={(v) => updateRow(day, { end_time: v })}
                      startHour={0}
                      endHour={23}
                      minuteStep={15}
                      disabled={!row.is_working}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Длительность слота</Label>
                    <Select
                      value={String(row.slot_duration_minutes)}
                      onValueChange={(v) => updateRow(day, { slot_duration_minutes: Number(v) })}
                      disabled={!row.is_working}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 минут</SelectItem>
                        <SelectItem value="20">20 минут</SelectItem>
                        <SelectItem value="30">30 минут</SelectItem>
                        <SelectItem value="45">45 минут</SelectItem>
                        <SelectItem value="60">60 минут</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить график
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
