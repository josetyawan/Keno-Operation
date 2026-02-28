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
import { format, isValid, getYear, getMonth, getDate, getDaysInMonth, set } from 'date-fns';
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

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));

  const selectedDate = value && isValid(value) ? value : undefined;

  const daysInSelectedMonth = selectedDate ? getDaysInMonth(selectedDate) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));
  
  const selectedDay = selectedDate ? String(getDate(selectedDate)) : 'none';
  const selectedMonth = selectedDate ? String(getMonth(selectedDate)) : 'none';
  const selectedYear = selectedDate ? String(getYear(selectedDate)) : 'none';

  // A safe default date to use as a base if no date is currently selected.
  // It defaults to Jan 1st of the most recent year in the allowed range.
  const getBaseDate = () => selectedDate || new Date(toYear, 0, 1);


  const handleDayChange = (dayStr: string) => {
    if (dayStr === 'none') {
        onChange(undefined);
        return;
    }
    const day = parseInt(dayStr, 10);
    const newDate = set(getBaseDate(), { date: day });
    onChange(newDate);
  };
  
  const handleMonthChange = (monthStr: string) => {
    if (monthStr === 'none') {
        onChange(undefined);
        return;
    }
    const month = parseInt(monthStr, 10);
    const baseDate = getBaseDate();
    const currentDay = getDate(baseDate);
    const daysInNewMonth = getDaysInMonth(set(baseDate, { month }));
    const newDay = Math.min(currentDay, daysInNewMonth);

    const newDate = set(baseDate, { month, date: newDay });
    onChange(newDate);
  };

  const handleYearChange = (yearStr: string) => {
    if (yearStr === 'none') {
        onChange(undefined);
        return;
    }
    const year = parseInt(yearStr, 10);
    const baseDate = getBaseDate();
    const currentMonth = getMonth(baseDate);
    const currentDay = getDate(baseDate);
    // Handle leap years: if the current day is 29 and we're moving to a non-leap year, clamp it.
    const daysInNewMonth = getDaysInMonth(new Date(year, currentMonth, 1));
    const newDay = Math.min(currentDay, daysInNewMonth);
    
    const newDate = set(baseDate, { year, date: newDay });
    onChange(newDate);
  };
  

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={selectedDay} onValueChange={handleDayChange}>
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={handleMonthChange}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedYear} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}