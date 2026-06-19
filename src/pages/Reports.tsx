import { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, startOfWeek, startOfMonth as sOM, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart3, TrendingUp, Users, PawPrint, Calendar, DollarSign, Download, Stethoscope, Award, Package, Activity, HeartHandshake } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClientsAtRisk } from '@/components/ClientsAtRisk';
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
  ComposedChart,
  Line,
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
    otherRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [doctorRevenue, setDoctorRevenue] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topDiseases, setTopDiseases] = useState<any[]>([]);
  const [petGrowthData, setPetGrowthData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [dateFrom, dateTo]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const fromIso = dateFrom;
      const toIso = dateTo + 'T23:59:59';

      // === Единый источник правды: визиты по visit_date + связанные оплаченные счета ===
      const { data: visitsRaw } = await supabase
        .from('visits')
        .select('id, visit_date, status, veterinarian_id, client_id, invoices(total, status, client_id)')
        .gte('visit_date', fromIso)
        .lte('visit_date', toIso);

      const visits = visitsRaw || [];

      // Выручка по визитам (только оплаченные счета, привязанные к визиту в периоде)
      let visitRevenue = 0;
      let paidCount = 0;
      visits.forEach((v: any) => {
        (v.invoices || []).forEach((inv: any) => {
          if (inv.status === 'paid') {
            visitRevenue += Number(inv.total) || 0;
            paidCount += 1;
          }
        });
      });

      // Прочая выручка: оплаченные счета без visit_id (магазин/стационар) — issued_at в периоде
      const { data: otherInv } = await supabase
        .from('invoices')
        .select('total')
        .is('visit_id', null)
        .eq('status', 'paid')
        .gte('issued_at', fromIso)
        .lte('issued_at', toIso);
      const otherRevenue = (otherInv || []).reduce((s, i: any) => s + Number(i.total || 0), 0);

      // Новые клиенты / питомцы
      const [{ count: newClientsCount }, { count: newPetsCount }, { data: petsRaw }] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true })
          .gte('created_at', fromIso).lte('created_at', toIso),
        supabase.from('pets').select('*', { count: 'exact', head: true })
          .gte('created_at', fromIso).lte('created_at', toIso),
        supabase.from('pets').select('id, created_at').order('created_at', { ascending: true }),
      ]);

      const totalRevenue = visitRevenue + otherRevenue;
      setStats({
        revenue: totalRevenue,
        appointments: visits.length,
        newClients: newClientsCount || 0,
        newPets: newPetsCount || 0,
        avgCheck: paidCount > 0 ? visitRevenue / paidCount : 0,
        otherRevenue,
      });

      // === Бакеты для графика — строго по visit_date, и выручка и количество ===
      const rangeDays = Math.max(1, differenceInDays(new Date(dateTo), new Date(dateFrom)) + 1);
      type Bucket = 'day' | 'week' | 'month';
      const bucket: Bucket = rangeDays <= 31 ? 'day' : rangeDays <= 120 ? 'week' : 'month';
      const bucketKey = (d: Date): string => {
        if (bucket === 'day') return format(d, 'yyyy-MM-dd');
        if (bucket === 'week') return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        return format(sOM(d), 'yyyy-MM');
      };
      const bucketLabel = (key: string): string => {
        if (bucket === 'month') {
          const [y, m] = key.split('-');
          return format(new Date(Number(y), Number(m) - 1, 1), 'LLL yyyy', { locale: ru });
        }
        return format(new Date(key), 'd MMM', { locale: ru });
      };

      const buckets: Record<string, { revenue: number; appointments: number }> = {};
      const cursor = new Date(dateFrom);
      const endD = new Date(dateTo);
      while (cursor <= endD) {
        const k = bucketKey(cursor);
        if (!buckets[k]) buckets[k] = { revenue: 0, appointments: 0 };
        cursor.setDate(cursor.getDate() + 1);
      }

      visits.forEach((v: any) => {
        const k = bucketKey(new Date(v.visit_date));
        if (!buckets[k]) buckets[k] = { revenue: 0, appointments: 0 };
        buckets[k].appointments += 1;
        (v.invoices || []).forEach((inv: any) => {
          if (inv.status === 'paid') buckets[k].revenue += Number(inv.total) || 0;
        });
      });

      const chartData = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, vals]) => ({
          date: bucketLabel(key),
          revenue: vals.revenue,
          appointments: vals.appointments,
        }));
      setRevenueData(chartData);

      // === Динамика количества питомцев (новые + накопленный итог) ===
      const pets = petsRaw || [];
      const allPetsUpToDate = pets.filter((p: any) => new Date(p.created_at) <= endD);
      const petBuckets: Record<string, { newPets: number; totalPets: number }> = {};
      const petCursor = new Date(dateFrom);
      while (petCursor <= endD) {
        const k = bucketKey(petCursor);
        if (!petBuckets[k]) petBuckets[k] = { newPets: 0, totalPets: 0 };
        petCursor.setDate(petCursor.getDate() + 1);
      }
      pets.forEach((p: any) => {
        const d = new Date(p.created_at);
        const k = bucketKey(d);
        if (petBuckets[k]) petBuckets[k].newPets += 1;
      });
      let runningTotal = 0;
      const petChartData = Object.entries(petBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, vals]) => {
          runningTotal += vals.newPets;
          return {
            date: bucketLabel(key),
            newPets: vals.newPets,
            totalPets: runningTotal,
          };
        });
      setPetGrowthData(petChartData);

      // === Популярные услуги (visit_services по visit_date) ===
      const { data: visitServices } = await supabase
        .from('visit_services')
        .select('service_id, quantity, service:services(name), visit:visits!inner(visit_date)')
        .not('service_id', 'is', null)
        .gte('visit.visit_date', fromIso)
        .lte('visit.visit_date', toIso);

      const serviceCounts: Record<string, { name: string; count: number }> = {};
      (visitServices || []).forEach((item: any) => {
        const id = item.service_id;
        const name = item.service?.name || 'Неизвестно';
        if (!serviceCounts[id]) serviceCounts[id] = { name, count: 0 };
        serviceCounts[id].count += Number(item.quantity) || 1;
      });

      const sortedServices = Object.values(serviceCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(s => ({
          name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
          value: s.count,
        }));
      setServicesData(sortedServices);

      // === Статусы визитов (из тех же visits) ===
      const statusCounts: Record<string, number> = {};
      const statusLabels: Record<string, string> = {
        waiting: 'Ожидание',
        in_consultation: 'На приёме',
        procedures: 'Процедуры',
        hospital: 'Стационар',
        completed: 'Завершён',
        cancelled: 'Отменён',
      };
      visits.forEach((v: any) => {
        const label = statusLabels[v.status] || v.status;
        statusCounts[label] = (statusCounts[label] || 0) + 1;
      });
      setAppointmentsByStatus(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

      // === Топ клиентов по выручке (через визиты в периоде) ===
      const clientIds = Array.from(new Set(visits.map((v: any) => v.client_id).filter(Boolean)));
      const clientNameMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: cs } = await supabase.from('clients').select('id, full_name').in('id', clientIds);
        (cs || []).forEach((c: any) => { clientNameMap[c.id] = c.full_name; });
      }
      const clientTotals: Record<string, { name: string; total: number }> = {};
      visits.forEach((v: any) => {
        const id = v.client_id || 'unknown';
        const name = clientNameMap[id] || 'Без клиента';
        (v.invoices || []).forEach((inv: any) => {
          if (inv.status !== 'paid') return;
          if (!clientTotals[id]) clientTotals[id] = { name, total: 0 };
          clientTotals[id].total += Number(inv.total) || 0;
        });
      });
      setTopClients(
        Object.values(clientTotals)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
          .map(c => ({
            name: c.name.length > 22 ? c.name.substring(0, 22) + '…' : c.name,
            total: Math.round(c.total),
          }))
      );

      // === Выручка по врачам (по visit_date) ===
      const { data: vetList } = await supabase.rpc('list_public_veterinarians');
      const vetName: Record<string, string> = {};
      ((vetList as any[]) || []).forEach((v) => { vetName[v.id] = v.full_name; });
      const docTotals: Record<string, { name: string; total: number; visits: number }> = {};
      visits.forEach((v: any) => {
        if (!v.veterinarian_id) return;
        const id = v.veterinarian_id;
        const name = vetName[id] || 'Врач';
        if (!docTotals[id]) docTotals[id] = { name, total: 0, visits: 0 };
        docTotals[id].visits += 1;
        (v.invoices || []).forEach((inv: any) => {
          if (inv.status === 'paid') docTotals[id].total += Number(inv.total) || 0;
        });
      });
      setDoctorRevenue(
        Object.values(docTotals)
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
          .map(d => ({
            name: d.name.length > 22 ? d.name.substring(0, 22) + '…' : d.name,
            total: Math.round(d.total),
            visits: d.visits,
          }))
      );

      // === Популярные товары (продажи в периоде) ===
      const { data: saleItems } = await supabase
        .from('shop_sale_items')
        .select('quantity, total, item_id, item:inventory_items(name), sale:shop_sales!inner(created_at)')
        .gte('sale.created_at', fromIso)
        .lte('sale.created_at', toIso);
      const prodTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
      (saleItems || []).forEach((it: any) => {
        const id = it.item_id || 'unknown';
        const name = it.item?.name || 'Товар';
        if (!prodTotals[id]) prodTotals[id] = { name, qty: 0, revenue: 0 };
        prodTotals[id].qty += Number(it.quantity) || 0;
        prodTotals[id].revenue += Number(it.total) || 0;
      });
      setTopProducts(
        Object.values(prodTotals)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
          .map(p => ({
            name: p.name.length > 22 ? p.name.substring(0, 22) + '…' : p.name,
            qty: p.qty,
            revenue: Math.round(p.revenue),
          }))
      );

      // === Распространённые заболевания ===
      const { data: diagRows } = await supabase
        .from('medical_record_diagnoses')
        .select('disease_id, custom_diagnosis, disease:diseases(name), created_at')
        .gte('created_at', fromIso)
        .lte('created_at', toIso);
      const diseaseCounts: Record<string, number> = {};
      (diagRows || []).forEach((d: any) => {
        const name = d.disease?.name || (d.custom_diagnosis ? d.custom_diagnosis : null);
        if (!name) return;
        const key = name.trim();
        if (!key) return;
        diseaseCounts[key] = (diseaseCounts[key] || 0) + 1;
      });
      setTopDiseases(
        Object.entries(diseaseCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, count]) => ({
            name: name.length > 28 ? name.substring(0, 28) + '…' : name,
            count,
          }))
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Финансы и операции</TabsTrigger>
          <TabsTrigger value="retention"><HeartHandshake className="h-4 w-4 mr-1" />Удержание клиентов</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom('2026-01-01');
                  setDateTo(format(new Date(), 'yyyy-MM-dd'));
                }}
              >
                Всё время
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        <StatCard
          title="Выручка"
          value={formatCurrency(stats.revenue)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          title="Приёмы"
          value={stats.appointments}
          icon={<Calendar className="h-5 w-5" />}
          accent="cyan"
        />
        <StatCard
          title="Новые клиенты"
          value={stats.newClients}
          icon={<Users className="h-5 w-5" />}
          accent="purple"
        />
        <StatCard
          title="Новые питомцы"
          value={stats.newPets}
          icon={<PawPrint className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          title="Средний чек"
          value={formatCurrency(stats.avgCheck)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="rose"
        />
      </div>

      {/* Stat for non-visit revenue */}
      {stats.otherRevenue > 0 && (
        <div className="text-xs text-muted-foreground mb-4 -mt-2">
          В выручку включены {formatCurrency(stats.otherRevenue)} прочих оплат (магазин/стационар без визита, по дате счёта).
        </div>
      )}

      {/* Combined Chart */}
      <div className="grid gap-6 mb-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Выручка и приёмы
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Все данные сгруппированы по <b>дате визита</b>. Выручка — сумма оплаченных счетов, привязанных к визитам периода.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--primary))"
                  fontSize={12}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--secondary))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'Выручка' ? [formatCurrency(value), name] : [value, name]
                  }
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Выручка"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="appointments"
                  name="Приёмы"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pet Growth Chart */}
      <div className="grid gap-6 mb-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-yellow-500" />
              Динамика количества питомцев
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Новые регистрации и накопленный итог питомцев за период.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={petGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--warning))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--primary))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="newPets"
                  name="Новые питомцы"
                  fill="hsl(var(--warning))"
                  radius={[4, 4, 0, 0]}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalPets"
                  name="Всего питомцев (накоп.)"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </ComposedChart>
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

      {/* Owner-focused reports */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Top Clients by Revenue */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Топ-5 клиентов по выручке
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Нет оплаченных счетов за период</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={140} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [formatCurrency(v), 'Выручка']}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Doctor */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-secondary" />
              Выручка по врачам
            </CardTitle>
          </CardHeader>
          <CardContent>
            {doctorRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Нет данных по врачам за период</p>
            ) : (
              <div className="space-y-2">
                {doctorRevenue.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.visits} визит(ов)</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary shrink-0">{formatCurrency(d.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional reports: products & diseases */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Популярные товары
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Нет продаж за период</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.qty} шт.</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary shrink-0">{formatCurrency(p.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Распространённые заболевания
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDiseases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Нет поставленных диагнозов за период</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topDiseases} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={160} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [v, 'Случаев']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="retention">
          <ClientsAtRisk />
        </TabsContent>
      </Tabs>
    </div>
  );
}
