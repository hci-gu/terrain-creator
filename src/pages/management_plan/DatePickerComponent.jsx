"use client"

import React from 'react';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';

export function DatePicker({ value, onDateChange, minDate, maxDate }) {
  return (
    <DatePickerInput
      value={value}
      onChange={onDateChange}
      minDate={minDate}
      maxDate={maxDate}
      leftSection={<IconCalendar size={16} />}
      valueFormat="MMMM D, YYYY"
      placeholder="Pick a date"
      clearable
      w={280}
    />
  );
}
