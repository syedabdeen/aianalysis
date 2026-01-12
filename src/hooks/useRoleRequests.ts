import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  line_manager_id: string | null;
  line_manager_approved_at: string | null;
  line_manager_comments: string | null;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  admin_comments: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  line_manager?: {
    id: string;
    full_name: string | null;
  };
}

export function useRoleRequests(status?: string) {
  return useQuery({
    queryKey: ['role-requests', status],
    queryFn: async () => {
      let query = supabase
        .from('role_requests')
        .select(`
          *,
          user:profiles!role_requests_user_id_fkey(id, full_name, email),
          line_manager:profiles!role_requests_line_manager_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RoleRequest[];
    },
  });
}

export function useCreateRoleRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: {
      requested_role: string;
      justification: string;
    }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user?.id) throw new Error('Not authenticated');
      
      // Get user's line manager
      const { data: profile } = await supabase
        .from('profiles')
        .select('line_manager_id')
        .eq('id', currentUser.user.id)
        .single();
      
      const { data, error } = await supabase
        .from('role_requests')
        .insert({
          user_id: currentUser.user.id,
          requested_role: request.requested_role as any,
          justification: request.justification,
          line_manager_id: profile?.line_manager_id,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests'] });
      toast.success('Role request submitted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to submit role request: ${error.message}`);
    },
  });
}

export function useApproveRoleRequestByManager() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const { data, error } = await supabase
        .from('role_requests')
        .update({
          line_manager_approved_at: new Date().toISOString(),
          line_manager_comments: comments,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests'] });
      toast.success('Role request approved by line manager');
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
}

export function useApproveRoleRequestByAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      
      // Get the role request to assign the role
      const { data: request } = await supabase
        .from('role_requests')
        .select('user_id, requested_role')
        .eq('id', id)
        .single();
      
      if (!request) throw new Error('Request not found');
      
      // Update the role request status
      const { error: updateError } = await supabase
        .from('role_requests')
        .update({
          status: 'approved',
          admin_approved_by: currentUser?.user?.id,
          admin_approved_at: new Date().toISOString(),
          admin_comments: comments,
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Add the user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: request.requested_role,
        });
      
      // Ignore duplicate role error
      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }
      
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role assigned successfully');
    },
    onError: (error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });
}

export function useRejectRoleRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('role_requests')
        .update({
          status: 'rejected',
          admin_approved_by: currentUser?.user?.id,
          admin_approved_at: new Date().toISOString(),
          admin_comments: comments,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests'] });
      toast.success('Role request rejected');
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });
}
