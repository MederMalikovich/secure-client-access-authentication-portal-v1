import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  is_active: boolean;
}

const empty: Partial<Template> = {
  name: '', description: '', subjective: '', objective: '', assessment: '', plan: '', is_active: true,
};

export function VisitTemplatesManager() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('visit_templates')
      .select('*')
      .order('name', { ascending: true });
    if (error) toast.error('Ошибка загрузки шаблонов');
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error('Укажите название'); return; }
    const payload = {
      name: editing.name.trim(),
      description: editing.description || null,
      subjective: editing.subjective || null,
      objective: editing.objective || null,
      assessment: editing.assessment || null,
      plan: editing.plan || null,
      is_active: editing.is_active ?? true,
    };
    const res = editing.id
      ? await supabase.from('visit_templates').update(payload).eq('id', editing.id)
      : await supabase.from('visit_templates').insert(payload);
    if (res.error) { toast.error('Не удалось сохранить'); return; }
    toast.success('Шаблон сохранён');
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return;
    const { error } = await supabase.from('visit_templates').delete().eq('id', id);
    if (error) { toast.error('Не удалось удалить'); return; }
    toast.success('Шаблон удалён'); load();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Шаблоны визитов</h3>
          <p className="text-sm text-muted-foreground">Готовые SOAP-заготовки для быстрого ввода приёмов</p>
        </div>
        <Button onClick={() => { setEditing({ ...empty }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Новый шаблон
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Шаблонов пока нет</p>
      ) : (
        <div className="grid gap-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30">
              <div className="min-w-0">
                <div className="font-medium truncate">{t.name}</div>
                {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Редактирование шаблона' : 'Новый шаблон визита'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Название *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Например: Первичный приём кошки" />
              </div>
              <div>
                <Label>Описание</Label>
                <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>S — Жалобы (Subjective)</Label>
                <Textarea rows={2} value={editing.subjective || ''} onChange={(e) => setEditing({ ...editing, subjective: e.target.value })} />
              </div>
              <div>
                <Label>O — Осмотр (Objective)</Label>
                <Textarea rows={2} value={editing.objective || ''} onChange={(e) => setEditing({ ...editing, objective: e.target.value })} />
              </div>
              <div>
                <Label>A — Диагноз (Assessment)</Label>
                <Textarea rows={2} value={editing.assessment || ''} onChange={(e) => setEditing({ ...editing, assessment: e.target.value })} />
              </div>
              <div>
                <Label>P — План (Plan)</Label>
                <Textarea rows={2} value={editing.plan || ''} onChange={(e) => setEditing({ ...editing, plan: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
