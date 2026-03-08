import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PawPrint, Calendar, Search } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { appointmentStatusLabels } from '@/lib/types';

interface SearchResult {
  clients: { id: string; full_name: string; phone: string; email?: string | null }[];
  pets: { id: string; name: string; species: string; breed?: string | null; client_name: string }[];
  appointments: { id: string; scheduled_at: string; status: string; client_name: string; pet_name: string; service_name?: string | null }[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ clients: [], pets: [], appointments: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ clients: [], pets: [], appointments: [] });
      return;
    }

    setLoading(true);
    try {
      const pattern = `%${q}%`;

      const [clientsRes, petsRes, appointmentsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name, phone, email')
          .or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5),
        supabase
          .from('pets')
          .select('id, name, species, breed, client:clients(full_name)')
          .or(`name.ilike.${pattern},breed.ilike.${pattern}`)
          .limit(5),
        supabase
          .from('appointments')
          .select('id, scheduled_at, status, client:clients(full_name), pet:pets(name), service:services(name)')
          .or(`notes.ilike.${pattern}`)
          .limit(5),
      ]);

      setResults({
        clients: clientsRes.data || [],
        pets: (petsRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          client_name: p.client?.full_name || '',
        })),
        appointments: (appointmentsRes.data || []).map((a: any) => ({
          id: a.id,
          scheduled_at: a.scheduled_at,
          status: a.status,
          client_name: a.client?.full_name || '',
          pet_name: a.pet?.name || '',
          service_name: a.service?.name,
        })),
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const speciesLabels: Record<string, string> = {
    dog: 'Собака', cat: 'Кошка', bird: 'Птица', rodent: 'Грызун',
    reptile: 'Рептилия', fish: 'Рыба', other: 'Другое',
  };

  const hasResults = results.clients.length > 0 || results.pets.length > 0 || results.appointments.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Поиск клиентов, питомцев, записей..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.length < 2 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Введите минимум 2 символа для поиска
          </div>
        ) : loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Поиск...
          </div>
        ) : !hasResults ? (
          <CommandEmpty>Ничего не найдено</CommandEmpty>
        ) : (
          <>
            {results.clients.length > 0 && (
              <CommandGroup heading="Клиенты">
                {results.clients.map(client => (
                  <CommandItem
                    key={`client-${client.id}`}
                    value={`client-${client.full_name}-${client.phone}`}
                    onSelect={() => handleSelect('/clients')}
                    className="flex items-center gap-3"
                  >
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.phone}{client.email ? ` • ${client.email}` : ''}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.pets.length > 0 && (
              <CommandGroup heading="Питомцы">
                {results.pets.map(pet => (
                  <CommandItem
                    key={`pet-${pet.id}`}
                    value={`pet-${pet.name}-${pet.client_name}`}
                    onSelect={() => handleSelect('/pets')}
                    className="flex items-center gap-3"
                  >
                    <PawPrint className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {pet.name}
                        <span className="ml-2 text-xs text-muted-foreground">{speciesLabels[pet.species] || pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">Владелец: {pet.client_name}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.appointments.length > 0 && (
              <CommandGroup heading="Записи">
                {results.appointments.map(apt => (
                  <CommandItem
                    key={`apt-${apt.id}`}
                    value={`apt-${apt.client_name}-${apt.pet_name}-${apt.scheduled_at}`}
                    onSelect={() => handleSelect('/calendar')}
                    className="flex items-center gap-3"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {apt.client_name} — {apt.pet_name}
                        {apt.service_name && <span className="text-xs text-muted-foreground ml-2">{apt.service_name}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(apt.scheduled_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {appointmentStatusLabels[apt.status as keyof typeof appointmentStatusLabels] || apt.status}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return null; // The GlobalSearch component handles the dialog
}
