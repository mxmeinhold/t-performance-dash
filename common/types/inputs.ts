import type { DateType } from 'react-tailwindcss-datepicker/dist/types';

export interface SelectOption<T = any> {
  label: string;
  value: T;
  id: string | number;
}

export interface DateOption {
  range: boolean;
  startDate: DateType;
  endDate: DateType;
}
