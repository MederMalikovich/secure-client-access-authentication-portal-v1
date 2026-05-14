import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  title: string;
  description: string;
  expectedColumns: string[];
  exampleRow: Record<string, any>;
  onParsed: (rows: any[]) => Promise<{ inserted: number; failed: number }>;
}

export function ExcelImporter({ title, description, expectedColumns, exampleRow, onParsed }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');
    XLSX.writeFile(wb, `${title}-шаблон.xlsx`);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
      if (!rows.length) throw new Error('Файл пустой');
      const r = await onParsed(rows);
      setResult(r);
      toast({ title: 'Импорт завершён', description: `Загружено: ${r.inserted}, ошибок: ${r.failed}` });
    } catch (err: any) {
      toast({ title: 'Ошибка импорта', description: err.message || 'Неверный формат файла', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card className="p-4 mb-4 border-dashed">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" />Шаблон
              </Button>
              <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4 mr-1" />{busy ? 'Загрузка...' : 'Загрузить Excel'}
              </Button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={onFile} />
            </div>
          </div>
          <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Колонки в файле должны называться: <span className="font-mono text-foreground">{expectedColumns.join(' • ')}</span>.
              Первая строка — заголовки. Скачайте шаблон, заполните и загрузите.
            </span>
          </div>
          {result && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>Загружено строк: <strong>{result.inserted}</strong>{result.failed > 0 && <>, ошибок: <strong className="text-destructive">{result.failed}</strong></>}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
