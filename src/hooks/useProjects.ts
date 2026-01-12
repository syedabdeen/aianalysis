import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  Project, 
  ProjectVariation, 
  ProjectMilestone, 
  ProjectBudgetTransaction, 
  ProjectAlert,
  ProjectFormData,
  VariationFormData,
  MilestoneFormData,
  ProjectStatus,
  MilestoneStatus
} from '@/types/project';

interface ProjectFilters {
  status?: ProjectStatus;
  department_id?: string;
  search?: string;
}

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar, code),
          manager:profiles!projects_manager_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id);
      }
      if (filters?.search) {
        query = query.or(`name_en.ilike.%${filters.search}%,name_ar.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    }
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          cost_center:cost_centers(id, name_en, name_ar, code),
          department:departments(id, name_en, name_ar, code),
          manager:profiles!projects_manager_id_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ProjectFormData) => {
      // Get next project code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PRJ' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();
      
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          ...data,
          code: codeResult,
          revised_budget: data.original_budget,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectFormData & { status: ProjectStatus; progress_percentage: number }> }) => {
      const { data: project, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      toast({ title: 'Project updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating project', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting project', description: error.message, variant: 'destructive' });
    }
  });
}

// Variations
export function useProjectVariations(projectId: string) {
  return useQuery({
    queryKey: ['project-variations', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_variations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectVariation[];
    },
    enabled: !!projectId
  });
}

export function useCreateVariation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: VariationFormData }) => {
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'VAR' });
      
      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();

      const { data: variation, error } = await supabase
        .from('project_variations')
        .insert({
          ...data,
          project_id: projectId,
          variation_code: codeResult,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return variation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-variations', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({ title: 'Variation created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating variation', description: error.message, variant: 'destructive' });
    }
  });
}

export function useApproveVariation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: variation, error } = await supabase
        .from('project_variations')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_by: user.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return variation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-variations', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: `Variation ${data.status}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating variation', description: error.message, variant: 'destructive' });
    }
  });
}

// Milestones
export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as ProjectMilestone[];
    },
    enabled: !!projectId
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: MilestoneFormData }) => {
      const { data: milestone, error } = await supabase
        .from('project_milestones')
        .insert({
          ...data,
          project_id: projectId
        })
        .select()
        .single();

      if (error) throw error;
      return milestone;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', variables.projectId] });
      toast({ title: 'Milestone created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating milestone', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MilestoneFormData & { status: MilestoneStatus; completed_date: string }> }) => {
      const { data: milestone, error } = await supabase
        .from('project_milestones')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return milestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', data.project_id] });
      toast({ title: 'Milestone updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating milestone', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', data.projectId] });
      toast({ title: 'Milestone deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting milestone', description: error.message, variant: 'destructive' });
    }
  });
}

// Budget Transactions
export function useProjectTransactions(projectId: string) {
  return useQuery({
    queryKey: ['project-transactions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budget_transactions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectBudgetTransaction[];
    },
    enabled: !!projectId
  });
}

// Alerts
export function useProjectAlerts(projectId?: string) {
  return useQuery({
    queryKey: ['project-alerts', projectId],
    queryFn: async () => {
      let query = supabase
        .from('project_alerts')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectAlert[];
    }
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_alerts')
        .update({ is_dismissed: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-alerts'] });
    }
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_alerts')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-alerts'] });
    }
  });
}
