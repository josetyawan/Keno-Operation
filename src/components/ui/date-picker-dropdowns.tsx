
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
  
  const selectedDay = value && isValid(value) ? String(getDate(value)) : '';
  const selectedMonth = value && isValid(value) ? String(getMonth(value)) : '';
  const selectedYear = value && isValid(value) ? String(getYear(value)) : '';

  const handleDateChange = (part: 'day' | 'month' | 'year', newValue: string) => {
    if (newValue === 'none') {
        // If any part is cleared, the whole date is cleared.
        onChange(undefined);
        return;
    }

    const day = part === 'day' ? parseInt(newValue, 10) : parseInt(selectedDay, 10);
    const month = part === 'month' ? parseInt(newValue, 10) : parseInt(selectedMonth, 10);
    const year = part === 'year' ? parseInt(newValue, 10) : parseInt(selectedYear, 10);
    
    // Construct a new date. If any part is missing, use a safe default.
    // The key is to ensure we always construct a valid date if we are not clearing it.
    const newYear = !isNaN(year) ? year : currentYear;
    const newMonth = !isNaN(month) ? month : 0; // January
    const daysInNewMonth = getDaysInMonth(new Date(newYear, newMonth));
    const newDay = !isNaN(day) ? Math.min(day, daysInNewMonth) : 1;
    
    onChange(new Date(newYear, newMonth, newDay));
  };


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
