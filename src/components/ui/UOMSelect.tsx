import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UNIT_OPTIONS } from '@/types/inventory';

interface UOMSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const UOMSelect: React.FC<UOMSelectProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}) => {
  const { language } = useLanguage();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder || (language === 'ar' ? 'اختر الوحدة' : 'Select Unit')} />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {UNIT_OPTIONS.map((unit) => (
          <SelectItem key={unit.value} value={unit.value}>
            {unit.value} - {language === 'ar' ? unit.label_ar : unit.label_en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
