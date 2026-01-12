import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ApprovalCategory, ApprovalStatus } from '@/types/approval';

interface WorkflowAction {
  id: string;
  workflow_id: string;
  approval_role_id: string | null;
  approver_id: string | null;
  sequence_order: number;
  status: ApprovalStatus;
  comments: string | null;
  acted_at: string | null;
  approval_role?: {
    id: string;
    name_en: string;
    name_ar: string;
    code: string;
    hierarchy_level: number;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ApprovalWorkflow {
  id: string;
  reference_id: string;
  reference_code: string;
  category: ApprovalCategory;
  amount: number;
  currency: string;
  status: ApprovalStatus;
  current_level: number;
  rule_id: string | null;
  initiated_by: string | null;
  created_at: string;
  completed_at: string | null;
  actions?: WorkflowAction[];
}

// Find matching approval rule based on category, amount, and department
export async function findMatchingRule(
  category: ApprovalCategory,
  amount: number,
  departmentId?: string | null
): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('find_approval_rule', {
      _category: category,
      _amount: amount,
      _department_id: departmentId || null,
    });

  if (error) {
    console.error('Error finding approval rule:', error);
    return null;
  }

  return data;
}

// Get workflow status for a document
export function useApprovalWorkflowStatus(referenceId: string, category: ApprovalCategory) {
  return useQuery({
    queryKey: ['approval-workflow', referenceId, category],
    queryFn: async () => {
      if (!referenceId) return null;

      const { data: workflow, error } = await supabase
        .from('approval_workflows')
        .select(`
          *,
          actions:approval_workflow_actions(
            *,
            approval_role:approval_roles(id, name_en, name_ar, code, hierarchy_level)
          )
        `)
        .eq('reference_id', referenceId)
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching workflow status:', error);
        throw error;
      }

      return workflow as ApprovalWorkflow | null;
    },
    enabled: !!referenceId,
  });
}

// Initiate a new approval workflow
export function useInitiateWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      referenceId,
      referenceCode,
      category,
      amount,
      currency = 'AED',
      departmentId,
    }: {
      referenceId: string;
      referenceCode: string;
      category: ApprovalCategory;
      amount: number;
      currency?: string;
      departmentId?: string | null;
    }) => {
      // Find matching approval rule
      const ruleId = await findMatchingRule(category, amount, departmentId);

      if (!ruleId) {
        // No rule found - auto-approve
        console.log('No approval rule found, auto-approving');
        return { autoApproved: true, workflowId: null };
      }

      // Check if rule has auto-approve threshold
      const { data: rule } = await supabase
        .from('approval_rules')
        .select('auto_approve_below, requires_sequential')
        .eq('id', ruleId)
        .single();

      if (rule?.auto_approve_below && amount < rule.auto_approve_below) {
        console.log('Amount below auto-approve threshold');
        return { autoApproved: true, workflowId: null };
      }

      // Create the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('approval_workflows')
        .insert({
          reference_id: referenceId,
          reference_code: referenceCode,
          category,
          amount,
          currency,
          rule_id: ruleId,
          initiated_by: user?.id,
          status: 'pending' as ApprovalStatus,
          current_level: 1,
        })
        .select()
        .single();

      if (workflowError) {
        console.error('Error creating workflow:', workflowError);
        throw workflowError;
      }

      // Get required approvers from the rule
      const { data: approvers, error: approversError } = await supabase
        .from('approval_rule_approvers')
        .select('*, approval_role:approval_roles(*)')
        .eq('rule_id', ruleId)
        .order('sequence_order', { ascending: true });

      if (approversError) {
        console.error('Error fetching approvers:', approversError);
        throw approversError;
      }

      // Create workflow actions for each approver
      const actions = approvers.map((approver) => ({
        workflow_id: workflow.id,
        approval_role_id: approver.approval_role_id,
        sequence_order: approver.sequence_order,
        status: 'pending' as ApprovalStatus,
      }));

      if (actions.length > 0) {
        const { error: actionsError } = await supabase
          .from('approval_workflow_actions')
          .insert(actions);

        if (actionsError) {
          console.error('Error creating workflow actions:', actionsError);
          throw actionsError;
        }
      }

      // Log the action
      await supabase.rpc('log_approval_audit', {
        _action: 'workflow_initiated',
        _entity_type: category,
        _entity_id: referenceId,
        _new_values: { workflow_id: workflow.id, amount, approvers: approvers.length },
      });

      return { autoApproved: false, workflowId: workflow.id, approversCount: approvers.length };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflow', variables.referenceId] });
    },
  });
}

