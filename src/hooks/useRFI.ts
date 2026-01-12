import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  RFI, RFIItem, RFIVendor, RFIFormData, 
  ProcurementStatus, ItemFormData 
} from '@/types/procurement';

interface RFIFilters {
  status?: ProcurementStatus;
  procurement_type?: string;
  search?: string;
}

export function useRFIs(filters?: RFIFilters) {
  return useQuery({
    queryKey: ['rfis', filters],
    queryFn: async () => {
      let query = supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar),
          requester:profiles!rfis_requested_by_fkey(id, full_name, email)
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
      return data as RFI[];
    }
  });
}

export function useRFI(id: string) {
  return useQuery({
    queryKey: ['rfi', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar),
          requester:profiles!rfis_requested_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as RFI | null;
    },
    enabled: !!id
  });
}

export function useCreateRFI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RFIFormData) => {
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'RFI' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();
      
      const { data: rfi, error } = await supabase
        .from('rfis')
        .insert({
          ...data,
          code: codeResult,
          requested_by: user.user?.id,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return rfi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      toast({ title: 'RFI created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating RFI', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateRFI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RFIFormData & { status: ProcurementStatus }> }) => {
      const { data: rfi, error } = await supabase
        .from('rfis')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rfi;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['rfi', variables.id] });
      toast({ title: 'RFI updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating RFI', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteRFI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rfis').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      toast({ title: 'RFI deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting RFI', description: error.message, variant: 'destructive' });
    }
  });
}

// RFI Items
export function useRFIItems(rfiId: string) {
  return useQuery({
    queryKey: ['rfi-items', rfiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfi_items')
        .select('*')
        .eq('rfi_id', rfiId)
        .order('item_number');
      
      if (error) throw error;
      return data as RFIItem[];
    },
    enabled: !!rfiId
  });
}

export function useAddRFIItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfiId, data }: { rfiId: string; data: ItemFormData }) => {
      // Get next item number
      const { data: items } = await supabase
        .from('rfi_items')
        .select('item_number')
        .eq('rfi_id', rfiId)
        .order('item_number', { ascending: false })
        .limit(1);
      
      const nextNumber = items && items.length > 0 ? items[0].item_number + 1 : 1;

      const { data: item, error } = await supabase
        .from('rfi_items')
        .insert({
          rfi_id: rfiId,
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
      queryClient.invalidateQueries({ queryKey: ['rfi-items', variables.rfiId] });
      toast({ title: 'Item added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteRFIItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rfiId }: { id: string; rfiId: string }) => {
      const { error } = await supabase.from('rfi_items').delete().eq('id', id);
      if (error) throw error;
      return { rfiId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfi-items', data.rfiId] });
      toast({ title: 'Item deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting item', description: error.message, variant: 'destructive' });
    }
  });
}

// RFI Vendors
export function useRFIVendors(rfiId: string) {
  return useQuery({
    queryKey: ['rfi-vendors', rfiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfi_vendors')
        .select(`
          *,
          vendor:vendors(id, company_name_en, company_name_ar, code)
        `)
        .eq('rfi_id', rfiId);
      
      if (error) throw error;
      return data as RFIVendor[];
    },
    enabled: !!rfiId
  });
}

export function useAddRFIVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfiId, vendorId }: { rfiId: string; vendorId: string }) => {
      const { data, error } = await supabase
        .from('rfi_vendors')
        .insert({ rfi_id: rfiId, vendor_id: vendorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfi-vendors', variables.rfiId] });
      toast({ title: 'Vendor added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding vendor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useRemoveRFIVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rfiId }: { id: string; rfiId: string }) => {
      const { error } = await supabase.from('rfi_vendors').delete().eq('id', id);
      if (error) throw error;
      return { rfiId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfi-vendors', data.rfiId] });
      toast({ title: 'Vendor removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing vendor', description: error.message, variant: 'destructive' });
    }
  });
}
