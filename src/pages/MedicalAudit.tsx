import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollText, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  medical_record_id: string;
  pet_id: string | null;
  user_id: string | null;
  user_email: string | null;
  action: 'create' | 'update' | 'delete';
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  created_at: string;
  pet?: { name: string };
}

const actionLabels: Record<string, { label: string; cls: string }> = {
  create: { label: 'Создание', cls: 'bg-green-500/20 text-green-500' },
  update: { label: 'Изменение', cls: 'bg-blue-500/20 text-blue-500' },
  delete: { label: 'Удаление', cls: 'bg-destructive/20 text-destructive' },
};

export default function MedicalAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('medical_record_audit')
        .select('*, pet:pets(name)')
        .order('created_at', { ascending: false })
        .limit(500);
      setEntries((data || []) as any);
      setLoading(false);
    })();
  }, []);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.user_email?.toLowerCase().includes(q) ||
      e.pet?.name?.toLowerCase().includes(q) ||
      e.medical_record_id.toLowerCase().includes(q) ||
      e.changed_fields?.some((f) => f.toLowerCase().includes(q))
    );
  });

  const columns: Column<AuditEntry>[] = [
    { key: 'created_at', header: 'Дата', cell: (e) => format(new Date(e.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru }) },
    { key: 'user_email', header: 'Пользователь', cell: (e) => e.user_email || '—' },
    { key: 'pet', header: 'Питомец', cell: (e) => e.pet?.name || '—' },
    { key: 'action', header: 'Действие', cell: (e) => {
      const a = actionLabels[e.action] || { label: e.action, cls: '' };
      return <Badge className={a.cls}>{a.label}</Badge>;
    }},
    { key: 'changed_fields', header: 'Изменённые поля', cell: (e) =>
      e.changed_fields?.length ? (
        <div className="flex flex-wrap gap-1">
          {e.changed_fields.slice(0, 3).map((f) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
          {e.changed_fields.length > 3 && <Badge variant="outline" className="text-xs">+{e.changed_fields.length - 3}</Badge>}
        </div>
      ) : '—'
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Журнал действий"
        description="История всех изменений медицинских карт — для юридической прозрачности"
        breadcrumbs={[{ label: 'Медкарты', href: '/medical-records' }, { label: 'Журнал' }]}
      />

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Последние 500 событий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по пользователю, питомцу, полю…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DataTable
            data={filtered}
            columns={columns}
            isLoading={loading}
            emptyMessage="Записей нет"
            onRowClick={(e) => setSelected(e)}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали изменения</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Дата:</span> {format(new Date(selected.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}</div>
                <div><span className="text-muted-foreground">Пользователь:</span> {selected.user_email || '—'}</div>
                <div><span className="text-muted-foreground">Действие:</span> {actionLabels[selected.action]?.label}</div>
                <div><span className="text-muted-foreground">Питомец:</span> {selected.pet?.name || '—'}</div>
              </div>
              {selected.changed_fields?.length ? (
                <div>
                  <div className="font-medium mb-2">Изменения по полям:</div>
                  <div className="space-y-2">
                    {selected.changed_fields.map((f) => (
                      <div key={f} className="rounded border p-2">
                        <div className="font-mono text-xs text-primary">{f}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                          <div>
                            <div className="text-muted-foreground">Было:</div>
                            <div className="whitespace-pre-wrap break-all">{JSON.stringify(selected.old_data?.[f] ?? null)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Стало:</div>
                            <div className="whitespace-pre-wrap break-all">{JSON.stringify(selected.new_data?.[f] ?? null)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-2">Снимок данных:</div>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selected.new_data || selected.old_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
