
'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

  const [day, setDay] = React.useState<string | undefined>(value ? String(value.getDate()) : undefined);
  const [month, setMonth] = React.useState<string | undefined>(value ? String(value.getMonth()) : undefined);
  const [year, setYear] = React.useState<string | undefined>(value ? String(value.getFullYear()) : undefined);

  // When the external value changes, update internal state
  React.useEffect(() => {
    if (value && isValid(value)) {
      setDay(String(value.getDate()));
      setMonth(String(value.getMonth()));
      setYear(String(value.getFullYear()));
    } else {
      setDay(undefined);
      setMonth(undefined);
      setYear(undefined);
    }
  }, [value]);

  // When internal state changes, construct a new date and call onChange
  React.useEffect(() => {
    if (day && month && year) {
      const newDate = new Date(Number(year), Number(month), Number(day));
       if (isValid(newDate) && newDate.getTime() !== value?.getTime()) {
        onChange(newDate);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: format(new Date(2000, i, 1), 'MMMM', { locale: idLocale }),
  }));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Select value={day} onValueChange={setDay} >
        <SelectTrigger className="w-[80px]"><SelectValue placeholder="Hari" /></SelectTrigger>
        <SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Bulan" /></SelectTrigger>
        <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
        <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
