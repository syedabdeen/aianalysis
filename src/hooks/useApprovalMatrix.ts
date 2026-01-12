import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  ApprovalRole, 
  ApprovalRule, 
  ApprovalOverride, 
  ApprovalRuleApprover,
  ApprovalMatrixVersion,
  ApprovalAuditLog,
  ApprovalCategory,
} from '@/types/approval';

// Fetch all approval roles
export function useApprovalRoles() {
  return useQuery({
    queryKey: ['approval-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_roles')
        .select('*')
        .order('hierarchy_level', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ApprovalRole[];
    },
  });
}

// Fetch all approval rules with approvers
export function useApprovalRules(category?: ApprovalCategory) {
  return useQuery({
    queryKey: ['approval-rules', category],
    queryFn: async () => {
      let query = supabase
        .from('approval_rules')
        .select(`
          *,
          approvers:approval_rule_approvers(
            *,
            approval_role:approval_roles(*)
          )
        `)
        .order('min_amount', { ascending: true });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ApprovalRule[];
    },
  });
}

// Fetch all approval overrides
export function useApprovalOverrides() {
  return useQuery({
    queryKey: ['approval-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_overrides')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ApprovalOverride[];
    },
  });
}

// Fetch matrix versions
export function useMatrixVersions() {
  return useQuery({
    queryKey: ['matrix-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_matrix_versions')
        .select('*')
        .order('version_number', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as unknown as ApprovalMatrixVersion[];
    },
  });
}

// Fetch audit logs
export function useApprovalAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['approval-audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ApprovalAuditLog[];
    },
  });
}

// Add approval role
export function useAddApprovalRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (role: { name_en: string; name_ar: string; code: string; description?: string; hierarchy_level: number; is_active: boolean; permissions: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('approval_roles')
        .insert(role as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.rpc('log_approval_audit', {
        _action: 'AddRole',
        _entity_type: 'approval_roles',
        _entity_id: data.id,
        _new_values: data as any,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-roles'] });
      toast.success('Role added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add role: ${error.message}`);
    },
  });
}

// Edit approval role
export function useEditApprovalRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ApprovalRole> }) => {
      // Get old values first
      const { data: oldData } = await supabase
        .from('approval_roles')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('approval_roles')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.rpc('log_approval_audit', {
        _action: 'EditRole',
        _entity_type: 'approval_roles',
        _entity_id: id,
        _old_values: oldData as any,
        _new_values: data as any,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

// Add approval rule
export function useAddApprovalRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: { name_en: string; name_ar: string; category: ApprovalCategory; min_amount: number; max_amount?: number | null; currency: string; department_id?: string | null; requires_sequential: boolean; auto_approve_below?: number | null; escalation_hours?: number | null; is_active: boolean; conditions: Record<string, unknown>; metadata: Record<string, unknown>; created_by?: string | null }) => {
      const { data, error } = await supabase
        .from('approval_rules')
        .insert(rule as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.rpc('log_approval_audit', {
        _action: 'AddRule',
        _entity_type: 'approval_rules',
        _entity_id: data.id,
        _new_values: data as any,
      });
      
      // Create version snapshot
      await supabase.rpc('create_matrix_snapshot', {
        _change_summary: `Added rule: ${rule.name_en}`,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-versions'] });
      toast.success('Rule added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add rule: ${error.message}`);
    },
  });
}

// Edit approval rule
export function useEditApprovalRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ApprovalRule> }) => {
      const { data: oldData } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('approval_rules')
        .update({ ...updates, version: (oldData?.version || 0) + 1 } as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      await supabase.rpc('log_approval_audit', {
        _action: 'EditRule',
        _entity_type: 'approval_rules',
        _entity_id: id,
        _old_values: oldData as any,
        _new_values: data as any,
      });
      
      await supabase.rpc('create_matrix_snapshot', {
        _change_summary: `Updated rule: ${data.name_en}`,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-versions'] });
      toast.success('Rule updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

// Delete approval rule
export function useDeleteApprovalRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: oldData } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('approval_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await supabase.rpc('log_approval_audit', {
        _action: 'DeleteRule',
        _entity_type: 'approval_rules',
        _entity_id: id,
        _old_values: oldData as any,
      });
      
      await supabase.rpc('create_matrix_snapshot', {
        _change_summary: `Deleted rule: ${oldData?.name_en}`,
      });
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-versions'] });
      toast.success('Rule deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

// Add rule approver
export function useAddRuleApprover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (approver: { rule_id: string; approval_role_id: string; sequence_order: number; is_mandatory: boolean; can_delegate: boolean }) => {
      const { data, error } = await supabase
        .from('approval_rule_approvers')
        .insert(approver)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Approver added to rule');
    },
    onError: (error) => {
      toast.error(`Failed to add approver: ${error.message}`);
    },
  });
}

// Remove rule approver
export function useRemoveRuleApprover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('approval_rule_approvers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Approver removed from rule');
    },
    onError: (error) => {
      toast.error(`Failed to remove approver: ${error.message}`);
    },
  });
}

// Add/Edit override
export function useAddApprovalOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (override: any) => {
      const { data, error } = await supabase
        .from('approval_overrides')
        .insert(override)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-overrides'] });
      toast.success('Override added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add override: ${error.message}`);
    },
  });
}

export function useEditApprovalOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('approval_overrides')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-overrides'] });
      toast.success('Override updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update override: ${error.message}`);
    },
  });
}

// Workflow simulation
export function useSimulateWorkflow() {
  return useMutation({
    mutationFn: async ({ 
      category, 
      amount, 
      departmentId 
    }: { 
      category: ApprovalCategory; 
      amount: number; 
      departmentId?: string;
    }) => {
      // Find matching rule
      const { data: rules, error } = await supabase
        .from('approval_rules')
        .select(`
          *,
          approvers:approval_rule_approvers(
            *,
            approval_role:approval_roles(*)
          )
        `)
        .eq('category', category)
        .eq('is_active', true)
        .gte('max_amount', amount)
        .lte('min_amount', amount)
        .order('min_amount', { ascending: false });
      
      if (error) throw error;
      
      // Filter by department if specified
      let matchingRule = rules?.find((r: any) => 
        r.department_id === departmentId || r.department_id === null
      );
      
      if (!matchingRule && rules && rules.length > 0) {
        matchingRule = rules.find((r: any) => r.department_id === null);
      }
      
      return {
        rule: matchingRule,
        autoApproved: matchingRule?.auto_approve_below && amount < matchingRule.auto_approve_below,
        approvalPath: matchingRule?.approvers?.sort((a: any, b: any) => 
          a.sequence_order - b.sequence_order
        ) || [],
      };
    },
  });
}

// Export matrix as JSON
export function useExportMatrix() {
  return useMutation({
    mutationFn: async () => {
      const [
        { data: rules },
        { data: roles },
        { data: overrides },
        { data: approvers }
      ] = await Promise.all([
        supabase.from('approval_rules').select('*'),
        supabase.from('approval_roles').select('*'),
        supabase.from('approval_overrides').select('*'),
        supabase.from('approval_rule_approvers').select('*'),
      ]);
      
      return {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        erpCompatibility: ['SAP', 'Odoo', 'Zoho', 'Oracle', 'Dynamics'],
        rules,
        roles,
        overrides,
        approvers,
      };
    },
  });
}
