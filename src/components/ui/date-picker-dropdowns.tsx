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

  // Internal state to manage dropdown values. "none" represents no selection.
  const [day, setDay] = useState<string>("none");
  const [month, setMonth] = useState<string>("none");
  const [year, setYear] = useState<string>("none");

  // Effect to sync internal state FROM the external `value` prop.
  // This runs only when the external `value` changes.
  useEffect(() => {
    if (value && isValid(value)) {
      setDay(String(getDate(value)));
      setMonth(String(getMonth(value)));
      setYear(String(getYear(value)));
    } else {
      // If the prop is cleared or invalid, reset internal state.
      setDay("none");
      setMonth("none");
      setYear("none");
    }
  }, [value]);

  const handleValueChange = (part: 'day' | 'month' | 'year', newValue: string) => {
    // 1. Update the internal state for the changed part.
    let currentDay = day;
    let currentMonth = month;
    let currentYear = year;

    if (part === 'day') {
      currentDay = newValue;
      setDay(newValue);
    } else if (part === 'month') {
      currentMonth = newValue;
      setMonth(newValue);
    } else if (part === 'year') {
      currentYear = newValue;
      setYear(newValue);
    }
    
    // 2. If all parts are selected, construct a new date and call `onChange`.
    if (currentYear !== "none" && currentMonth !== "none" && currentDay !== "none") {
      const yearNum = parseInt(currentYear, 10);
      const monthNum = parseInt(currentMonth, 10);
      
      // Clamp day to the max days in the new month/year.
      const daysInNewMonth = getDaysInMonth(new Date(yearNum, monthNum));
      const dayNum = Math.min(parseInt(currentDay, 10), daysInNewMonth);

      const newDate = new Date(yearNum, monthNum, dayNum);

      // Only call onChange if the new date is valid and different from the current prop value.
      if (isValid(newDate) && newDate.getTime() !== value?.getTime()) {
        onChange(newDate);
      }
    } else {
      // 3. If any part is "none", it means the date is incomplete/cleared.
      // Notify parent to clear the value if it's not already cleared.
      if (value) {
        onChange(undefined);
      }
    }
  };
  
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }) }));
  const daysInSelectedMonth = (month !== "none" && year !== "none") ? getDaysInMonth(new Date(parseInt(year), parseInt(month))) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1));
  
  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={day} onValueChange={(val) => handleValueChange('day', val)}>
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Hari</SelectItem>
          {days.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(val) => handleValueChange('month', val)}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bulan</SelectItem>
          {months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={(val) => handleValueChange('year', val)}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tahun</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
