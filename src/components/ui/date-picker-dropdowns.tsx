
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

  const handleDayChange = (day: string) => {
    if (!day) {
      onChange(undefined);
      return;
    }
    const newDay = parseInt(day, 10);
    // If no valid date exists, create one from scratch using sane defaults.
    const year = value && isValid(value) ? getYear(value) : currentYear;
    const month = value && isValid(value) ? getMonth(value) : 0; // Default to January
    onChange(new Date(year, month, newDay));
  };

  const handleMonthChange = (month: string) => {
    if (month === '') {
      onChange(undefined);
      return;
    }
    const monthIndex = parseInt(month, 10);
    const year = value && isValid(value) ? getYear(value) : currentYear;
    const currentDay = value && isValid(value) ? getDate(value) : 1;
    const daysInNewMonth = getDaysInMonth(new Date(year, monthIndex));

    onChange(new Date(year, monthIndex, Math.min(currentDay, daysInNewMonth)));
  };

  const handleYearChange = (year: string) => {
    if (!year) {
      onChange(undefined);
      return;
    }
    const yearNum = parseInt(year, 10);
    const month = value && isValid(value) ? getMonth(value) : 0; // Default to January
    const currentDay = value && isValid(value) ? getDate(value) : 1;
    const daysInNewMonth = getDaysInMonth(new Date(yearNum, month));
    
    onChange(new Date(yearNum, month, Math.min(currentDay, daysInNewMonth)));
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
      <Select value={selectedDay} onValueChange={handleDayChange}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Hari" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Hari</SelectItem>
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
          <SelectItem value="">Bulan</SelectItem>
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
          <SelectItem value="">Tahun</SelectItem>
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
