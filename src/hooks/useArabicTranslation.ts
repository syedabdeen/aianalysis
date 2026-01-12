import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TranslationField {
  key: string;
  value: string;
}

export function useArabicTranslation() {
  return useMutation({
    mutationFn: async (fields: TranslationField[]): Promise<Record<string, string>> => {
      // Filter out empty values
      const nonEmptyFields = fields.filter(f => f.value && f.value.trim());
      
      if (nonEmptyFields.length === 0) {
        return {};
      }

      const { data, error } = await supabase.functions.invoke('translate-arabic', {
        body: { fields: nonEmptyFields }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Translation failed');

      return data.translations;
    },
  });
}

// Utility function to auto-fill Arabic fields from English
export function autoFillArabic<T extends Record<string, any>>(
  data: T,
  fieldMappings: Array<{ enField: keyof T; arField: keyof T }>
): T {
  const result = { ...data };
  
  for (const mapping of fieldMappings) {
    const enValue = result[mapping.enField];
    const arValue = result[mapping.arField];
    
    // If Arabic field is empty but English field has value, copy English to Arabic
    if (enValue && (!arValue || (typeof arValue === 'string' && !arValue.trim()))) {
      (result as any)[mapping.arField] = enValue;
    }
  }
  
  return result;
}
