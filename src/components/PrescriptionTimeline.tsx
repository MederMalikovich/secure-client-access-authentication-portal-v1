import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Pill, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  petId: string;
}

export function PrescriptionTimeline({ petId }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!petId) return;
    void load();
  }, [petId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('prescriptions')
      .select('*, profiles:veterinarian_id(full_name)')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const filtered = items.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !`${p.medication_name} ${p.instructions || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusLabels: Record<string, string> = { active: 'Активно', completed: 'Завершено', cancelled: 'Отменено' };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск препарата..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активно</SelectItem>
            <SelectItem value="completed">Завершено</SelectItem>
            <SelectItem value="cancelled">Отменено</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
      {!loading && filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Назначений пока нет
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="relative pl-6">
            <div className="absolute left-2 top-3 bottom-0 w-px bg-border" />
            <div className={`absolute left-0 top-3 w-4 h-4 rounded-full border-2 border-background ${p.status === 'active' ? 'bg-primary' : p.status === 'cancelled' ? 'bg-destructive' : 'bg-green-500'}`} />
            <Card className="p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill className="h-4 w-4 text-primary" />
                    <span className="font-medium">{p.medication_name}</span>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{statusLabels[p.status] || p.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(p.start_date || p.created_at), 'd MMMM yyyy', { locale: ru })}
                    {p.profiles?.full_name && <span> • {p.profiles.full_name}</span>}
                  </div>
                  <div className="text-sm mt-1">
                    {p.dosage} • {p.route} • {p.frequency_per_day}× в день × {p.duration_days} дн.
                  </div>
                  {p.instructions && <div className="text-xs text-muted-foreground mt-1">{p.instructions}</div>}
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
