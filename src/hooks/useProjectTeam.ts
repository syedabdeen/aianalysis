import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_by: string | null;
  added_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export function useProjectTeamMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-team', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team_members')
        .select(`
          *,
          user:profiles!project_team_members_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .order('added_at', { ascending: true });
      
      if (error) throw error;
      return data as ProjectTeamMember[];
    },
    enabled: !!projectId,
  });
}

export function useAddProjectTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (member: {
      project_id: string;
      user_id: string;
      role?: string;
    }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('project_team_members')
        .insert({
          project_id: member.project_id,
          user_id: member.user_id,
          role: member.role || 'member',
          added_by: currentUser?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-team', variables.project_id] });
      toast.success('Team member added successfully');
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('User is already a team member');
      } else {
        toast.error(`Failed to add team member: ${error.message}`);
      }
    },
  });
}

export function useRemoveProjectTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-team', data.projectId] });
      toast.success('Team member removed');
    },
    onError: (error) => {
      toast.error(`Failed to remove team member: ${error.message}`);
    },
  });
}

export function useUpdateProjectTeamMemberRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId, role }: { id: string; projectId: string; role: string }) => {
      const { data, error } = await supabase
        .from('project_team_members')
        .update({ role })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-team', data.projectId] });
      toast.success('Team member role updated');
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}
