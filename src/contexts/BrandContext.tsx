import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrandContextValue {
  brandName: string;
  logoUrl: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_BRAND = 'VetCRM';

const BrandContext = createContext<BrandContextValue>({
  brandName: DEFAULT_BRAND,
  logoUrl: '',
  loading: true,
  refresh: async () => {},
});

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandName, setBrandName] = useState<string>(DEFAULT_BRAND);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['brand_name', 'brand_logo_url']);
      if (data) {
        for (const row of data) {
          const v = typeof row.value === 'string' ? row.value : (row.value as any);
          if (row.key === 'brand_name' && typeof v === 'string' && v.trim()) {
            setBrandName(v);
          }
          if (row.key === 'brand_logo_url' && typeof v === 'string') {
            setLogoUrl(v);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('brand-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'key=in.(brand_name,brand_logo_url)' },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <BrandContext.Provider value={{ brandName, logoUrl, loading, refresh: load }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);
