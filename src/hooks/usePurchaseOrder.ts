import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  PurchaseOrder, PurchaseOrderItem, POFormData, 
  ProcurementStatus 
} from '@/types/procurement';

interface POFilters {
  status?: ProcurementStatus;
  procurement_type?: string;
  search?: string;
}

export function usePurchaseOrders(filters?: POFilters) {
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          pr:purchase_requests(id, code),
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
      return data as PurchaseOrder[];
    }
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          pr:purchase_requests(id, code),
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar),
          vendor:vendors(id, company_name_en, company_name_ar, code)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PurchaseOrder | null;
    },
    enabled: !!id
  });
}

export function useCreatePOFromPR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prId: string) => {
      // Get PR details
      const { data: pr, error: prError } = await supabase
        .from('purchase_requests')
        .select('*, purchase_request_items(*)')
        .eq('id', prId)
        .single();

      if (prError) throw prError;

      if (pr.status !== 'approved') {
        throw new Error('Purchase Request must be approved before creating PO');
      }

      // Get PO code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PO' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();

      // Create PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          code: codeResult,
          pr_id: prId,
          title_en: pr.title_en,
          title_ar: pr.title_ar,
          description: pr.description,
          procurement_type: pr.procurement_type,
          project_id: pr.project_id,
          cost_center_id: pr.cost_center_id,
          department_id: pr.department_id,
          vendor_id: pr.vendor_id,
          subtotal: pr.subtotal,
          tax_amount: pr.tax_amount,
          total_amount: pr.total_amount,
          pr_total_amount: pr.total_amount,
          currency: pr.currency,
          delivery_address: pr.delivery_address,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (poError) throw poError;

      // Copy items
      if (pr.purchase_request_items && pr.purchase_request_items.length > 0) {
        const items = pr.purchase_request_items.map((item: any) => ({
          po_id: po.id,
          pr_item_id: item.id,
          item_number: item.item_number,
          description_en: item.description_en,
          description_ar: item.description_ar,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          specifications: item.specifications
        }));

        await supabase.from('purchase_order_items').insert(items);
      }

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating PO', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<POFormData & { status: ProcurementStatus; subtotal: number; tax_amount: number; total_amount: number; workflow_id?: string | null }> }) => {
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return po;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
      toast({ title: 'Purchase Order updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating PO', description: error.message, variant: 'destructive' });
    }
  });
}

export function useIssuePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      workflowId,
    }: {
      id: string;
      workflowId?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const updateData: Record<string, any> = {
        status: 'submitted',
        issued_by: user.user?.id,
        issued_at: new Date().toISOString(),
      };

      // Only set workflow_id when provided to avoid accidentally clearing it
      if (workflowId !== undefined) {
        updateData.workflow_id = workflowId;
      }

      const { data: po, error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return po;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
      toast({ title: 'Purchase Order issued successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error issuing PO', description: error.message, variant: 'destructive' });
    },
  });
}

// PO Items
export function usePOItems(poId: string) {
  return useQuery({
    queryKey: ['po-items', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', poId)
        .order('item_number');
      
      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!poId
  });
}

export function useUpdatePOItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, poId, data }: { id: string; poId: string; data: Partial<PurchaseOrderItem> }) => {
      const { data: item, error } = await supabase
        .from('purchase_order_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { item, poId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po-items', data.poId] });
      toast({ title: 'Item updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating item', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      pr_id: string;
      title_en: string;
      title_ar: string;
      description?: string;
      procurement_type: 'material' | 'service' | 'subcontract';
      project_id?: string;
      cost_center_id?: string;
      department_id?: string;
      vendor_id: string;
      subtotal: number;
      tax_amount: number;
      total_amount: number;
      pr_total_amount: number;
      currency: string;
      payment_terms?: string;
      delivery_terms?: string;
      delivery_date?: string;
      delivery_address?: string;
      terms_conditions?: string;
    }) => {
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PO' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();

      const insertData = {
        ...data,
        code: codeResult,
        created_by: user.user?.id
      };

      const { data: po, error } = await supabase
        .from('purchase_orders')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating PO', description: error.message, variant: 'destructive' });
    }
  });
}

export function useAddPOItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ poId, data }: { 
      poId: string; 
      data: {
        item_number: number;
        description_en: string;
        description_ar: string;
        quantity: number;
        unit: string;
        unit_price: number;
        total_price: number;
        specifications?: string;
        pr_item_id?: string;
      }
    }) => {
      const { data: item, error } = await supabase
        .from('purchase_order_items')
        .insert({
          po_id: poId,
          ...data
        })
        .select()
        .single();

      if (error) throw error;
      return { item, poId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po-items', data.poId] });
      toast({ title: 'Item added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    }
  });
}
