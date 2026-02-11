import { useEffect, useState } from 'react';
import { UserCheck, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

type PeriodKey = '7d' | '30d' | '90d' | '365d';

const periodLabels: Record<PeriodKey, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  '90d': '90 дней',
  '365d': 'Год',
};

export default function Doctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [topDoctors, setTopDoctors] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('30d');

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchTopDoctors();
  }, [period]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopDoctors = async () => {
    const days = parseInt(period);
    const dateFrom = subDays(new Date(), days).toISOString();
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('veterinarian_id, veterinarian:profiles(full_name)')
        .gte('scheduled_at', dateFrom)
        .not('veterinarian_id', 'is', null);
      if (error) throw error;

      const counts: Record<string, { name: string; count: number }> = {};
      (data || []).forEach((apt: any) => {
        const id = apt.veterinarian_id;
        const name = apt.veterinarian?.full_name || 'Неизвестно';
        if (!counts[id]) counts[id] = { name, count: 0 };
        counts[id].count += 1;
      });
      setTopDoctors(
        Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Error fetching top doctors:', error);
    }
  };

  // Group by position/specialty
  const grouped = doctors.reduce<Record<string, any[]>>((acc, doc) => {
    const key = doc.position || 'Без специальности';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Врачи"
        description="Специалисты клиники и загруженность"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Врачи' },
        ]}
      />

      {/* Top 5 busiest doctors */}
      <Card className="glass mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Топ 5 загруженных врачей
            </CardTitle>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
                <Button
                  key={key}
                  variant={period === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(key)}
                >
                  {periodLabels[key]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topDoctors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет данных за выбранный период</p>
          ) : (
            <div className="space-y-3">
              {topDoctors.map((doc, index) => (
                <div key={doc.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <Badge variant="secondary">{doc.count} приёмов</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctors by specialty */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Загрузка...</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([specialty, docs]) => (
            <Card key={specialty} className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  {specialty}
                  <Badge variant="outline" className="ml-2">{docs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {docs.map((doc: any) => (
                    <div key={doc.id} className="p-4 rounded-lg bg-muted/30 space-y-1">
                      <p className="font-semibold">{doc.full_name}</p>
                      {doc.email && <p className="text-sm text-muted-foreground">{doc.email}</p>}
                      {doc.phone && <p className="text-sm text-muted-foreground">{doc.phone}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
