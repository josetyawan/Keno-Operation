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
  
  // Use undefined for the value when no date is selected, which allows the placeholder to show.
  const selectedDay = value && isValid(value) ? String(getDate(value)) : undefined;
  const selectedMonth = value && isValid(value) ? String(getMonth(value)) : undefined;
  const selectedYear = value && isValid(value) ? String(getYear(value)) : undefined;

  const handleDatePartChange = (part: 'day' | 'month' | 'year', valueStr: string) => {
    // If the user selects the placeholder item, clear the date.
    if (valueStr === 'none') {
      onChange(undefined);
      return;
    }

    // Get the current selected values, defaulting to a safe value if they don't exist yet.
    // This is important for when the user is selecting a date from scratch.
    const year = part === 'year' ? parseInt(valueStr, 10) : (selectedYear ? parseInt(selectedYear) : toYear);
    const month = part === 'month' ? parseInt(valueStr, 10) : (selectedMonth ? parseInt(selectedMonth) : 0);
    let day = part === 'day' ? parseInt(valueStr, 10) : (selectedDay ? parseInt(selectedDay) : 1);
    
    // Crucial validation: check if the selected day is valid for the (potentially new) month and year.
    // If not, adjust the day to the last valid day of that month.
    const daysInNewMonth = getDaysInMonth(new Date(year, month));
    if (day > daysInNewMonth) {
        day = daysInNewMonth;
    }

    // Construct the new date and pass it up to the parent component.
    onChange(new Date(year, month, day));
  };


  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  
  // Dynamically generate the list of days based on the currently selected month and year.
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
