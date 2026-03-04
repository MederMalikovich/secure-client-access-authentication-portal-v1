import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { MessageSquare, Star, MoreVertical, Reply, Check, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Feedback } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  new: 'Новый',
  reviewed: 'На рассмотрении',
  responded: 'Отвечено',
  closed: 'Закрыт',
};

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    rating: '',
    comment: '',
  });

  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [feedbacksRes, clientsRes] = await Promise.all([
        supabase
          .from('feedback')
          .select(`
            *,
            client:clients(id, full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, full_name').order('full_name'),
      ]);

      if (feedbacksRes.error) throw feedbacksRes.error;
      
      setFeedbacks(feedbacksRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.client_id) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Выберите клиента',
      });
      return;
    }

    try {
      const { error } = await supabase.from('feedback').insert({
        client_id: formData.client_id,
        rating: formData.rating ? parseInt(formData.rating) : null,
        comment: formData.comment,
        status: 'new',
      });

      if (error) throw error;
      toast({ title: 'Успешно', description: 'Отзыв добавлен' });
      setDialogOpen(false);
      setFormData({ client_id: '', rating: '', comment: '' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleResponse = async () => {
    if (!selectedFeedback || !responseText) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите текст ответа',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('feedback')
        .update({
          response: responseText,
          status: 'responded',
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;
      toast({ title: 'Успешно', description: 'Ответ отправлен' });
      setResponseDialogOpen(false);
      setResponseText('');
      setSelectedFeedback(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const updateStatus = async (feedback: Feedback, status: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status })
        .eq('id', feedback.id);

      if (error) throw error;
      toast({ title: 'Статус обновлён' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      new: 'destructive',
      reviewed: 'secondary',
      responded: 'default',
      closed: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  // Stats
  const newCount = feedbacks.filter(f => f.status === 'new').length;
  const avgRating = feedbacks.filter(f => f.rating).length > 0
    ? feedbacks.filter(f => f.rating).reduce((sum, f) => sum + f.rating, 0) / feedbacks.filter(f => f.rating).length
    : 0;

  const columns: Column<Feedback>[] = [
    {
      key: 'created_at',
      header: 'Дата',
      cell: (feedback) => (
        <span className="text-muted-foreground">
          {format(new Date(feedback.created_at), 'd MMM yyyy', { locale: ru })}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Клиент',
      cell: (feedback) => (
        <div className="font-medium">
          {(feedback as any).client?.full_name || '—'}
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Оценка',
      cell: (feedback) => renderStars(feedback.rating),
    },
    {
      key: 'comment',
      header: 'Комментарий',
      cell: (feedback) => (
        <span className="text-muted-foreground line-clamp-2">
          {feedback.comment || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (feedback) => getStatusBadge(feedback.status),
    },
    {
      key: 'actions',
      header: '',
      cell: (feedback) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedFeedback(feedback);
              setResponseText(feedback.response || '');
              setResponseDialogOpen(true);
            }}>
              <Reply className="h-4 w-4 mr-2" />
              Ответить
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus(feedback, 'reviewed')}>
              <Check className="h-4 w-4 mr-2" />
              На рассмотрение
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus(feedback, 'closed')}>
              <XCircle className="h-4 w-4 mr-2" />
              Закрыть
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Отзывы клиентов"
        description="Управление отзывами и обратной связью"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Отзывы' },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard
          title="Всего отзывов"
          value={feedbacks.length}
          icon={<MessageSquare className="h-5 w-5" />}
          description="За всё время"
        />
        <StatCard
          title="Новых"
          value={newCount}
          icon={<MessageSquare className="h-5 w-5" />}
          description="Требуют внимания"
        />
        <StatCard
          title="Средняя оценка"
          value={avgRating.toFixed(1)}
          icon={<Star className="h-5 w-5" />}
          description="Из 5.0"
        />
      </div>

      <DataTable
        data={feedbacks}
        columns={columns}
        searchPlaceholder="Поиск..."
        onAdd={() => setDialogOpen(true)}
        addLabel="Добавить отзыв"
        isLoading={loading}
        emptyMessage="Нет отзывов"
      />

      {/* Add Feedback Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Новый отзыв</DialogTitle>
            <DialogDescription>
              Добавьте отзыв клиента вручную
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Клиент *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => setFormData({ ...formData, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Оценка (1-5)</Label>
              <Select
                value={formData.rating}
                onValueChange={(v) => setFormData({ ...formData, rating: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите оценку" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} {rating === 5 ? '⭐⭐⭐⭐⭐' : rating === 4 ? '⭐⭐⭐⭐' : rating === 3 ? '⭐⭐⭐' : rating === 2 ? '⭐⭐' : '⭐'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Комментарий</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Текст отзыва..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Ответ на отзыв</DialogTitle>
            <DialogDescription>
              Клиент: {(selectedFeedback as any)?.client?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <Card className="glass mb-4">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedFeedback.rating)}
                </div>
                <p className="text-sm">{selectedFeedback.comment || 'Без комментария'}</p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-2">
            <Label>Ваш ответ</Label>
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Введите ответ клиенту..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleResponse}>
              <Reply className="h-4 w-4 mr-2" />
              Ответить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
