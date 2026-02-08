import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PawPrint, Calendar, DollarSign, Plus, TrendingUp, Clock, FileText, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats, appointmentStatusLabels } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
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
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPets: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch pets count
      const { count: petsCount } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });

      // Fetch today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appointments, count: appointmentsCount } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(full_name),
          pet:pets(name),
          service:services(name)
        `, { count: 'exact' })
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .order('scheduled_at', { ascending: true });

      // Fetch monthly revenue
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total')
        .gte('issued_at', monthStart.toISOString())
        .eq('status', 'paid');

      const monthlyRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;

      setStats({
        totalClients: clientsCount || 0,
        totalPets: petsCount || 0,
        todayAppointments: appointmentsCount || 0,
        monthlyRevenue,
      });

      setTodayAppointments(appointments || []);

      // Generate mock revenue data for chart
      const mockRevenueData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockRevenueData.push({
          date: format(date, 'dd MMM', { locale: ru }),
          revenue: Math.floor(Math.random() * 50000) + 10000,
          appointments: Math.floor(Math.random() * 15) + 5,
        });
      }
      setRevenueData(mockRevenueData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Currency formatting is now imported from @/lib/currency

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Дашборд"
        description="Обзор ключевых показателей клиники"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/clients/new')}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Клиент</span>
              <span className="sm:hidden">+</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/pets/new')}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Питомец</span>
              <span className="sm:hidden">+</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/medical-records')}>
              <FileText className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Медкарта</span>
              <span className="sm:hidden">+</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/finances')}>
              <Receipt className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Счёт</span>
              <span className="sm:hidden">+</span>
            </Button>
            <Button size="sm" className="text-xs md:text-sm" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Новая запись</span>
              <span className="sm:hidden">Запись</span>
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Клиенты"
          value={stats.totalClients}
          icon={<Users className="h-4 w-4 md:h-5 md:w-5" />}
          description="Всего в базе"
        />
        <StatCard
          title="Питомцы"
          value={stats.totalPets}
          icon={<PawPrint className="h-4 w-4 md:h-5 md:w-5" />}
          description="Всего в базе"
        />
        <StatCard
          title="Приёмы сегодня"
          value={stats.todayAppointments}
          icon={<Calendar className="h-4 w-4 md:h-5 md:w-5" />}
          description={format(new Date(), 'd MMMM', { locale: ru })}
        />
        <StatCard
          title="Выручка за месяц"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<DollarSign className="h-4 w-4 md:h-5 md:w-5" />}
          description={format(new Date(), 'LLLL yyyy', { locale: ru })}
        />
      </div>

      {/* Charts and Appointments */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Выручка за неделю
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
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
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

        {/* Today's Appointments */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Приёмы сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Нет запланированных приёмов
              </p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/calendar`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {format(new Date(apt.scheduled_at), 'HH:mm')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                        {appointmentStatusLabels[apt.status as keyof typeof appointmentStatusLabels]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {apt.client?.full_name} - {apt.pet?.name}
                    </p>
                    {apt.service?.name && (
                      <p className="text-xs text-muted-foreground">
                        {apt.service.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Приёмы за неделю
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
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
  );
}
