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

  // Internal state for each part of the date
  const [day, setDay] = useState<string | undefined>();
  const [month, setMonth] = useState<string | undefined>();
  const [year, setYear] = useState<string | undefined>();

  // Effect to sync internal state when the external `value` prop changes.
  // This runs when the component mounts or when the parent's data loads.
  useEffect(() => {
    if (value && isValid(value)) {
      const date = new Date(value);
      setYear(String(getYear(date)));
      setMonth(String(getMonth(date)));
      setDay(String(getDate(date)));
    } else {
      // If the parent component passes undefined, clear the dropdowns.
      setDay(undefined);
      setMonth(undefined);
      setYear(undefined);
    }
  }, [value]);

  // This effect calls the parent `onChange` handler whenever a full, valid date can be formed from the internal state.
  useEffect(() => {
    if (year && month && day) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      
      const newDate = new Date(yearNum, monthNum, dayNum);

      // We must ensure the constructed date is valid AND that it's different from the parent's `value` to prevent loops.
      if (isValid(newDate) && newDate.getTime() !== value?.getTime()) {
        onChange(newDate);
      }
    } else if (!year && !month && !day && value !== undefined) {
      // If all fields are cleared by the user, tell the parent to clear its value.
      onChange(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]); // `value` and `onChange` are removed from deps to break update loops. We only sync from parent, not to parent in the same effect.

  // --- Render logic ---
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  
  // Day options must be recalculated if month or year changes to handle leap years etc.
  const daysInSelectedMonth = (month && year) ? getDaysInMonth(new Date(parseInt(year), parseInt(month))) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));
  
  // When changing month, if the current day is invalid for the new month, clamp it.
  const handleMonthChange = (newMonthValue: string) => {
    const newMonth = newMonthValue === 'none' ? undefined : newMonthValue;
    setMonth(newMonth);

    if (day && newMonth && year) {
        const currentDayNum = parseInt(day, 10);
        const daysInNewMonth = getDaysInMonth(new Date(parseInt(year), parseInt(newMonth)));
        if(currentDayNum > daysInNewMonth) {
            setDay(String(daysInNewMonth)); // Clamp the day
        }
    }
  };

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={day || 'none'} onValueChange={(d) => setDay(d === 'none' ? undefined : d)}>
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
      <Select value={year || 'none'} onValueChange={(y) => setYear(y === 'none' ? undefined : y)}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
