
'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, isValid, getDaysInMonth, set } from 'date-fns';
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

  const handleDayChange = (day: string) => {
    const newDay = parseInt(day, 10);
    if (!value || !isValid(value)) {
      // If no date is set, default to current month/year when day is picked.
      onChange(new Date(currentYear, new Date().getMonth(), newDay));
    } else {
      onChange(set(value, { date: newDay }));
    }
  };

  const handleMonthChange = (month: string) => {
    const monthIndex = parseInt(month, 10);
    const year = value && isValid(value) ? value.getFullYear() : currentYear;
    const currentDay = value && isValid(value) ? value.getDate() : 1;
    const daysInNewMonth = getDaysInMonth(new Date(year, monthIndex));
    const newDay = Math.min(currentDay, daysInNewMonth);

    onChange(set(value || new Date(), { year, month: monthIndex, date: newDay }));
  };

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year, 10);
    const month = value && isValid(value) ? value.getMonth() : 0;
    const currentDay = value && isValid(value) ? value.getDate() : 1;
    const daysInMonth = getDaysInMonth(new Date(yearNum, month));
    const newDay = Math.min(currentDay, daysInMonth);

    onChange(set(value || new Date(), { year: yearNum, month, date: newDay }));
  };

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) =>
    String(toYear - i)
  );
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }),
  }));
  const daysInSelectedMonth =
    value && isValid(value) ? getDaysInMonth(value) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) =>
    String(i + 1)
  );

  const selectedDay = value && isValid(value) ? String(value.getDate()) : undefined;
  const selectedMonth =
    value && isValid(value) ? String(value.getMonth()) : undefined;
  const selectedYear =
    value && isValid(value) ? String(value.getFullYear()) : undefined;

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={selectedDay} onValueChange={handleDayChange}>
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
      <Select value={selectedMonth} onValueChange={handleMonthChange}>
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
      <Select value={selectedYear} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
