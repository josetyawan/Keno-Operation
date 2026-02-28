
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

  // Store the latest onChange and value in refs to avoid including them in the effect's dependency array,
  // which is the source of the infinite loop.
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;


  // This effect synchronizes the internal state (day, month, year) FROM the parent's `value` prop.
  React.useEffect(() => {
    if (value && isValid(value)) {
      const currentDay = String(value.getDate());
      const currentMonth = String(value.getMonth());
      const currentYear = String(value.getFullYear());
      // Only update state if it has actually changed to prevent loops.
      if (day !== currentDay) setDay(currentDay);
      if (month !== currentMonth) setMonth(currentMonth);
      if (year !== currentYear) setYear(currentYear);
    } else {
      // If the external value is cleared, clear the dropdowns.
      if (day !== undefined) setDay(undefined);
      if (month !== undefined) setMonth(undefined);
      if (year !== undefined) setYear(undefined);
    }
  }, [value, day, month, year]); // This effect ONLY runs when the parent `value` prop changes.

  // This effect notifies the parent component of changes FROM the internal state.
  React.useEffect(() => {
    // If all three parts of the date are selected...
    if (day && month && year) {
      const newDate = new Date(Number(year), Number(month), Number(day));
      // ...and the constructed date is valid...
      if (isValid(newDate)) {
        // ...and it's different from the current value from the parent...
        if (newDate.getTime() !== valueRef.current?.getTime()) {
           // ...call the latest version of onChange from the ref.
          onChangeRef.current(newDate);
        }
      }
    } else {
      // If any part is missing, but the parent still has a value, clear it.
      if (valueRef.current) {
        onChangeRef.current(undefined);
      }
    }
  // This effect ONLY runs when the internal day, month, or year state changes.
  // It does NOT depend on `value` or `onChange` from props, breaking the loop.
  }, [day, month, year]);

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
