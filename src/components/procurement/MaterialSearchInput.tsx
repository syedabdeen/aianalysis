import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Search, Package } from 'lucide-react';

interface Material {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  unit: string;
  unit_price: number;
  specifications?: string;
}

interface MaterialSearchInputProps {
  value: string;
  onChange: (value: string, material?: Material) => void;
  placeholder?: string;
  className?: string;
}

export const MaterialSearchInput: React.FC<MaterialSearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<Material[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFocused, setHasFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHasFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch materials - either all on focus or filtered by search term
  const fetchMaterials = async (term: string, loadAll: boolean = false) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('inventory_items')
        .select('id, code, name_en, name_ar, unit, unit_price, specifications')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (!loadAll && term.length >= 1) {
        query = query.or(`name_en.ilike.%${term}%,name_ar.ilike.%${term}%,code.ilike.%${term}%`);
      }

      const { data, error } = await query.limit(20);

      if (!error && data) {
        setSuggestions(data as Material[]);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Error searching materials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle focus - load initial 20 materials
  const handleFocus = () => {
    if (!hasFocused) {
      setHasFocused(true);
      fetchMaterials('', true);
    } else if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    if (!hasFocused) return;

    const debounce = setTimeout(() => {
      if (searchTerm.length >= 1) {
        fetchMaterials(searchTerm);
      } else {
        fetchMaterials('', true);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, hasFocused]);

  const handleSelect = (material: Material) => {
    const displayValue = language === 'ar' ? material.name_ar : material.name_en;
    setSearchTerm(displayValue);
    onChange(displayValue, material);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    if (newValue.length >= 2) {
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder || (language === 'ar' ? 'ابحث عن مادة...' : 'Search material...')}
          className={cn("pl-9", className)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[400px] overflow-auto">
          <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
            {language === 'ar' 
              ? `${suggestions.length} مادة متاحة` 
              : `${suggestions.length} materials available`}
          </div>
          {suggestions.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSelect(material)}
            >
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {material.code}
                  </span>
                  <span className="font-medium text-sm truncate">
                    {language === 'ar' ? material.name_ar : material.name_en}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {material.unit} • {material.unit_price.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
          {language === 'ar' ? 'جاري البحث...' : 'Searching...'}
        </div>
      )}

      {showSuggestions && !isLoading && searchTerm.length >= 1 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
          {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
        </div>
      )}
    </div>
  );
};
