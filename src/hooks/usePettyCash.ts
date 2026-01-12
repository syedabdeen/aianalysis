import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PettyCashItem {
  id?: string;
  item_number: number;
  expense_date: string | null;
  description: string;
  amount: number;
  receipt_attached: boolean;
  receipt_url: string | null;
}

export interface PettyCashClaim {
  id: string;
  claim_code: string;
  claim_date: string;
  project_id: string | null;
  total_allocated: number;
  total_spent: number;
  balance_remaining: number;
  replenishment_amount: number;
  status: 'draft' | 'pending_gm_approval' | 'approved_pending_payment' | 'paid' | 'rejected';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  gm_approved_by: string | null;
  gm_approved_at: string | null;
  gm_rejection_reason: string | null;
  paid_by: string | null;
  paid_at: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  currency: string;
  projects?: { name_en: string; name_ar: string; code: string } | null;
  creator?: { full_name: string; email: string } | null;
  gm_approver?: { full_name: string } | null;
  payer?: { full_name: string } | null;
  items?: PettyCashItem[];
}

export const usePettyCashClaims = () => {
  return useQuery({
    queryKey: ['petty-cash-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petty_cash_claims')
        .select(`
          *,
          projects:project_id (name_en, name_ar, code),
          creator:profiles!petty_cash_claims_created_by_fkey (full_name, email),
          gm_approver:profiles!petty_cash_claims_gm_approved_by_fkey (full_name),
          payer:profiles!petty_cash_claims_paid_by_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PettyCashClaim[];
    },
  });
};

export const usePettyCashClaim = (id: string | undefined) => {
  return useQuery({
    queryKey: ['petty-cash-claim', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: claim, error: claimError } = await supabase
        .from('petty_cash_claims')
        .select(`
          *,
          projects:project_id (name_en, name_ar, code),
          creator:profiles!petty_cash_claims_created_by_fkey (full_name, email),
          gm_approver:profiles!petty_cash_claims_gm_approved_by_fkey (full_name),
          payer:profiles!petty_cash_claims_paid_by_fkey (full_name)
        `)
        .eq('id', id)
        .single();

      if (claimError) throw claimError;

      const { data: items, error: itemsError } = await supabase
        .from('petty_cash_items')
        .select('*')
        .eq('claim_id', id)
        .order('item_number', { ascending: true });

      if (itemsError) throw itemsError;

      return { ...claim, items } as unknown as PettyCashClaim;
    },
    enabled: !!id,
  });
};

export const useCreatePettyCashClaim = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      claim_date: string;
      project_id: string | null;
      total_allocated: number;
      items: PettyCashItem[];
    }) => {
      // Generate claim code
      const { data: codeData, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PCC' });

      if (codeError) throw codeError;

      const totalSpent = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Create the claim
      const { data: claim, error: claimError } = await supabase
        .from('petty_cash_claims')
        .insert({
          claim_code: codeData,
          claim_date: data.claim_date,
          project_id: data.project_id,
          total_allocated: data.total_allocated,
          total_spent: totalSpent,
          replenishment_amount: totalSpent,
          created_by: user?.id,
          status: 'draft',
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // Insert items
      const itemsToInsert = data.items
        .filter(item => item.description.trim() !== '')
        .map((item, index) => ({
          claim_id: claim.id,
          item_number: index + 1,
          expense_date: item.expense_date || null,
          description: item.description,
          amount: item.amount || 0,
          receipt_attached: item.receipt_attached,
          receipt_url: item.receipt_url,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('petty_cash_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return claim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claims'] });
      toast.success('Petty cash claim created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create claim: ${error.message}`);
    },
  });
};

export const useUpdatePettyCashClaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      items,
    }: {
      id: string;
      data: Partial<PettyCashClaim>;
      items?: PettyCashItem[];
    }) => {
      // Update claim
      const { error: claimError } = await supabase
        .from('petty_cash_claims')
        .update(data)
        .eq('id', id);

      if (claimError) throw claimError;

      // Update items if provided
      if (items) {
        // Delete existing items
        await supabase.from('petty_cash_items').delete().eq('claim_id', id);

        // Insert new items
        const itemsToInsert = items
          .filter(item => item.description.trim() !== '')
          .map((item, index) => ({
            claim_id: id,
            item_number: index + 1,
            expense_date: item.expense_date || null,
            description: item.description,
            amount: item.amount || 0,
            receipt_attached: item.receipt_attached,
            receipt_url: item.receipt_url,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('petty_cash_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claims'] });
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claim'] });
      toast.success('Petty cash claim updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update claim: ${error.message}`);
    },
  });
};

export const useSubmitPettyCashClaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('petty_cash_claims')
        .update({ status: 'pending_gm_approval' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claims'] });
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claim'] });
      toast.success('Claim submitted for GM approval');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit claim: ${error.message}`);
    },
  });
};

export const useApprovePettyCashClaim = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('petty_cash_claims')
        .update({
          status: 'approved_pending_payment',
          gm_approved_by: user?.id,
          gm_approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claims'] });
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claim'] });
      toast.success('Claim approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve claim: ${error.message}`);
    },
  });
};

export const useRejectPettyCashClaim = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('petty_cash_claims')
        .update({
          status: 'rejected',
          gm_approved_by: user?.id,
          gm_approved_at: new Date().toISOString(),
          gm_rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claims'] });
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claim'] });
      toast.success('Claim rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject claim: ${error.message}`);
    },
  });
};

export const useMarkPettyCashPaid = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      payment_date,
      payment_reference,
    }: {
      id: string;
      payment_date: string;
      payment_reference?: string;
    }) => {
      const { error } = await supabase
        .from('petty_cash_claims')
        .update({
          status: 'paid',
          paid_by: user?.id,
          paid_at: new Date().toISOString(),
          payment_date,
          payment_reference: payment_reference || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claims'] });
      queryClient.invalidateQueries({ queryKey: ['petty-cash-claim'] });
      toast.success('Claim marked as paid');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });
};

export const useUploadPettyCashReceipt = () => {
  return useMutation({
    mutationFn: async ({ file, claimId }: { file: File; claimId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${claimId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('petty-cash-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('petty-cash-receipts')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload receipt: ${error.message}`);
    },
  });
};
