import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserApprover {
  id: string;
  user_id: string;
  approver_role: string;
  modules: string[];
  max_approval_amount: number | null;
  is_active: boolean;
  assigned_by: string | null;
  assigned_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface ApprovalThreshold {
  id: string;
  module: string;
  min_amount: number;
  max_amount: number | null;
  approver_role: string;
  approver_role_ar: string;
  sequence_order: number;
  is_active: boolean;
}

export function useApprovalThresholds(module?: string) {
  return useQuery({
    queryKey: ['approval-thresholds', module],
    queryFn: async () => {
      let query = supabase
        .from('approval_thresholds')
        .select('*')
        .order('sequence_order', { ascending: true });
      
      if (module) {
        query = query.eq('module', module);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalThreshold[];
    },
  });
}

export function useUserApprovers() {
  return useQuery({
    queryKey: ['user-approvers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_approvers')
        .select(`
          *,
          user:profiles!user_approvers_user_id_fkey(id, full_name, email)
        `)
        .order('approver_role', { ascending: true });
      
      if (error) throw error;
      return data as UserApprover[];
    },
  });
}

export function useAddUserApprover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (approver: {
      user_id: string;
      approver_role: string;
      modules: string[];
      max_approval_amount?: number | null;
    }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('user_approvers')
        .insert({
          ...approver,
          assigned_by: currentUser?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-approvers'] });
      toast.success('User approver added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add user approver: ${error.message}`);
    },
  });
}

export function useUpdateUserApprover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserApprover> }) => {
      const { data, error } = await supabase
        .from('user_approvers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-approvers'] });
      toast.success('User approver updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update user approver: ${error.message}`);
    },
  });
}

export function useDeleteUserApprover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_approvers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-approvers'] });
      toast.success('User approver removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove user approver: ${error.message}`);
    },
  });
}

export function useUpdateApprovalThreshold() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ApprovalThreshold> }) => {
      const { data, error } = await supabase
        .from('approval_thresholds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-thresholds'] });
      toast.success('Threshold updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update threshold: ${error.message}`);
    },
  });
}

export function useAddApprovalThreshold() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (threshold: {
      module: string;
      min_amount: number;
      max_amount?: number | null;
      approver_role: string;
      approver_role_ar: string;
      sequence_order: number;
    }) => {
      const { data, error } = await supabase
        .from('approval_thresholds')
        .insert(threshold)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-thresholds'] });
      toast.success('Threshold added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add threshold: ${error.message}`);
    },
  });
}

export function useDeleteApprovalThreshold() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('approval_thresholds')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-thresholds'] });
      toast.success('Threshold deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete threshold: ${error.message}`);
    },
  });
}
