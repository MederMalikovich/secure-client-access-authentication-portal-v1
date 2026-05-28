import { useState } from 'react';
import JSZip from 'jszip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const BACKUP_TABLES = [
  'clients', 'pets', 'appointments', 'medical_records', 'medical_record_diagnoses',
  'medical_record_services', 'medical_record_files', 'medical_record_audit',
  'diseases', 'inventory_items', 'inventory_categories', 'inventory_movements',
  'invoices', 'invoice_items', 'payments', 'cash_shifts',
  'prescriptions', 'prescription_doses', 'hospitalizations', 'hospitalization_logs',
  'loyalty_transactions', 'loyalty_settings', 'gift_certificates',
  'client_notification_preferences', 'notifications', 'notification_channel_config',
  'clinic_working_hours', 'feedback', 'profiles',
] as const;

function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}

export function BackupTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const downloadBackup = async () => {
    setLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('vetcrm-backup')!;
      const meta: Record<string, number> = {};

      for (const table of BACKUP_TABLES) {
        setProgress(`Загрузка: ${table}…`);
        const { data, error } = await (supabase as any).from(table).select('*');
        if (error) {
          console.warn(`Пропущена таблица ${table}: доступ запрещён`);
          continue;
        }
        const rows = data || [];
        meta[table] = rows.length;
        folder.file(`${table}.json`, JSON.stringify(rows, null, 2));
        folder.file(`${table}.csv`, toCsv(rows));
      }

      folder.file('_meta.json', JSON.stringify({
        generated_at: new Date().toISOString(),
        rows_per_table: meta,
        version: '1.0',
      }, null, 2));

      setProgress('Упаковка архива…');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vetcrm-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Бэкап готов', description: `Сохранено таблиц: ${Object.keys(meta).length}` });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось создать бэкап', variant: 'destructive' });
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Резервное копирование
        </CardTitle>
        <CardDescription>
          Скачайте полный снимок всех данных клиники в формате ZIP (JSON + CSV для каждой таблицы).
          Файл можно использовать для архива, миграции или восстановления вручную.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={downloadBackup} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {loading ? progress || 'Создание…' : 'Скачать всю базу в ZIP'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Бэкап содержит только таблицы, к которым у вас есть доступ. Файлы из хранилища (фото, документы) не включаются.
        </p>
      </CardContent>
    </Card>
  );
}
