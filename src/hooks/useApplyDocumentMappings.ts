import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VendorDocumentWithExtraction } from '@/types/document';

interface MappingData {
  vendorId: string;
  document: VendorDocumentWithExtraction;
}

export function useApplyDocumentMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, document }: MappingData) => {
      if (!document.extracted_data) {
        throw new Error('No extracted data to apply');
      }

      const extractedData = document.extracted_data as any;
      const extractedFields = extractedData.extracted_fields || [];
      const classification = document.classification;

      // Build update object based on classification
      const updates: Record<string, any> = {};

      for (const field of extractedFields) {
        const key = field.key?.toLowerCase() || '';
        const value = field.value;

        if (!value) continue;

        // Map extracted fields to vendor table columns
        if (key.includes('company') && key.includes('name')) {
          if (key.includes('arabic') || key.includes('ar')) {
            updates.company_name_ar = value;
          } else {
            updates.company_name_en = value;
          }
        }
        
        if (key.includes('license') && key.includes('number')) {
          updates.trade_license_no = value;
        }
        
        if (key.includes('expiry') || key.includes('valid_until')) {
          // Try to parse date
          const dateValue = parseDate(value);
          if (dateValue && classification === 'trade_license') {
            updates.trade_license_expiry = dateValue;
          }
        }
        
        if (key.includes('trn') || (key.includes('tax') && key.includes('number'))) {
          updates.tax_registration_no = value;
        }
        
        if (key.includes('address')) {
          if (key.includes('arabic') || key.includes('ar')) {
            updates.address_ar = value;
          } else {
            updates.address_en = value;
          }
        }
        
        if (key.includes('city')) {
          updates.city = value;
        }
        
        if (key.includes('phone') || key.includes('telephone')) {
          updates.phone = value;
        }
        
        if (key.includes('email')) {
          updates.email = value;
        }
        
        if (key.includes('website') || key.includes('web')) {
          updates.website = value;
        }
      }

      // Only update if we have mappable data
      if (Object.keys(updates).length === 0) {
        throw new Error('No mappable fields found in extracted data');
      }

      const { error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendorId);

      if (error) throw error;

      return updates;
    },
    onSuccess: (updates, { vendorId }) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      const fieldCount = Object.keys(updates).length;
      toast.success(`Applied ${fieldCount} field(s) from document`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply mappings');
    },
  });
}

// Also export a function to apply bank details from documents
export function useApplyBankDetailsFromDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, document }: MappingData) => {
      if (!document.extracted_data || document.classification !== 'bank_details') {
        throw new Error('Invalid document for bank details extraction');
      }

      const extractedData = document.extracted_data as any;
      const extractedFields = extractedData.extracted_fields || [];

      let bankName = '';
      let accountName = '';
      let accountNumber = '';
      let iban = '';
      let swiftCode = '';
      let currency = 'AED';

      for (const field of extractedFields) {
        const key = field.key?.toLowerCase() || '';
        const value = field.value;

        if (!value) continue;

        if (key.includes('bank') && key.includes('name')) {
          bankName = value;
        }
        if (key.includes('account') && key.includes('name')) {
          accountName = value;
        }
        if (key.includes('account') && key.includes('number')) {
          accountNumber = value;
        }
        if (key.includes('iban')) {
          iban = value;
        }
        if (key.includes('swift')) {
          swiftCode = value;
        }
        if (key.includes('currency')) {
          currency = value;
        }
      }

      // Validate required fields
      if (!bankName || !accountName || !accountNumber) {
        throw new Error('Missing required bank detail fields');
      }

      const { error } = await supabase
        .from('vendor_bank_details')
        .insert({
          vendor_id: vendorId,
          bank_name: bankName,
          account_name: accountName,
          account_number: accountNumber,
          iban: iban || null,
          swift_code: swiftCode || null,
          currency: currency,
          is_primary: false,
        });

      if (error) throw error;

      return { bankName, accountName, accountNumber };
    },
    onSuccess: (_, { vendorId }) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      toast.success('Bank details added from document');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply bank details');
    },
  });
}

function parseDate(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  try {
    // Try common date formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const parts = value.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts as [string, string, string];
      const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
  } catch {
    return null;
  }
  return null;
}
