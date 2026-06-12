import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, ImageIcon, Save, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBrand } from '@/contexts/BrandContext';
import { getUserFriendlyError } from '@/lib/errorHandler';

const BUCKET = 'pet-photos';
const BRAND_PREFIX = 'branding';

export function BrandingTab() {
  const { brandName, logoUrl, refresh } = useBrand();
  const { toast } = useToast();
  const [name, setName] = useState(brandName);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(brandName);
  }, [brandName]);

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Введите название', variant: 'destructive' });
      return;
    }
    if (trimmed.length > 50) {
      toast({ title: 'Название не должно превышать 50 символов', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveSetting('brand_name', trimmed);
      await refresh();
      toast({ title: 'Название обновлено' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Можно загружать только изображения', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Размер файла не должен превышать 2 МБ', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${BRAND_PREFIX}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await saveSetting('brand_logo_url', pub.publicUrl);
      await refresh();
      toast({ title: 'Логотип обновлён' });
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить логотип', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!logoUrl) return;
    setRemoving(true);
    try {
      // Try to extract storage path from public URL and delete
      const marker = `/object/public/${BUCKET}/`;
      const idx = logoUrl.indexOf(marker);
      if (idx !== -1) {
        const path = logoUrl.substring(idx + marker.length);
        await supabase.storage.from(BUCKET).remove([path]);
      }
      await saveSetting('brand_logo_url', '');
      await refresh();
      toast({ title: 'Логотип удалён' });
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Бренд клиники
        </CardTitle>
        <CardDescription>
          Название и логотип отображаются в шапке, в боковом меню и на странице входа.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="brand-name">Название клиники</Label>
          <div className="flex gap-2">
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Например: VetCRM или ВетКлиника «Барсик»"
            />
            <Button onClick={handleSaveName} disabled={saving || name.trim() === brandName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Логотип</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center overflow-hidden border border-border">
              {logoUrl ? (
                <img src={logoUrl} alt="Логотип" className="w-full h-full object-cover" />
              ) : (
                <Heart className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Загрузка…' : logoUrl ? 'Заменить' : 'Загрузить'}
              </Button>
              {logoUrl && (
                <Button variant="outline" onClick={handleRemove} disabled={removing}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {removing ? 'Удаление…' : 'Удалить'}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Рекомендуется квадратное изображение (PNG/JPG/SVG), до 2 МБ. Лучше всего смотрится 256×256 пикселей.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
