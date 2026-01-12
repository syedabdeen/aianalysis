import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  PurchaseRequest, PurchaseRequestItem, PRFormData, 
  ProcurementStatus, ItemFormData 
} from '@/types/procurement';

interface PRFilters {
  status?: ProcurementStatus;
  procurement_type?: string;
  search?: string;
}

export function usePurchaseRequests(filters?: PRFilters) {
  return useQuery({
    queryKey: ['purchase-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_requests')
        .select(`
          *,
          rfq:rfqs!purchase_requests_rfq_id_fkey(id, code),
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar),
          vendor:vendors(id, company_name_en, company_name_ar, code)
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
      return data as PurchaseRequest[];
    }
  });
}

export function usePurchaseRequest(id: string) {
  return useQuery({
    queryKey: ['purchase-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select(`
          *,
          rfq:rfqs!purchase_requests_rfq_id_fkey(id, code),
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar),
          vendor:vendors(id, company_name_en, company_name_ar, code)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PurchaseRequest | null;
    },
    enabled: !!id
  });
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: PRFormData) => {
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PR' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();
      
      const { data: pr, error } = await supabase
        .from('purchase_requests')
        .insert({
          ...data,
          code: codeResult,
          requested_by: user.user?.id,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return pr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase Request created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating PR', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdatePurchaseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PRFormData & { status: ProcurementStatus; subtotal: number; tax_amount: number; total_amount: number }> }) => {
      const { data: pr, error } = await supabase
        .from('purchase_requests')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return pr;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-request', variables.id] });
      toast({ title: 'Purchase Request updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating PR', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreatePRFromRFQ() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rfqId: string) => {
      // Get RFQ details with selected vendor
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .select(`
          *, 
          rfq_items(*),
          rfq_vendors!inner(*, vendor:vendors(*))
        `)
        .eq('id', rfqId)
        .eq('rfq_vendors.is_selected', true)
        .single();

      if (rfqError) throw rfqError;

      const selectedVendor = rfq.rfq_vendors?.[0];
      if (!selectedVendor) throw new Error('No vendor selected for this RFQ');

      // Get PR code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PR' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();

      // Create PR
      const { data: pr, error: prError } = await supabase
        .from('purchase_requests')
        .insert({
          code: codeResult,
          rfq_id: rfqId,
          title_en: rfq.title_en,
          title_ar: rfq.title_ar,
          description: rfq.description,
          procurement_type: rfq.procurement_type,
          project_id: rfq.project_id,
          cost_center_id: rfq.cost_center_id,
          department_id: rfq.department_id,
          vendor_id: selectedVendor.vendor_id,
          total_amount: selectedVendor.total_amount || 0,
          subtotal: selectedVendor.total_amount || 0,
          requested_by: user.user?.id,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (prError) throw prError;

      // Get vendor prices for items
      const { data: vendorPrices } = await supabase
        .from('rfq_vendor_prices')
        .select('*')
        .eq('rfq_vendor_id', selectedVendor.id);

      // Copy items with prices
      if (rfq.rfq_items && rfq.rfq_items.length > 0) {
        const items = rfq.rfq_items.map((item: any) => {
          const price = vendorPrices?.find(p => p.rfq_item_id === item.id);
          return {
            pr_id: pr.id,
            rfq_item_id: item.id,
            item_number: item.item_number,
            description_en: item.description_en,
            description_ar: item.description_ar,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: price?.unit_price || 0,
            total_price: price?.total_price || 0,
            specifications: item.specifications
          };
        });

        await supabase.from('purchase_request_items').insert(items);
      }

      // Update RFQ status
      await supabase
        .from('rfqs')
        .update({ status: 'completed' })
        .eq('id', rfqId);

      return pr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase Request created from RFQ successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating PR', description: error.message, variant: 'destructive' });
    }
  });
}

// PR Items
export function usePRItems(prId: string) {
  return useQuery({
    queryKey: ['pr-items', prId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('pr_id', prId)
        .order('item_number');
      
      if (error) throw error;
      return data as PurchaseRequestItem[];
    },
    enabled: !!prId
  });
}

export function useAddPRItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ prId, data }: { prId: string; data: ItemFormData & { unit_price: number } }) => {
      const { data: items } = await supabase
        .from('purchase_request_items')
        .select('item_number')
        .eq('pr_id', prId)
        .order('item_number', { ascending: false })
        .limit(1);
      
      const nextNumber = items && items.length > 0 ? items[0].item_number + 1 : 1;

      const { data: item, error } = await supabase
        .from('purchase_request_items')
        .insert({
          pr_id: prId,
          item_number: nextNumber,
          description_en: data.description_en,
          description_ar: data.description_ar,
          quantity: data.quantity,
          unit: data.unit,
          unit_price: data.unit_price,
          total_price: data.quantity * data.unit_price,
          specifications: data.specifications
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pr-items', variables.prId] });
      toast({ title: 'Item added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdatePRTotals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prId: string) => {
      // Calculate totals from items
      const { data: items, error: itemsError } = await supabase
        .from('purchase_request_items')
        .select('total_price')
        .eq('pr_id', prId);

      if (itemsError) throw itemsError;

      const subtotal = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

      const { error } = await supabase
        .from('purchase_requests')
        .update({ subtotal, total_amount: subtotal })
        .eq('id', prId);

      if (error) throw error;
      return { prId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-request', data.prId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    }
  });
}
