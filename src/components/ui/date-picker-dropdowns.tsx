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
  
  const handleDateChange = (part: 'day' | 'month' | 'year', newValue: string) => {
    if (newValue === 'none') {
        onChange(undefined);
        return;
    }

    // Get current values, or default to a safe value if no date is set
    const currentYearVal = value && isValid(value) ? getYear(value) : toYear;
    const currentMonthVal = value && isValid(value) ? getMonth(value) : 0;
    const currentDayVal = value && isValid(value) ? getDate(value) : 1;

    let year = currentYearVal;
    let month = currentMonthVal;
    let day = currentDayVal;
    
    if (part === 'day') {
        day = parseInt(newValue, 10);
    } else if (part === 'month') {
        month = parseInt(newValue, 10);
    } else if (part === 'year') {
        year = parseInt(newValue, 10);
    }
    
    // Ensure day is valid for the potentially new month and year
    const daysInNewMonth = getDaysInMonth(new Date(year, month));
    const newDay = Math.min(day, daysInNewMonth);

    onChange(new Date(year, month, newDay));
  };
  
  const selectedDay = value && isValid(value) ? String(getDate(value)) : '';
  const selectedMonth = value && isValid(value) ? String(getMonth(value)) : '';
  const selectedYear = value && isValid(value) ? String(getYear(value)) : '';

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) =>
    String(toYear - i)
  );
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }),
  }));
  
  const daysInSelectedMonth = value && isValid(value) ? getDaysInMonth(value) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={selectedDay} onValueChange={(val) => handleDateChange('day', val)}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Hari" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={(val) => handleDateChange('month', val)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedYear} onValueChange={(val) => handleDateChange('year', val)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
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
