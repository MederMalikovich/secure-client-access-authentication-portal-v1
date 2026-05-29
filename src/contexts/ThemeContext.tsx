import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

type Theme = 'dark' | 'light';

export const CUSTOMIZABLE_TOKENS = [
  { key: 'background', label: 'Фон страницы' },
  { key: 'foreground', label: 'Основной текст' },
  { key: 'card', label: 'Фон карточек' },
  { key: 'card-foreground', label: 'Текст в карточках' },
  { key: 'primary', label: 'Акцентный цвет' },
  { key: 'primary-foreground', label: 'Текст на акценте' },
  { key: 'secondary', label: 'Второстепенный' },
  { key: 'accent', label: 'Подсветка' },
  { key: 'muted', label: 'Приглушённый фон' },
  { key: 'border', label: 'Границы' },
  { key: 'sidebar-background', label: 'Фон боковой панели' },
  { key: 'sidebar-foreground', label: 'Текст боковой панели' },
] as const;

export type CustomColors = Record<string, string>; // token -> "H S% L%"

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  customColors: CustomColors;
  setCustomColor: (token: string, hslString: string) => void;
  resetCustomColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function storageKey(theme: Theme) {
  return `custom-colors:${theme}`;
}

function loadCustomColors(theme: Theme): CustomColors {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(theme));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function applyCustomColors(colors: CustomColors) {
  const root = window.document.documentElement;
  // Remove any previously injected overrides not in current set
  const prev = (root as any).__customColorKeys as string[] | undefined;
  if (prev) prev.forEach(k => root.style.removeProperty(`--${k}`));
  const keys: string[] = [];
  Object.entries(colors).forEach(([k, v]) => {
    if (v) {
      root.style.setProperty(`--${k}`, v);
      keys.push(k);
    }
  });
  (root as any).__customColorKeys = keys;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
    }
    return 'dark';
  });

  const [customColors, setCustomColors] = useState<CustomColors>(() => loadCustomColors(
    (typeof window !== 'undefined' && (localStorage.getItem('theme') as Theme)) || 'dark'
  ));

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    // Reload custom colors for this theme
    const colors = loadCustomColors(theme);
    setCustomColors(colors);
    // Apply after the class change (next frame to ensure base vars are in place)
    requestAnimationFrame(() => applyCustomColors(colors));
  }, [theme]);

  const setCustomColor = useCallback((token: string, hslString: string) => {
    setCustomColors(prev => {
      const next = { ...prev, [token]: hslString };
      localStorage.setItem(storageKey(theme), JSON.stringify(next));
      applyCustomColors(next);
      return next;
    });
  }, [theme]);

  const resetCustomColors = useCallback(() => {
    localStorage.removeItem(storageKey(theme));
    setCustomColors({});
    applyCustomColors({});
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, customColors, setCustomColor, resetCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
