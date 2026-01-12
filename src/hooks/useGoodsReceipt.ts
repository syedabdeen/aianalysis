import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { GoodsReceipt, GoodsReceiptFormData } from '@/types/inventory';

export function useGoodsReceipts(filters?: { po_id?: string; status?: 'pending' | 'partial' | 'complete' }) {
  return useQuery({
    queryKey: ['goods-receipts', filters],
    queryFn: async () => {
      let query = supabase
        .from('goods_receipts')
        .select(`
          *,
          vendor:vendors(company_name_en, company_name_ar),
          purchase_order:purchase_orders(code, title_en, title_ar)
        `)
        .order('created_at', { ascending: false });

      if (filters?.po_id) {
        query = query.eq('po_id', filters.po_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GoodsReceipt[];
    },
  });
}

export function useGoodsReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ['goods-receipt', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: receipt, error: receiptError } = await supabase
        .from('goods_receipts')
        .select(`
          *,
          vendor:vendors(company_name_en, company_name_ar),
          purchase_order:purchase_orders(code, title_en, title_ar)
        `)
        .eq('id', id)
        .maybeSingle();

      if (receiptError) throw receiptError;
      if (!receipt) return null;

      const { data: items, error: itemsError } = await supabase
        .from('goods_receipt_items')
        .select(`
          *,
          inventory_item:inventory_items(id, code, name_en, name_ar)
        `)
        .eq('receipt_id', id);

      if (itemsError) throw itemsError;

      return { ...receipt, items } as GoodsReceipt;
    },
    enabled: !!id,
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: GoodsReceiptFormData) => {
      // Get next sequence code
      const { data: codeData, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'GRN' });

      if (codeError) throw codeError;

      // Get PO details
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('vendor_id')
        .eq('id', formData.po_id)
        .single();

      if (poError) throw poError;

      const { data: userData } = await supabase.auth.getUser();

      // Create goods receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('goods_receipts')
        .insert({
          receipt_code: codeData,
          po_id: formData.po_id,
          vendor_id: po.vendor_id,
          receipt_date: formData.receipt_date,
          notes: formData.notes,
          received_by: userData.user?.id,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items
      const itemsToInsert = formData.items.map(item => ({
        receipt_id: receipt.id,
        po_item_id: item.po_item_id,
        inventory_item_id: item.inventory_item_id || null,
        quantity_ordered: 0, // Will be set by the PO item
        quantity_received: item.quantity_received,
        quantity_rejected: item.quantity_rejected,
        quality_status: item.quality_status,
        inspection_notes: item.inspection_notes,
      }));

      // Get PO item quantities
      const poItemIds = formData.items.map(i => i.po_item_id);
      const { data: poItems, error: poItemsError } = await supabase
        .from('purchase_order_items')
        .select('id, quantity')
        .in('id', poItemIds);

      if (poItemsError) throw poItemsError;

      // Update quantity_ordered in items
      itemsToInsert.forEach(item => {
        const poItem = poItems?.find(p => p.id === item.po_item_id);
        if (poItem) {
          item.quantity_ordered = poItem.quantity;
        }
      });

      const { error: itemsError } = await supabase
        .from('goods_receipt_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Process the goods receipt (update PO items, create stock movements)
      const { error: processError } = await supabase
        .rpc('process_goods_receipt', { _receipt_id: receipt.id });

      if (processError) throw processError;

      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({
        title: 'Goods Receipt Created',
        description: 'Goods receipt has been recorded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function usePOItemsForReceipt(poId: string | undefined) {
  return useQuery({
    queryKey: ['po-items-for-receipt', poId],
    queryFn: async () => {
      if (!poId) return [];

      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', poId);

      if (error) throw error;
      return data;
    },
    enabled: !!poId,
  });
}
