import React, { useState, useEffect } from 'react';
import { formatDecimalInput, parseDecimalInput } from '../../utils/currency';

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | undefined | null;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '1,25',
  ...rest
}) => {
  const [text, setText] = useState<string>(() => formatDecimalInput(value));

  // Sync internal string when external numeric value changes from outside
  useEffect(() => {
    const numProp = Number(value) || 0;
    const numCurrent = parseDecimalInput(text);
    // Only update text if the value genuinely changed and user isn't in the middle of typing comma/period
    if (Math.abs(numProp - numCurrent) > 0.00001 && !text.endsWith(',') && !text.endsWith('.')) {
      setText(formatDecimalInput(value));
    } else if (text === '' && value !== undefined && value !== null && value !== 0) {
      setText(formatDecimalInput(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
    const firstComma = raw.indexOf(',');
    if (firstComma >= 0) {
      raw = raw.slice(0, firstComma + 1) + raw.slice(firstComma + 1).replace(/,/g, '').slice(0, 4);
    }
    setText(raw);
    const parsed = parseDecimalInput(raw);
    onChange(parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseDecimalInput(text);
    setText(formatDecimalInput(parsed));
    onChange(parsed);
    if (rest.onBlur) rest.onBlur(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      {...rest}
    />
  );
};
