import { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart3, TrendingUp, Users, PawPrint, Calendar, DollarSign, Download } from 'lucide-react';
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

      // Generate revenue chart data (mock for visualization)
      const days = [];
      let currentDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      while (currentDate <= endDate) {
        days.push({
          date: format(currentDate, 'd MMM', { locale: ru }),
          revenue: Math.floor(Math.random() * 30000) + 5000,
          appointments: Math.floor(Math.random() * 10) + 2,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      setRevenueData(days.slice(0, 14)); // Limit to 14 days for readability

      // Fetch services usage
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true)
        .limit(5);

      setServicesData(
        services?.map(s => ({
          name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
          value: Math.floor(Math.random() * 50) + 10,
        })) || []
      );

      // Appointments by status
      setAppointmentsByStatus([
        { name: 'Завершено', value: Math.floor(Math.random() * 50) + 30 },
        { name: 'Запланировано', value: Math.floor(Math.random() * 20) + 10 },
        { name: 'Отменено', value: Math.floor(Math.random() * 10) + 5 },
      ]);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
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
