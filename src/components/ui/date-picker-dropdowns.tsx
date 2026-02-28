
'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface DatePickerDropdownsProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
  className?: string;
}

export function DatePickerDropdowns({
  value,
  onChange,
  fromYear: fromYearProp,
  toYear: toYearProp,
  className,
}: DatePickerDropdownsProps) {
  const currentYear = new Date().getFullYear();
  const fromYear = fromYearProp || currentYear - 100;
  const toYear = toYearProp || currentYear;

  const [day, setDay] = React.useState<string | undefined>(
    value && isValid(value) ? String(value.getDate()) : undefined
  );
  const [month, setMonth] = React.useState<string | undefined>(
    value && isValid(value) ? String(value.getMonth()) : undefined
  );
  const [year, setYear] = React.useState<string | undefined>(
    value && isValid(value) ? String(value.getFullYear()) : undefined
  );

  // When the external value prop changes, update the internal state of the dropdowns.
  React.useEffect(() => {
    if (value && isValid(value)) {
      setDay(String(value.getDate()));
      setMonth(String(value.getMonth()));
      setYear(String(value.getFullYear()));
    } else {
      // If the external value is cleared, clear the dropdowns.
      setDay(undefined);
      setMonth(undefined);
      setYear(undefined);
    }
  }, [value]);

  // When one of the dropdowns is changed by the user, update the parent component.
  React.useEffect(() => {
    // If all three parts of the date are selected...
    if (day && month && year) {
      const newDate = new Date(Number(year), Number(month), Number(day));
      // ...and the constructed date is valid and different from the current value...
      if (isValid(newDate) && newDate.getTime() !== value?.getTime()) {
        // ...tell the parent component about the new date.
        onChange(newDate);
      }
    } else if (value) {
      // If any part of the date is missing (e.g., user cleared a dropdown),
      // but the parent component still thinks there's a date (`value` prop is not undefined),
      // tell the parent component to clear the date.
      onChange(undefined);
    }
    // This effect should run whenever the user changes a dropdown or the props from the parent change.
  }, [day, month, year, value, onChange]);

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }),
  }));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={day} onValueChange={setDay}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Hari" />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
