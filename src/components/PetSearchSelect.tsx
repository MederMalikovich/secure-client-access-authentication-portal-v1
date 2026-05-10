import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface PetOption {
  id: string;
  name: string;
  species?: string;
  client_id?: string;
  clients?: { full_name?: string } | null;
  client?: { full_name?: string } | null;
}

interface PetSearchSelectProps {
  pets: PetOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function PetSearchSelect({
  pets,
  value,
  onChange,
  placeholder = 'Выберите питомца',
  emptyText = 'Питомцы не найдены',
  className,
}: PetSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => pets.find((p) => p.id === value), [pets, value]);

  const ownerName = (p: PetOption) => p.clients?.full_name ?? p.client?.full_name ?? '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <PawPrint className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">
                {selected.name}
                {ownerName(selected) && (
                  <span className="text-muted-foreground"> · {ownerName(selected)}</span>
                )}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const q = search.toLowerCase().trim();
            if (!q) return 1;
            return itemValue.toLowerCase().includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Поиск по питомцу или владельцу..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {pets.map((p) => {
                const owner = ownerName(p);
                const searchable = `${p.name} ${owner} ${p.species ?? ''}`.trim();
                return (
                  <CommandItem
                    key={p.id}
                    value={searchable}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      {owner && <span className="text-xs text-muted-foreground">{owner}</span>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
