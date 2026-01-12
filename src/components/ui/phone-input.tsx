import React, { useState } from 'react';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from '@/lib/utils';

export interface CountryCode {
  code: string;
  dial: string;
  name: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  { code: 'AE', dial: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', dial: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', dial: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'BH', dial: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'OM', dial: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: 'EG', dial: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: 'JO', dial: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: 'LB', dial: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'IQ', dial: '+964', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'PK', dial: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', dial: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'PH', dial: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: 'US', dial: '+1', name: 'USA', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', name: 'UK', flag: '🇬🇧' },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dial: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'CN', dial: '+86', name: 'China', flag: '🇨🇳' },
];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({
  value = '',
  onChange,
  disabled,
  placeholder = 'Phone number',
  className,
}: PhoneInputProps) {
  // Parse the value to extract country code and number
  const parseValue = (val: string) => {
    for (const country of countryCodes) {
      if (val.startsWith(country.dial)) {
        return {
          countryCode: country.code,
          number: val.slice(country.dial.length).trim(),
        };
      }
    }
    return { countryCode: 'AE', number: val.replace(/^\+\d+\s*/, '') };
  };

  const parsed = parseValue(value);
  const [selectedCountry, setSelectedCountry] = useState(parsed.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    const country = countryCodes.find((c) => c.code === code);
    if (country && onChange) {
      onChange(`${country.dial} ${phoneNumber}`);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/[^\d\s-]/g, '');
    setPhoneNumber(num);
    const country = countryCodes.find((c) => c.code === selectedCountry);
    if (country && onChange) {
      onChange(`${country.dial} ${num}`);
    }
  };

  const selectedCountryData = countryCodes.find((c) => c.code === selectedCountry);

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={selectedCountry} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[120px] flex-shrink-0">
          <SelectValue>
            {selectedCountryData && (
              <span className="flex items-center gap-1">
                <span>{selectedCountryData.flag}</span>
                <span className="text-xs text-muted-foreground">{selectedCountryData.dial}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {countryCodes.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.name}</span>
                <span className="text-xs text-muted-foreground">{country.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  );
}