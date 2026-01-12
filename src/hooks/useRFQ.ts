import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  RFQ, RFQItem, RFQVendor, RFQFormData, 
  ProcurementStatus, ItemFormData 
} from '@/types/procurement';

interface RFQFilters {
  status?: ProcurementStatus;
  procurement_type?: string;
  search?: string;
}

export function useRFQs(filters?: RFQFilters) {
  return useQuery({
    queryKey: ['rfqs', filters],
    queryFn: async () => {
      let query = supabase
        .from('rfqs')
        .select(`
          *,
          rfi:rfis(id, code, title_en, title_ar),
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.procurement_type) {
        query = query.eq('procurement_type', filters.procurement_type as any);
      }
      if (filters?.search) {
        query = query.or(`title_en.ilike.%${filters.search}%,title_ar.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RFQ[];
    }
  });
}

export function useRFQ(id: string) {
  return useQuery({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfqs')
        .select(`
          *,
          rfi:rfis(id, code, title_en, title_ar),
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as RFQ | null;
    },
    enabled: !!id
  });
}

export function useCreateRFQ() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RFQFormData) => {
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'RFQ' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();
      
      const { data: rfq, error } = await supabase
        .from('rfqs')
        .insert({
          ...data,
          code: codeResult,
          requested_by: user.user?.id,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return rfq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      toast({ title: 'RFQ created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating RFQ', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateRFQ() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RFQFormData & { status: ProcurementStatus }> }) => {
      const { data: rfq, error } = await supabase
        .from('rfqs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rfq;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['rfq', variables.id] });
      toast({ title: 'RFQ updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating RFQ', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreateRFQFromRFI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rfiId: string) => {
      // Get RFI details
      const { data: rfi, error: rfiError } = await supabase
        .from('rfis')
        .select('*, rfi_items(*), rfi_vendors(*)')
        .eq('id', rfiId)
        .single();

      if (rfiError) throw rfiError;

      // Get RFQ code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'RFQ' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();

      // Create RFQ
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .insert({
          code: codeResult,
          rfi_id: rfiId,
          title_en: rfi.title_en,
          title_ar: rfi.title_ar,
          description: rfi.description,
          procurement_type: rfi.procurement_type,
          project_id: rfi.project_id,
          cost_center_id: rfi.cost_center_id,
          department_id: rfi.department_id,
          requested_by: user.user?.id,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (rfqError) throw rfqError;

      // Copy items
      if (rfi.rfi_items && rfi.rfi_items.length > 0) {
        const items = rfi.rfi_items.map((item: any) => ({
          rfq_id: rfq.id,
          rfi_item_id: item.id,
          item_number: item.item_number,
          description_en: item.description_en,
          description_ar: item.description_ar,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications
        }));

        await supabase.from('rfq_items').insert(items);
      }

      // Copy vendors
      if (rfi.rfi_vendors && rfi.rfi_vendors.length > 0) {
        const vendors = rfi.rfi_vendors.map((v: any) => ({
          rfq_id: rfq.id,
          vendor_id: v.vendor_id
        }));

        await supabase.from('rfq_vendors').insert(vendors);
      }

      // Update RFI status
      await supabase
        .from('rfis')
        .update({ status: 'completed' })
        .eq('id', rfiId);

      return rfq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      toast({ title: 'RFQ created from RFI successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating RFQ', description: error.message, variant: 'destructive' });
    }
  });
}

// RFQ Items
export function useRFQItems(rfqId: string) {
  return useQuery({
    queryKey: ['rfq-items', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_items')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('item_number');
      
      if (error) throw error;
      return data as RFQItem[];
    },
    enabled: !!rfqId
  });
}

export function useAddRFQItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfqId, data }: { rfqId: string; data: ItemFormData }) => {
      const { data: items } = await supabase
        .from('rfq_items')
        .select('item_number')
        .eq('rfq_id', rfqId)
        .order('item_number', { ascending: false })
        .limit(1);
      
      const nextNumber = items && items.length > 0 ? items[0].item_number + 1 : 1;

      const { data: item, error } = await supabase
        .from('rfq_items')
        .insert({
          rfq_id: rfqId,
          item_number: nextNumber,
          description_en: data.description_en,
          description_ar: data.description_ar,
          quantity: data.quantity,
          unit: data.unit,
          specifications: data.specifications
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-items', variables.rfqId] });
      toast({ title: 'Item added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    }
  });
}

// RFQ Vendors
export function useRFQVendors(rfqId: string) {
  return useQuery({
    queryKey: ['rfq-vendors', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_vendors')
        .select(`
          *,
          vendor:vendors(id, company_name_en, company_name_ar, code),
          prices:rfq_vendor_prices(id, rfq_item_id, unit_price, total_price, notes)
        `)
        .eq('rfq_id', rfqId);
      
      if (error) throw error;
      return data as RFQVendor[];
    },
    enabled: !!rfqId
  });
}

export function useAddRFQVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfqId, vendorId }: { rfqId: string; vendorId: string }) => {
      const { data, error } = await supabase
        .from('rfq_vendors')
        .insert({ rfq_id: rfqId, vendor_id: vendorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', variables.rfqId] });
      toast({ title: 'Vendor added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding vendor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateRFQVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rfqId, data }: { id: string; rfqId: string; data: Partial<RFQVendor> }) => {
      const { data: vendor, error } = await supabase
        .from('rfq_vendors')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { vendor, rfqId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', data.rfqId] });
      toast({ title: 'Vendor quotation updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating vendor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useSelectRFQVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rfqId }: { id: string; rfqId: string }) => {
      // Deselect all vendors first
      await supabase
        .from('rfq_vendors')
        .update({ is_selected: false })
        .eq('rfq_id', rfqId);

      // Select the chosen vendor
      const { data, error } = await supabase
        .from('rfq_vendors')
        .update({ is_selected: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, rfqId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', data.rfqId] });
      toast({ title: 'Vendor selected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error selecting vendor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useSetRFQVendorPrices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfqVendorId, rfqId, prices }: { 
      rfqVendorId: string; 
      rfqId: string; 
      prices: Array<{ rfq_item_id: string; unit_price: number; total_price: number }> 
    }) => {
      // Delete existing prices
      await supabase
        .from('rfq_vendor_prices')
        .delete()
        .eq('rfq_vendor_id', rfqVendorId);

      // Insert new prices
      if (prices.length > 0) {
        const { error } = await supabase
          .from('rfq_vendor_prices')
          .insert(prices.map(p => ({
            rfq_vendor_id: rfqVendorId,
            rfq_item_id: p.rfq_item_id,
            unit_price: p.unit_price,
            total_price: p.total_price
          })));

        if (error) throw error;
      }

      return { rfqVendorId, rfqId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', data.rfqId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving prices', description: error.message, variant: 'destructive' });
    }
  });
}
