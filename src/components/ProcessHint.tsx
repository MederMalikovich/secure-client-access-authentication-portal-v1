import { useState, useEffect } from 'react';
import { Lightbulb, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessHintProps {
  /** Уникальный ключ для запоминания состояния (сворачивание/скрытие) */
  storageKey: string;
  title: string;
  steps: string[];
  className?: string;
  /** Дополнительная заметка под шагами */
  footer?: string;
}

/**
 * Компактная подсказка-инструкция для процессов в системе.
 * Запоминает состояние в localStorage, не перегружает интерфейс.
 */
export function ProcessHint({ storageKey, title, steps, className, footer }: ProcessHintProps) {
  const hideKey = `hint:hide:${storageKey}`;
  const collapseKey = `hint:collapse:${storageKey}`;
  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(hideKey) === '1');
    setCollapsed(localStorage.getItem(collapseKey) === '1');
  }, [hideKey, collapseKey]);

  if (hidden) return null;

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(collapseKey, next ? '1' : '0');
  };

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(hideKey, '1');
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">{title}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleCollapse}
                aria-label={collapsed ? 'Показать' : 'Свернуть'}
              >
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={dismiss}
                aria-label="Скрыть подсказку"
                title="Больше не показывать"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!collapsed && (
            <>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                {steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {footer && <p className="mt-2 text-xs text-muted-foreground">{footer}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