// Approve a workflow step
export function useApproveWorkflowStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workflowId,
      actionId,
      comments,
    }: {
      workflowId: string;
      actionId?: string;
      comments?: string;
    }) => {
      // Get the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('approval_workflows')
        .select('*, actions:approval_workflow_actions(*)')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found');
      }

      // Find the current pending action
      const currentAction = actionId
        ? workflow.actions?.find((a: any) => a.id === actionId)
        : workflow.actions?.find((a: any) => a.status === 'pending' && a.sequence_order === workflow.current_level);

      if (!currentAction) {
        throw new Error('No pending action found');
      }

      // Update the action
      const { error: updateActionError } = await supabase
        .from('approval_workflow_actions')
        .update({
          status: 'approved' as ApprovalStatus,
          approver_id: user?.id,
          acted_at: new Date().toISOString(),
          comments,
        })
        .eq('id', currentAction.id);

      if (updateActionError) {
        throw updateActionError;
      }

      // Check if there are more approvers
      const pendingActions = workflow.actions?.filter(
        (a: any) => a.status === 'pending' && a.id !== currentAction.id
      );

      if (pendingActions && pendingActions.length > 0) {
        // Move to next level
        const nextLevel = Math.min(...pendingActions.map((a: any) => a.sequence_order));
        await supabase
          .from('approval_workflows')
          .update({ current_level: nextLevel })
          .eq('id', workflowId);

        return { completed: false, nextLevel };
      } else {
        // All approved - complete the workflow
        await supabase
          .from('approval_workflows')
          .update({
            status: 'approved' as ApprovalStatus,
            completed_at: new Date().toISOString(),
          })
          .eq('id', workflowId);

        // Log the completion
        await supabase.rpc('log_approval_audit', {
          _action: 'workflow_approved',
          _entity_type: workflow.category,
          _entity_id: workflow.reference_id,
          _new_values: { workflow_id: workflowId, approved_by: user?.id },
        });

        // If this is a PO approval, send PO to vendor
        if (workflow.category === 'purchase_order') {
          console.log('PO fully approved, sending to vendor...');
          try {
            await supabase.functions.invoke('send-po-to-vendor', {
              body: { poId: workflow.reference_id },
            });
          } catch (error) {
            console.error('Failed to send PO to vendor:', error);
            // Don't throw - we still want the approval to complete
          }
        }

        return { completed: true, status: 'approved' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

// Reject a workflow
export function useRejectWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workflowId,
      actionId,
      comments,
    }: {
      workflowId: string;
      actionId?: string;
      comments: string;
    }) => {
      // Get the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found');
      }

      // Update the current action if provided
      if (actionId) {
        await supabase
          .from('approval_workflow_actions')
          .update({
            status: 'rejected' as ApprovalStatus,
            approver_id: user?.id,
            acted_at: new Date().toISOString(),
            comments,
          })
          .eq('id', actionId);
      }

      // Update workflow status
      const { error: updateError } = await supabase
        .from('approval_workflows')
        .update({
          status: 'rejected' as ApprovalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (updateError) {
        throw updateError;
      }

      // Log the rejection
      await supabase.rpc('log_approval_audit', {
        _action: 'workflow_rejected',
        _entity_type: workflow.category,
        _entity_id: workflow.reference_id,
        _new_values: { workflow_id: workflowId, rejected_by: user?.id, reason: comments },
      });

      return { status: 'rejected' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

// Check if current user can approve
export function useCanUserApprove(workflowId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-approve', workflowId, user?.id],
    queryFn: async () => {
      if (!workflowId || !user?.id) return { canApprove: false, reason: 'No workflow or user' };

      // Get the workflow with current pending action
      const { data: workflow } = await supabase
        .from('approval_workflows')
        .select(`
          *,
          actions:approval_workflow_actions(
            *,
            approval_role:approval_roles(*)
          )
        `)
        .eq('id', workflowId)
        .single();

      if (!workflow || workflow.status !== 'pending') {
        return { canApprove: false, reason: 'Workflow not pending' };
      }

      // Find the current pending action at the current level
      const currentAction = workflow.actions?.find(
        (a: any) => a.status === 'pending' && a.sequence_order === workflow.current_level
      );

      if (!currentAction) {
        return { canApprove: false, reason: 'No pending action at current level' };
      }

      // Get user's role from user_roles table
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      // Check if user is admin or manager (they can approve any step)
      if (userRole?.role === 'admin' || userRole?.role === 'manager') {
        return { canApprove: true, actionId: currentAction.id };
      }

      // Check if user is assigned as an approver for this approval role via user_approvers table
      if (currentAction.approval_role?.code) {
        const { data: userApprover } = await supabase
          .from('user_approvers')
          .select('id')
          .eq('user_id', user.id)
          .eq('approver_role', currentAction.approval_role.code)
          .eq('is_active', true)
          .maybeSingle();

        if (userApprover) {
          return { canApprove: true, actionId: currentAction.id };
        }
      }

      return { canApprove: false, reason: 'User not authorized' };
    },
    enabled: !!workflowId && !!user?.id,
  });
}
