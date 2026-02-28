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

    const valueAsNumber = parseInt(valueStr, 10);

    // Get the current parts, or use a safe default if they don't exist yet.
    const currentYear = selectedYear ? parseInt(selectedYear, 10) : toYear;
    const currentMonth = selectedMonth ? parseInt(selectedMonth, 10) : 0; // Default to January
    const currentDay = selectedDay ? parseInt(selectedDay, 10) : 1; // Default to the 1st
    
    let year = currentYear;
    let month = currentMonth;
    let day = currentDay;
    
    // Update the part that was changed
    if (part === 'year') {
        year = valueAsNumber;
        // If year is being set from scratch, reset month/day for predictability
        if (!selectedYear) {
            month = 0;
            day = 1;
        }
    } else if (part === 'month') {
        month = valueAsNumber;
        // If month is being set from scratch, reset day
        if (!selectedMonth) {
            day = 1;
        }
    } else if (part === 'day') {
        day = valueAsNumber;
    }

    // Validate the day against the new month and year to prevent invalid dates
    const daysInNewMonth = getDaysInMonth(new Date(year, month));
    if (day > daysInNewMonth) {
        day = daysInNewMonth;
    }

    onChange(new Date(year, month, day));
  };


  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  
  const daysInCurrentMonth = (selectedYear && selectedMonth) ? getDaysInMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth))) : 31;
  const days = Array.from({ length: daysInCurrentMonth }, (_, i) => String(i + 1));

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
