import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Palette, RotateCcw } from 'lucide-react';
import { useTheme, CUSTOMIZABLE_TOKENS } from '@/contexts/ThemeContext';
import { hexToHslString, hslStringToHex, getCssVar } from '@/lib/colorUtils';

export function ThemeCustomizer() {
  const { theme, customColors, setCustomColor, resetCustomColors } = useTheme();
  const [defaults, setDefaults] = useState<Record<string, string>>({});

  // Capture base defaults from CSS (without overrides) by reading after reset
  useEffect(() => {
    const snapshot: Record<string, string> = {};
    CUSTOMIZABLE_TOKENS.forEach(({ key }) => {
      const cur = customColors[key];
      // Temporarily clear to read the underlying base value
      if (cur) document.documentElement.style.removeProperty(`--${key}`);
      snapshot[key] = getCssVar(`--${key}`);
      if (cur) document.documentElement.style.setProperty(`--${key}`, cur);
    });
    setDefaults(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const getValue = (key: string) => customColors[key] || defaults[key] || '0 0% 0%';

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Кастомизация цветов
            </CardTitle>
            <CardDescription>
              Настройте цвета для текущей темы ({theme === 'dark' ? 'тёмная' : 'светлая'}). Изменения сохраняются автоматически.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetCustomColors}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {CUSTOMIZABLE_TOKENS.map(({ key, label }) => {
            const hsl = getValue(key);
            const hex = hslStringToHex(hsl);
            return (
              <div key={key} className="flex items-center gap-3 p-2 rounded-md border border-border/50">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setCustomColor(key, hexToHslString(e.target.value))}
                  className="h-10 w-12 rounded cursor-pointer bg-transparent border border-border"
                  aria-label={label}
                />
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    value={hex}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                        setCustomColor(key, hexToHslString(v));
                      }
                    }}
                    className="h-7 text-xs font-mono mt-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
