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

  const [day, setDay] = useState<string | undefined>();
  const [month, setMonth] = useState<string | undefined>();
  const [year, setYear] = useState<string | undefined>();

  // Effect to synchronize the internal state with the external `value` prop
  useEffect(() => {
    if (value && isValid(value)) {
      const date = new Date(value);
      if (String(getYear(date)) !== year) setYear(String(getYear(date)));
      if (String(getMonth(date)) !== month) setMonth(String(getMonth(date)));
      if (String(getDate(date)) !== day) setDay(String(getDate(date)));
    } else {
      // If the external value is cleared, clear our internal state
      setDay(undefined);
      setMonth(undefined);
      setYear(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Effect to notify the parent component when a valid date can be formed
  useEffect(() => {
    // Only proceed if all parts are defined
    if (day && month && year) {
      const newYear = parseInt(year, 10);
      const newMonth = parseInt(month, 10);
      
      // Clamp the day to the maximum number of days in the selected month and year
      const daysInNewMonth = getDaysInMonth(new Date(newYear, newMonth));
      const newDay = Math.min(parseInt(day, 10), daysInNewMonth);

      const newDate = new Date(newYear, newMonth, newDay);

      if (isValid(newDate)) {
        // Only call onChange if the new date is different from the prop value
        // to prevent an infinite update loop.
        if (value?.getTime() !== newDate.getTime()) {
          onChange(newDate);
        }
      }
    } else if (!day && !month && !year && value) {
        // If all fields have been cleared and there was previously a value, clear the parent state.
        onChange(undefined);
    }
  // This effect depends on the internal state and the parent's onChange and value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  const handleDayChange = (newDay: string) => setDay(newDay === 'none' ? undefined : newDay);
  const handleMonthChange = (newMonth: string) => setMonth(newMonth === 'none' ? undefined : newMonth);
  const handleYearChange = (newYear: string) => setYear(newYear === 'none' ? undefined : newYear);

  // --- Render logic ---
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  const daysInSelectedMonth = month && year ? getDaysInMonth(new Date(parseInt(year), parseInt(month))) : 31;
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
