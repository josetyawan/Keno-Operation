'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, isValid, getYear, getMonth, getDate, getDaysInMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface DatePickerDropdownsProps {
  value?: Date;
  onChange: (date?: Date) => void;
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

  const [day, setDay] = useState<string | undefined>(
    value && isValid(value) ? String(getDate(value)) : undefined
  );
  const [month, setMonth] = useState<string | undefined>(
    value && isValid(value) ? String(getMonth(value)) : undefined
  );
  const [year, setYear] = useState<string | undefined>(
    value && isValid(value) ? String(getYear(value)) : undefined
  );

  // Sync state ONLY when the parent 'value' prop changes.
  // This is crucial to prevent loops. We compare the internal date with the prop date.
  useEffect(() => {
    const internalDate =
      year && month && day
        ? new Date(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10))
        : undefined;

    // If parent value is valid and different from internal representation, update internal state.
    if (value && isValid(value) && value.getTime() !== internalDate?.getTime()) {
      setDay(String(getDate(value)));
      setMonth(String(getMonth(value)));
      setYear(String(getYear(value)));
    } else if (!value && (day || month || year)) {
      // If parent value is cleared, clear internal state.
      setDay(undefined);
      setMonth(undefined);
      setYear(undefined);
    }
  }, [value, day, month, year]);

  const constructAndTriggerChange = (newPart: { day?: string; month?: string; year?: string }) => {
    const d = newPart.day ?? day;
    const m = newPart.month ?? month;
    const y = newPart.year ?? year;

    if (d && m && y) {
      const yearNum = parseInt(y, 10);
      const monthNum = parseInt(m, 10);
      
      // Clamp day to the max days in the new month/year
      const daysInNewMonth = getDaysInMonth(new Date(yearNum, monthNum));
      const dayNum = Math.min(parseInt(d, 10), daysInNewMonth);

      const newDate = new Date(yearNum, monthNum, dayNum);
      if (isValid(newDate)) {
        // Only call onChange if the date is different from the current prop value
        if (newDate.getTime() !== value?.getTime()) {
          onChange(newDate);
        }
      }
    } else {
        // If any part is missing, we propagate 'undefined'
        if (value !== undefined) {
             onChange(undefined);
        }
    }
  };

  const handleDayChange = (newDay: string) => {
    const d = newDay === 'none' ? undefined : newDay;
    setDay(d);
    constructAndTriggerChange({ day: d });
  };

  const handleMonthChange = (newMonth: string) => {
    const m = newMonth === 'none' ? undefined : newMonth;
    setMonth(m);
    constructAndTriggerChange({ month: m });
  };

  const handleYearChange = (newYear: string) => {
    const y = newYear === 'none' ? undefined : newYear;
    setYear(y);
    constructAndTriggerChange({ year: y });
  };

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  const daysInSelectedMonth = (month && year) ? getDaysInMonth(new Date(parseInt(year), parseInt(month))) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));
  
  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={day || 'none'} onValueChange={handleDayChange}>
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={month || 'none'} onValueChange={handleMonthChange}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={year || 'none'} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
