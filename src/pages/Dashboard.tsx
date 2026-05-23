import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PawPrint, Calendar, DollarSign, Plus, TrendingUp, Clock, FileText, Receipt, Trophy, Bell, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats, appointmentStatusLabels } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';

type PeriodPreset = '1d' | '7d' | '30d' | '365d' | 'custom';
const presetLabels: Record<Exclude<PeriodPreset, 'custom'>, string> = {
  '1d': '1 день',
  '7d': 'Неделя',
  '30d': '30 дней',
  '365d': 'Год',
};

function getDateRange(preset: PeriodPreset, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(new Date());
  if (preset === 'custom' && customFrom) {
    return { from: startOfDay(new Date(customFrom)), to };
  }
  const days = preset === '1d' ? 1 : preset === '7d' ? 7 : preset === '30d' ? 30 : 365;
  return { from: startOfDay(subDays(new Date(), days - 1)), to };
}

function PeriodSelector({ value, onChange, customFrom, customTo, onCustomFromChange, onCustomToChange, showYear = false }: {
  value: PeriodPreset;
  onChange: (v: PeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  showYear?: boolean;
}) {
  const keys = showYear ? ['1d', '7d', '30d', '365d'] : ['1d', '7d', '30d'];
  return (
    <div className="flex min-w-0 flex-wrap gap-1 items-center">
      {(keys as Exclude<PeriodPreset, 'custom'>[]).map(k => (
        <Button key={k} variant={value === k ? 'default' : 'outline'} size="sm" onClick={() => onChange(k)}>
          {presetLabels[k]}
        </Button>
      ))}
      <Button variant={value === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => onChange('custom')}>
        С—По
      </Button>
      {value === 'custom' && (
        <div className="flex min-w-0 flex-wrap gap-1 items-center ml-1">
          <Input type="date" className="h-8 w-[8.5rem] text-xs" value={customFrom} onChange={e => onCustomFromChange(e.target.value)} />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" className="h-8 w-[8.5rem] text-xs" value={customTo} onChange={e => onCustomToChange(e.target.value)} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({ totalClients: 0, totalPets: 0, todayAppointments: 0, monthlyRevenue: 0 });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [topDoctors, setTopDoctors] = useState<{ name: string; count: number }[]>([]);
  const [upcomingNotifs, setUpcomingNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Revenue period
  const [revPeriod, setRevPeriod] = useState<PeriodPreset>('7d');
  const [revFrom, setRevFrom] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [revTo, setRevTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [revenueData, setRevenueData] = useState<any[]>([]);

  // Appointments period
  const [aptPeriod, setAptPeriod] = useState<PeriodPreset>('7d');
  const [aptFrom, setAptFrom] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [aptTo, setAptTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchRevenueChart(); }, [revPeriod, revFrom, revTo]);
  useEffect(() => { fetchAppointmentsChart(); }, [aptPeriod, aptFrom, aptTo]);

  const fetchStats = async () => {
    try {
      const [clientsRes, petsRes] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('pets').select('*', { count: 'exact', head: true }),
      ]);

      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);

      const { data: appointments, count: appointmentsCount } = await supabase
        .from('appointments')
        .select(`*, client:clients(full_name), pet:pets(name), service:services(name)`, { count: 'exact' })
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .order('scheduled_at', { ascending: true });

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const { data: invoices } = await supabase.from('invoices').select('total').gte('issued_at', monthStart.toISOString()).eq('status', 'paid');
      const monthlyRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;

      setStats({ totalClients: clientsRes.count || 0, totalPets: petsRes.count || 0, todayAppointments: appointmentsCount || 0, monthlyRevenue });
      setTodayAppointments(appointments || []);

      // Top 5 doctors (30 days)
      const monthAgo = subDays(new Date(), 30);
      const { data: doctorApts } = await supabase
        .from('appointments')
        .select('veterinarian_id, veterinarian:profiles(full_name)')
        .gte('scheduled_at', monthAgo.toISOString())
        .not('veterinarian_id', 'is', null);

      const doctorCounts: Record<string, { name: string; count: number }> = {};
      (doctorApts || []).forEach((apt: any) => {
        const id = apt.veterinarian_id;
        const name = apt.veterinarian?.full_name || 'Неизвестно';
        if (!doctorCounts[id]) doctorCounts[id] = { name, count: 0 };
        doctorCounts[id].count += 1;
      });
      setTopDoctors(Object.values(doctorCounts).sort((a, b) => b.count - a.count).slice(0, 5));

      // Upcoming notifications (due tomorrow = scheduled_for between tomorrow start and end)
      const tomorrowStart = startOfDay(addDays(new Date(), 1));
      const tomorrowEnd = endOfDay(addDays(new Date(), 1));
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*, client:clients(full_name)')
        .eq('type', 'pet_reminder')
        .gte('scheduled_for', tomorrowStart.toISOString())
        .lte('scheduled_for', tomorrowEnd.toISOString())
        .order('scheduled_for');
      setUpcomingNotifs(notifs || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueChart = async () => {
    const { from, to } = getDateRange(revPeriod, revFrom, revTo);
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, issued_at')
        .gte('issued_at', from.toISOString())
        .lte('issued_at', to.toISOString())
        .eq('status', 'paid');

      const dayCount = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      const chartData = [];
      for (let i = 0; i < dayCount; i++) {
        const date = addDays(from, i);
        const dayStr = format(date, 'yyyy-MM-dd');
        const dayRev = (invoices || [])
          .filter(inv => format(new Date(inv.issued_at), 'yyyy-MM-dd') === dayStr)
          .reduce((sum, inv) => sum + Number(inv.total), 0);
        chartData.push({
          date: dayCount > 60 ? format(date, 'dd.MM', { locale: ru }) : format(date, 'dd MMM', { locale: ru }),
          revenue: dayRev,
        });
      }
      setRevenueData(chartData);
    } catch (e) {
    }
  };

  const fetchAppointmentsChart = async () => {
    const { from, to } = getDateRange(aptPeriod, aptFrom, aptTo);
    try {
      const { data: apts } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .gte('scheduled_at', from.toISOString())
        .lte('scheduled_at', to.toISOString());

      const dayCount = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      const chartData = [];
      for (let i = 0; i < dayCount; i++) {
        const date = addDays(from, i);
        const dayStr = format(date, 'yyyy-MM-dd');
        const count = (apts || []).filter(a => format(new Date(a.scheduled_at), 'yyyy-MM-dd') === dayStr).length;
        chartData.push({
          date: dayCount > 60 ? format(date, 'dd.MM', { locale: ru }) : format(date, 'dd MMM', { locale: ru }),
          appointments: count,
        });
      }
      setAppointmentsData(chartData);
    } catch (e) {
    }
  };

  const extractNotifTitle = (raw: string) => raw.replace(/^\[.*?\]\s*/, '');

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Дашборд"
        description="Обзор ключевых показателей клиники"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/clients', { state: { openNew: true } })}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Клиент</span><span className="sm:hidden">+</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/pets', { state: { openNew: true } })}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Питомец</span><span className="sm:hidden">+</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/medical-records')}>
              <FileText className="h-4 w-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Медкарта</span><span className="sm:hidden">+</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/finances')}>
              <Receipt className="h-4 w-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Счёт</span><span className="sm:hidden">+</span>
            </Button>
            <Button size="sm" className="text-xs md:text-sm" onClick={() => navigate('/flowboard', { state: { openNew: true } })}>
              <Stethoscope className="h-4 w-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Новый визит</span><span className="sm:hidden">Визит</span>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid min-w-0 grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard title="Клиенты" value={stats.totalClients} icon={<Users className="h-4 w-4 md:h-5 md:w-5" />} description="Всего в базе" />
        <StatCard title="Питомцы" value={stats.totalPets} icon={<PawPrint className="h-4 w-4 md:h-5 md:w-5" />} description="Всего в базе" />
        <StatCard title="Приёмы сегодня" value={stats.todayAppointments} icon={<Calendar className="h-4 w-4 md:h-5 md:w-5" />} description={format(new Date(), 'd MMMM', { locale: ru })} />
        <StatCard title="Выручка за месяц" value={formatCurrency(stats.monthlyRevenue)} icon={<DollarSign className="h-4 w-4 md:h-5 md:w-5" />} description={format(new Date(), 'LLLL yyyy', { locale: ru })} />
      </div>

      {/* Upcoming Notifications */}
      {upcomingNotifs.length > 0 && (
        <Card className="glass border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Напоминания на завтра
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingNotifs.map(n => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{extractNotifTitle(n.title)}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  {n.client?.full_name && (
                    <Badge variant="outline">{n.client.full_name}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue & Today's Appointments */}
      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="glass min-w-0 lg:col-span-2">
          <CardHeader>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex min-w-0 items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Выручка
              </CardTitle>
              <PeriodSelector
                value={revPeriod}
                onChange={setRevPeriod}
                customFrom={revFrom}
                customTo={revTo}
                onCustomFromChange={setRevFrom}
                onCustomToChange={setRevTo}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="glass min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Приёмы сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Нет запланированных приёмов</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/calendar')}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{format(new Date(apt.scheduled_at), 'HH:mm')}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                        {appointmentStatusLabels[apt.status as keyof typeof appointmentStatusLabels]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{apt.client?.full_name} - {apt.pet?.name}</p>
                    {apt.service?.name && <p className="text-xs text-muted-foreground">{apt.service.name}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments Chart */}
      <Card className="glass min-w-0">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Приёмы
            </CardTitle>
            <PeriodSelector
              value={aptPeriod}
              onChange={setAptPeriod}
              customFrom={aptFrom}
              customTo={aptTo}
              onCustomFromChange={setAptFrom}
              onCustomToChange={setAptTo}
              showYear
            />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={appointmentsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [value, 'Приёмы']} />
              <Bar dataKey="appointments" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 5 Doctors */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Топ 5 загруженных врачей (30 дней)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDoctors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {topDoctors.map((doc, index) => (
                <div key={`${doc.name}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">{index + 1}</span>
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <Badge variant="secondary">{doc.count} приёмов</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
