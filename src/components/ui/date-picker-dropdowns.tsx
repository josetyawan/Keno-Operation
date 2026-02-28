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

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));

  const selectedDate = value && isValid(value) ? value : undefined;

  const daysInSelectedMonth = selectedDate ? getDaysInMonth(selectedDate) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));

  const handleDatePartChange = (part: 'day' | 'month' | 'year', valueStr: string) => {
    if (valueStr === 'none') {
      onChange(undefined);
      return;
    }

    const valueNum = parseInt(valueStr, 10);
    
    // Use currently selected values as the base, or safe defaults if nothing is selected yet.
    // Defaulting to the latest possible year from the range prevents unexpected jumps.
    const currentY = selectedDate ? getYear(selectedDate) : toYear;
    const currentM = selectedDate ? getMonth(selectedDate) : 0; // January
    const currentD = selectedDate ? getDate(selectedDate) : 1;

    let newYear = currentY;
    let newMonth = currentM;
    let newDay = currentD;

    if (part === 'year') {
      newYear = valueNum;
    } else if (part === 'month') {
      newMonth = valueNum;
    } else { // 'day'
      newDay = valueNum;
    }
    
    // After getting the new parts, clamp the day to be valid for the new month/year
    // to prevent invalid dates like February 30th.
    const daysInNewMonth = getDaysInMonth(new Date(newYear, newMonth));
    if (newDay > daysInNewMonth) {
      newDay = daysInNewMonth;
    }

    onChange(new Date(newYear, newMonth, newDay));
  };

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={selectedDate ? getDate(selectedDate).toString() : 'none'} onValueChange={(val) => handleDatePartChange('day', val)}>
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedDate ? getMonth(selectedDate).toString() : 'none'} onValueChange={(val) => handleDatePartChange('month', val)}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedDate ? getYear(selectedDate).toString() : 'none'} onValueChange={(val) => handleDatePartChange('year', val)}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
