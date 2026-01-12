import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vendor, VendorCategory, VendorFormData, VendorContact, VendorBankDetail, VendorStatus, VendorType, VendorCategoryMapping } from '@/types/vendor';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { generateVendorStatusEmailHtml, getVendorStatusEmailSubject } from '@/lib/vendorEmailTemplates';

export function useVendorCategories() {
  return useQuery({
    queryKey: ['vendor-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_en');
      
      if (error) throw error;
      return data as VendorCategory[];
    },
  });
}

// Fetch vendor category mappings for a specific vendor
export function useVendorCategoryMappings(vendorId?: string) {
  return useQuery({
    queryKey: ['vendor-category-mappings', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from('vendor_category_mappings')
        .select(`
          *,
          category:vendor_categories(*)
        `)
        .eq('vendor_id', vendorId);
      
      if (error) throw error;
      return data as VendorCategoryMapping[];
    },
    enabled: !!vendorId,
  });
}

export function useVendors(filters?: {
  status?: VendorStatus;
  vendor_type?: VendorType;
  category_id?: string;
  category_ids?: string[];
  search?: string;
}) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      // If filtering by category, we need to join with vendor_category_mappings
      if (filters?.category_id || (filters?.category_ids && filters.category_ids.length > 0)) {
        const categoryIds = filters.category_ids || (filters.category_id ? [filters.category_id] : []);
        
        // Get vendor IDs that have any of the specified categories
        const { data: mappings, error: mappingError } = await supabase
          .from('vendor_category_mappings')
          .select('vendor_id')
          .in('category_id', categoryIds);
        
        if (mappingError) throw mappingError;
        
        const vendorIds = [...new Set(mappings?.map(m => m.vendor_id) || [])];
        
        if (vendorIds.length === 0) return [];
        
        let query = supabase
          .from('vendors')
          .select(`
            *,
            category:vendor_categories(*)
          `)
          .in('id', vendorIds)
          .order('created_at', { ascending: false });
        
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.vendor_type) query = query.eq('vendor_type', filters.vendor_type);
        if (filters?.search) {
          query = query.or(`company_name_en.ilike.%${filters.search}%,company_name_ar.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data as Vendor[];
      }
      
      // Default query without category filter
      let query = supabase
        .from('vendors')
        .select(`
          *,
          category:vendor_categories(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.vendor_type) {
        query = query.eq('vendor_type', filters.vendor_type);
      }
      if (filters?.search) {
        query = query.or(`company_name_en.ilike.%${filters.search}%,company_name_ar.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          category:vendor_categories(*),
          contacts:vendor_contacts(*),
          bank_details:vendor_bank_details(*),
          documents:vendor_documents(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: VendorFormData) => {
      // Get next vendor code
      const { data: codeData, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'VND' });

      if (codeError) throw codeError;

      // Create vendor (use first category_id for legacy field, or null)
      const primaryCategoryId = formData.category_ids?.[0] || formData.category_id || null;
      
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          code: codeData,
          company_name_en: formData.company_name_en,
          company_name_ar: formData.company_name_ar,
          vendor_type: formData.vendor_type,
          category_id: primaryCategoryId,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          trade_license_no: formData.trade_license_no,
          trade_license_expiry: formData.trade_license_expiry || null,
          tax_registration_no: formData.tax_registration_no,
          address_en: formData.address_en,
          address_ar: formData.address_ar,
          city: formData.city,
          country: formData.country,
          notes: formData.notes,
          created_by: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (vendorError) throw vendorError;

      // Create category mappings for multi-category support
      const categoryIds = formData.category_ids || (formData.category_id ? [formData.category_id] : []);
      if (categoryIds.length > 0) {
        const { error: mappingError } = await supabase
          .from('vendor_category_mappings')
          .insert(
            categoryIds.map((catId) => ({
              vendor_id: vendor.id,
              category_id: catId,
            }))
          );
        if (mappingError) throw mappingError;
      }

      // Create contacts
      if (formData.contacts?.length > 0) {
        const { error: contactsError } = await supabase
          .from('vendor_contacts')
          .insert(
            formData.contacts.map((c) => ({
              vendor_id: vendor.id,
              name: c.name,
              designation: c.designation,
              email: c.email,
              phone: c.phone,
              is_primary: c.is_primary,
            }))
          );
        if (contactsError) throw contactsError;
      }

      // Create bank details
      if (formData.bank_details?.length > 0) {
        const { error: bankError } = await supabase
          .from('vendor_bank_details')
          .insert(
            formData.bank_details.map((b) => ({
              vendor_id: vendor.id,
              bank_name: b.bank_name,
              account_name: b.account_name,
              account_number: b.account_number,
              iban: b.iban,
              swift_code: b.swift_code,
              currency: b.currency,
              is_primary: b.is_primary,
            }))
          );
        if (bankError) throw bankError;
      }

      return vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-category-mappings'] });
      toast.success('Vendor created successfully');
    },
    onError: (error) => {
      console.error('Create vendor error:', error);
      toast.error('Failed to create vendor');
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vendor> & { id: string }) => {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return vendor;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
      toast.success('Vendor updated successfully');
    },
    onError: (error) => {
      console.error('Update vendor error:', error);
      toast.error('Failed to update vendor');
    },
  });
}

export function useApproveVendor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes,
      sendNotification = true 
    }: { 
      id: string; 
      status: VendorStatus; 
      notes?: string;
      sendNotification?: boolean;
    }) => {
      // First, get the vendor details for email notification
      const { data: vendor, error: fetchError } = await supabase
        .from('vendors')
        .select('code, company_name_en, company_name_ar, email')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update vendor status
      const { data, error } = await supabase
        .from('vendors')
        .update({
          status,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes: notes || undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send email notification if enabled and vendor has email
      if (sendNotification && vendor.email) {
        try {
          const htmlBody = generateVendorStatusEmailHtml({
            vendorName: vendor.company_name_en,
            vendorEmail: vendor.email,
            vendorCode: vendor.code,
            newStatus: status,
            notes,
            language: 'en',
          });

          const subject = getVendorStatusEmailSubject(vendor.code, status, 'en');

          await supabase.functions.invoke('send-email', {
            body: {
              to: [{ email: vendor.email, name: vendor.company_name_en }],
              subject,
              htmlBody,
            },
          });

          console.log('Vendor status notification email sent to:', vendor.email);
        } catch (emailError) {
          console.error('Failed to send vendor notification email:', emailError);
          // Don't throw - email failure shouldn't block the status update
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
      toast.success(`Vendor ${variables.status === 'approved' ? 'approved' : 'status updated'} successfully`);
    },
    onError: (error) => {
      console.error('Approve vendor error:', error);
      toast.error('Failed to update vendor status');
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (error) => {
      console.error('Delete vendor error:', error);
      toast.error('Failed to delete vendor');
    },
  });
}

export function useVendorAI() {
  return useMutation({
    mutationFn: async ({ action, imageBase64, vendorData }: {
      action: 'extract_document' | 'calculate_risk';
      imageBase64?: string;
      vendorData?: Partial<Vendor>;
    }) => {
      const { data, error } = await supabase.functions.invoke('vendor-ai', {
        body: { action, imageBase64, vendorData },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.result;
    },
  });
}
