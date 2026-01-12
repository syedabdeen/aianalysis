import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { DateRange, DatePreset } from '@/types/reports';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const { language } = useLanguage();
  const [activePreset, setActivePreset] = useState<DatePreset>('month');

  const presets: { key: DatePreset; label: { en: string; ar: string }; getRange: () => DateRange }[] = [
    {
      key: 'today',
      label: { en: 'Today', ar: 'اليوم' },
      getRange: () => ({ from: new Date(), to: new Date() }),
    },
    {
      key: 'week',
      label: { en: 'This Week', ar: 'هذا الأسبوع' },
      getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }),
    },
    {
      key: 'month',
      label: { en: 'This Month', ar: 'هذا الشهر' },
      getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    },
    {
      key: 'quarter',
      label: { en: 'This Quarter', ar: 'هذا الربع' },
      getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }),
    },
    {
      key: 'year',
      label: { en: 'This Year', ar: 'هذه السنة' },
      getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.key);
    onDateRangeChange(preset.getRange());
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {presets.map((preset) => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'text-xs',
              activePreset === preset.key && 'bg-primary text-primary-foreground'
            )}
          >
            {preset.label[language]}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="text-xs">
              {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setActivePreset('custom');
                onDateRangeChange({ from: range.from, to: range.to });
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
