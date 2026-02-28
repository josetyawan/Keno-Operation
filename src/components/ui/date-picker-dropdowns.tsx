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
import { format, isValid, getDaysInMonth, getYear, getMonth, getDate } from 'date-fns';
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
  
  const selectedDay = value && isValid(value) ? String(getDate(value)) : undefined;
  const selectedMonth = value && isValid(value) ? String(getMonth(value)) : undefined;
  const selectedYear = value && isValid(value) ? String(getYear(value)) : undefined;

  const handleDatePartChange = (part: 'day' | 'month' | 'year', valueStr: string) => {
    if (valueStr === 'none') {
      onChange(undefined);
      return;
    }

    const valueNum = parseInt(valueStr, 10);

    // Get current values or fall back to a safe default if they are not set yet.
    // This prevents creating dates like "undefined/undefined/2024"
    const y = part === 'year' ? valueNum : selectedYear ? parseInt(selectedYear) : toYear;
    const m = part === 'month' ? valueNum : selectedMonth ? parseInt(selectedMonth) : 0;
    let d = part === 'day' ? valueNum : selectedDay ? parseInt(selectedDay) : 1;
    
    // Crucial validation: if we change month or year, the previously selected day might be invalid.
    // e.g., changing from March 31st to February. We must clamp the day to the new month's max.
    const daysInNewMonth = getDaysInMonth(new Date(y, m));
    if (d > daysInNewMonth) {
      d = daysInNewMonth;
    }

    onChange(new Date(y, m, d));
  };


  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  
  // Day options must be dynamically calculated based on the selected month and year
  const daysInSelectedMonth = (selectedYear && selectedMonth) ? getDaysInMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth))) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={selectedDay} onValueChange={(val) => handleDatePartChange('day', val)}>
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={(val) => handleDatePartChange('month', val)}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedYear} onValueChange={(val) => handleDatePartChange('year', val)}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
