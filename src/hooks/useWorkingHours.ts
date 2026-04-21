import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkingHoursDay {
  day_of_week: number;
  is_working: boolean;
  start_time: string; // 'HH:MM:SS' or 'HH:MM'
  end_time: string;
  slot_duration_minutes: number;
}

export interface WorkingHoursMap {
  [day: number]: WorkingHoursDay;
}

const DAY_LABELS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function dayLabel(day: number): string {
  return DAY_LABELS_RU[day] ?? '';
}

function parseTimeToHourMinutes(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

export function getDaySchedule(map: WorkingHoursMap | null, date: Date): WorkingHoursDay | null {
  if (!map) return null;
  const day = map[date.getDay()];
  if (!day || !day.is_working) return null;
  return day;
}

export function isDayWorking(map: WorkingHoursMap | null, date: Date): boolean {
  return getDaySchedule(map, date) !== null;
}

export function isHourWorking(map: WorkingHoursMap | null, date: Date, hour: number): boolean {
  const day = getDaySchedule(map, date);
  if (!day) return false;
  const start = parseTimeToHourMinutes(day.start_time);
  const end = parseTimeToHourMinutes(day.end_time);
  // hour is the slot start hour; consider working if hour is in [start.hour, end.hour) (end exclusive)
  if (hour < start.hour) return false;
  if (hour >= end.hour) return false;
  return true;
}

/** Generate available slot strings "HH:MM" for a given date based on schedule. */
export function generateDaySlots(map: WorkingHoursMap | null, date: Date): string[] {
  const day = getDaySchedule(map, date);
  if (!day) return [];
  const start = parseTimeToHourMinutes(day.start_time);
  const end = parseTimeToHourMinutes(day.end_time);
  const step = day.slot_duration_minutes || 30;
  const slots: string[] = [];
  let h = start.hour;
  let m = start.minute;
  while (h < end.hour || (h === end.hour && m < end.minute)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += step;
    while (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return slots;
}

export function useWorkingHours() {
  const [map, setMap] = useState<WorkingHoursMap | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clinic_working_hours')
      .select('*')
      .order('day_of_week');
    if (data) {
      const m: WorkingHoursMap = {};
      data.forEach((row: any) => {
        m[row.day_of_week] = row;
      });
      setMap(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { workingHours: map, loading, refetch };
}
