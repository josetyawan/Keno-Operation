
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

  // Derive display values directly from the `value` prop. This is a stateless approach.
  const selectedYear = value && isValid(value) ? String(getYear(value)) : 'none';
  const selectedMonth = value && isValid(value) ? String(getMonth(value)) : 'none';
  const selectedDay = value && isValid(value) ? String(getDate(value)) : 'none';

  const handlePartChange = (part: 'day' | 'month' | 'year', newValue: string) => {
    // If user selects the placeholder, clear the date.
    if (newValue === 'none') {
      onChange(undefined);
      return;
    }

    // Use the current date from props as the base, or a safe default if it's not set.
    // Defaulting to a recent date avoids issues with very old dates if no value is present.
    const baseDate = value && isValid(value) ? value : new Date();

    const yearNum = part === 'year' ? parseInt(newValue, 10) : getYear(baseDate);
    const monthNum = part === 'month' ? parseInt(newValue, 10) : getMonth(baseDate);
    // Use the *newly selected* day if that's what changed, otherwise use the existing day.
    let dayNum = part === 'day' ? parseInt(newValue, 10) : getDate(baseDate);

    // If day was not set before and we are changing month/year, default day to 1.
    if (selectedDay === 'none' && part !== 'day') {
        dayNum = 1;
    }

    // Validate the day against the number of days in the new month/year.
    const daysInNewMonth = getDaysInMonth(new Date(yearNum, monthNum));
    if (dayNum > daysInNewMonth) {
      dayNum = daysInNewMonth; // Clamp to the last valid day of the month.
    }

    const newDate = new Date(yearNum, monthNum, dayNum);

    // Only trigger the parent's onChange if the new date is valid.
    if (isValid(newDate)) {
      onChange(newDate);
    }
  };

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  
  // Calculate days in month based on the currently selected month and year
  const daysInSelectedMonth = (selectedMonth !== "none" && selectedYear !== "none") 
    ? getDaysInMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth))) 
    : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));
  
  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={selectedDay} onValueChange={(val) => handlePartChange('day', val)}>
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={(val) => handlePartChange('month', val)}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={selectedYear} onValueChange={(val) => handlePartChange('year', val)}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
