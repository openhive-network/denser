import { Input } from '@ui/components';
import React from 'react';

interface NumberInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export default function NumberInput({ value, onChange, className, disabled, id }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = parseFloat(inputValue);

    if (inputValue === '' || !isNaN(numericValue)) {
      const newValue = inputValue === '' ? '' : numericValue;
      onChange(newValue);
    }
  };
  return (
    <Input
      id={id}
      disabled={disabled}
      value={value === '' ? '' : value.toString()}
      onChange={handleChange}
      className={className}
    />
  );
}
