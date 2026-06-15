import { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, startOfWeek, startOfMonth as sOM } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart3, TrendingUp, Users, PawPrint, Calendar, DollarSign, Download, Stethoscope, Award } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['hsl(173, 80%, 40%)', 'hsl(270, 60%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)'];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    appointments: 0,
    newClients: 0,
    newPets: 0,
    avgCheck: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [doctorRevenue, setDoctorRevenue] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [dateFrom, dateTo]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch invoices for revenue
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, issued_at, status')
        .gte('issued_at', dateFrom)
        .lte('issued_at', dateTo + 'T23:59:59')
        .eq('status', 'paid');

      const revenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      const avgCheck = invoices && invoices.length > 0 ? revenue / invoices.length : 0;

      // Fetch appointments
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', dateFrom)
        .lte('scheduled_at', dateTo + 'T23:59:59');

      // Fetch new clients
      const { count: newClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');

      // Fetch new pets
      const { count: newPetsCount } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');

      setStats({
        revenue,
        appointments: appointmentsCount || 0,
        newClients: newClientsCount || 0,
        newPets: newPetsCount || 0,
        avgCheck,
      });

      // Generate revenue chart data from real invoices
      const revenueByDay: Record<string, { revenue: number; appointments: number }> = {};
      let currentDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      while (currentDate <= endDate) {
        const key = format(currentDate, 'yyyy-MM-dd');
        revenueByDay[key] = { revenue: 0, appointments: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fill revenue per day
      invoices?.forEach((inv) => {
        const day = format(new Date(inv.issued_at), 'yyyy-MM-dd');
        if (revenueByDay[day]) {
          revenueByDay[day].revenue += Number(inv.total);
        }
      });

      // Fill appointments per day
      const { data: appointmentsList } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .gte('scheduled_at', dateFrom)
        .lte('scheduled_at', dateTo + 'T23:59:59');

      appointmentsList?.forEach((apt) => {
        const day = format(new Date(apt.scheduled_at), 'yyyy-MM-dd');
        if (revenueByDay[day]) {
          revenueByDay[day].appointments += 1;
        }
      });

      const chartData = Object.entries(revenueByDay).map(([date, vals]) => ({
        date: format(new Date(date), 'd MMM', { locale: ru }),
        revenue: vals.revenue,
        appointments: vals.appointments,
      }));
      setRevenueData(chartData.length > 31 ? chartData.slice(0, 31) : chartData);

      // Fetch real services usage from visit_services (filter by visit_date)
      const { data: visitServices } = await supabase
        .from('visit_services')
        .select('service_id, quantity, service:services(name), visit:visits!inner(visit_date)')
        .not('service_id', 'is', null)
        .gte('visit.visit_date', dateFrom)
        .lte('visit.visit_date', dateTo + 'T23:59:59');

      // Also count from appointments
      const { data: aptServices } = await supabase
        .from('appointments')
        .select('service_id, service:services(name)')
        .gte('scheduled_at', dateFrom)
        .lte('scheduled_at', dateTo + 'T23:59:59')
        .not('service_id', 'is', null);

      const serviceCounts: Record<string, { name: string; count: number }> = {};
      (visitServices || []).forEach((item: any) => {
        const id = item.service_id;
        const name = item.service?.name || 'Неизвестно';
        if (!serviceCounts[id]) serviceCounts[id] = { name, count: 0 };
        serviceCounts[id].count += Number(item.quantity) || 1;
      });
      (aptServices || []).forEach((item: any) => {
        const id = item.service_id;
        const name = item.service?.name || 'Неизвестно';
        if (!serviceCounts[id]) serviceCounts[id] = { name, count: 0 };
        serviceCounts[id].count += 1;
      });

      const sortedServices = Object.values(serviceCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(s => ({
          name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
          value: s.count,
        }));
      setServicesData(sortedServices);

      // Real appointments by status
      const { data: statusData } = await supabase
        .from('appointments')
        .select('status')
        .gte('scheduled_at', dateFrom)
        .lte('scheduled_at', dateTo + 'T23:59:59');

      const statusCounts: Record<string, number> = {};
      const statusLabels: Record<string, string> = {
        scheduled: 'Запланировано',
        confirmed: 'Подтверждено',
        in_progress: 'В процессе',
        completed: 'Завершено',
        cancelled: 'Отменено',
        no_show: 'Неявка',
      };
      statusData?.forEach((a) => {
        const label = statusLabels[a.status] || a.status;
        statusCounts[label] = (statusCounts[label] || 0) + 1;
      });
      setAppointmentsByStatus(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('kk-KZ', {
      style: 'currency',
      currency: 'KZT',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      <PageHeader
        title="Отчёты и аналитика"
        description="Анализ показателей клиники"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Отчёты' },
        ]}
        actions={
          <Button variant="outline" onClick={async () => {
            const XLSX = await import('xlsx');
            const { data: invoices } = await supabase.from('invoices')
              .select('invoice_number, issued_at, total, status, client:clients(full_name)')
              .gte('issued_at', dateFrom).lte('issued_at', dateTo + 'T23:59:59');
            const { data: appointments } = await supabase.from('appointments')
              .select('scheduled_at, status, client:clients(full_name), pet:pets(name), service:services(name)')
              .gte('scheduled_at', dateFrom).lte('scheduled_at', dateTo + 'T23:59:59');
            const wb = XLSX.utils.book_new();
            const summary = [
              ['Период', `${dateFrom} — ${dateTo}`],
              ['Выручка (₸)', stats.revenue],
              ['Приёмы', stats.appointments],
              ['Новые клиенты', stats.newClients],
              ['Новые питомцы', stats.newPets],
              ['Средний чек (₸)', Math.round(stats.avgCheck)],
            ];
            const wsSum = XLSX.utils.aoa_to_sheet(summary);
            wsSum['!cols'] = [{ wch: 25 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, wsSum, 'Сводка');
            const wsInv = XLSX.utils.json_to_sheet((invoices || []).map((i: any) => ({
              '№ счёта': i.invoice_number, 'Дата': format(new Date(i.issued_at), 'dd.MM.yyyy'),
              'Клиент': i.client?.full_name || '', 'Сумма (₸)': Number(i.total), 'Статус': i.status,
            })));
            wsInv['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsInv, 'Счета');
            const wsApt = XLSX.utils.json_to_sheet((appointments || []).map((a: any) => ({
              'Дата': format(new Date(a.scheduled_at), 'dd.MM.yyyy HH:mm'),
              'Клиент': a.client?.full_name || '', 'Питомец': a.pet?.name || '',
              'Услуга': a.service?.name || '', 'Статус': a.status,
            })));
            wsApt['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsApt, 'Приёмы');
            XLSX.writeFile(wb, `отчёт_${dateFrom}_${dateTo}.xlsx`);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт в Excel
          </Button>
        }
      />

      {/* Date Filter */}
      <Card className="glass mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <Label>Период с</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>по</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                  setDateTo(format(new Date(), 'yyyy-MM-dd'));
                }}
              >
                7 дней
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                  setDateTo(format(new Date(), 'yyyy-MM-dd'));
                }}
              >
                30 дней
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                  setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                }}
              >
                Этот месяц
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Выручка</p>
                <p className="text-xl font-bold">{formatCurrency(stats.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Приёмы</p>
                <p className="text-xl font-bold">{stats.appointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Новые клиенты</p>
                <p className="text-xl font-bold">{stats.newClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <PawPrint className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Новые питомцы</p>
                <p className="text-xl font-bold">{stats.newPets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Средний чек</p>
                <p className="text-xl font-bold">{formatCurrency(stats.avgCheck)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Revenue Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Динамика выручки
            </CardTitle>
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
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              Количество приёмов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="appointments"
                  fill="hsl(var(--secondary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Services */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Популярные услуги
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Status */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              Статусы приёмов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {appointmentsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
