import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingApprovalItem {
  id: string;
  documentType: 'vendor' | 'rfi' | 'rfq' | 'purchase_request' | 'purchase_order';
  documentCode: string;
  documentTitle: string;
  initiatorId: string;
  initiatorName: string;
  currentApproverId: string | null;
  currentApproverName: string | null;
  approvalLevel: number;
  totalLevels: number;
  amount: number;
  currency: string;
  submittedAt: string;
  agingDays: number;
  status: string;
  workflowId: string | null;
}

export function usePendingApprovals() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: async () => {
      const pendingItems: PendingApprovalItem[] = [];

      // 1. Pending Vendor Registrations
      const { data: vendors } = await supabase
        .from('vendors')
        .select(`
          id, code, company_name_en, status, created_at, created_by,
          creator:profiles!vendors_created_by_fkey(full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (vendors) {
        vendors.forEach(v => {
          const submittedAt = new Date(v.created_at);
          const agingDays = Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));
          pendingItems.push({
            id: v.id,
            documentType: 'vendor',
            documentCode: v.code || 'VND-NEW',
            documentTitle: v.company_name_en || 'New Vendor',
            initiatorId: v.created_by || '',
            initiatorName: (v.creator as any)?.full_name || 'Unknown',
            currentApproverId: null,
            currentApproverName: 'Admin',
            approvalLevel: 1,
            totalLevels: 1,
            amount: 0,
            currency: 'AED',
            submittedAt: v.created_at,
            agingDays,
            status: 'pending',
            workflowId: null
          });
        });
      }

      // 2. Pending RFIs
      const { data: rfis } = await supabase
        .from('rfis')
        .select(`
          id, code, title_en, status, created_at, created_by, assigned_buyer_id,
          creator:profiles!rfis_created_by_fkey(full_name),
          buyer:profiles!rfis_assigned_buyer_id_fkey(full_name)
        `)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (rfis) {
        rfis.forEach(r => {
          const submittedAt = new Date(r.created_at);
          const agingDays = Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));
          pendingItems.push({
            id: r.id,
            documentType: 'rfi',
            documentCode: r.code,
            documentTitle: r.title_en,
            initiatorId: r.created_by || '',
            initiatorName: (r.creator as any)?.full_name || 'Unknown',
            currentApproverId: r.assigned_buyer_id,
            currentApproverName: (r.buyer as any)?.full_name || 'Unassigned',
            approvalLevel: 1,
            totalLevels: 1,
            amount: 0,
            currency: 'AED',
            submittedAt: r.created_at,
            agingDays,
            status: 'submitted',
            workflowId: null
          });
        });
      }

      // 3. Pending RFQs
      const { data: rfqs } = await supabase
        .from('rfqs')
        .select(`
          id, code, title_en, status, currency, created_at, created_by, assigned_buyer_id,
          creator:profiles!rfqs_created_by_fkey(full_name),
          buyer:profiles!rfqs_assigned_buyer_id_fkey(full_name)
        `)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (rfqs) {
        rfqs.forEach((q: any) => {
          const submittedAt = new Date(q.created_at);
          const agingDays = Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));
          pendingItems.push({
            id: q.id,
            documentType: 'rfq',
            documentCode: q.code,
            documentTitle: q.title_en,
            initiatorId: q.created_by || '',
            initiatorName: q.creator?.full_name || 'Unknown',
            currentApproverId: q.assigned_buyer_id,
            currentApproverName: q.buyer?.full_name || 'Unassigned',
            approvalLevel: 1,
            totalLevels: 1,
            amount: 0,
            currency: q.currency || 'AED',
            submittedAt: q.created_at,
            agingDays,
            status: 'submitted',
            workflowId: null
          });
        });
      }

      // 4. Pending Purchase Requests (with approval workflows)
      const { data: prs } = await supabase
        .from('purchase_requests')
        .select(`
          id, code, title_en, status, total_amount, currency, created_at, created_by, workflow_id,
          creator:profiles!purchase_requests_created_by_fkey(full_name)
        `)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (prs) {
        for (const pr of prs) {
          let approvalLevel = 1;
          let totalLevels = 1;
          let currentApproverName = 'Pending';
          let currentApproverId: string | null = null;

          if (pr.workflow_id) {
            const { data: workflow } = await supabase
              .from('approval_workflows')
              .select('current_level')
              .eq('id', pr.workflow_id)
              .single();

            if (workflow) {
              approvalLevel = workflow.current_level;

              const { data: actions } = await supabase
                .from('approval_workflow_actions')
                .select(`
                  sequence_order, approver_id, status,
                  approver:profiles!approval_workflow_actions_approver_id_fkey(full_name)
                `)
                .eq('workflow_id', pr.workflow_id)
                .order('sequence_order');

              if (actions) {
                totalLevels = actions.length;
                const pendingAction = actions.find(a => a.status === 'pending');
                if (pendingAction) {
                  currentApproverId = pendingAction.approver_id;
                  currentApproverName = (pendingAction.approver as any)?.full_name || 'Unknown';
                }
              }
            }
          }

          const submittedAt = new Date(pr.created_at);
          const agingDays = Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));

          pendingItems.push({
            id: pr.id,
            documentType: 'purchase_request',
            documentCode: pr.code,
            documentTitle: pr.title_en,
            initiatorId: pr.created_by || '',
            initiatorName: (pr.creator as any)?.full_name || 'Unknown',
            currentApproverId,
            currentApproverName,
            approvalLevel,
            totalLevels,
            amount: pr.total_amount || 0,
            currency: pr.currency || 'AED',
            submittedAt: pr.created_at,
            agingDays,
            status: 'submitted',
            workflowId: pr.workflow_id
          });
        }
      }

      // 5. Pending Purchase Orders
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`
          id, code, title_en, status, total_amount, currency, created_at, created_by, workflow_id,
          creator:profiles!purchase_orders_created_by_fkey(full_name)
        `)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (pos) {
        for (const po of pos) {
          let approvalLevel = 1;
          let totalLevels = 1;
          let currentApproverName = 'Pending';
          let currentApproverId: string | null = null;

          if (po.workflow_id) {
            const { data: workflow } = await supabase
              .from('approval_workflows')
              .select('current_level')
              .eq('id', po.workflow_id)
              .single();

            if (workflow) {
              approvalLevel = workflow.current_level;

              const { data: actions } = await supabase
                .from('approval_workflow_actions')
                .select(`
                  sequence_order, approver_id, status,
                  approver:profiles!approval_workflow_actions_approver_id_fkey(full_name)
                `)
                .eq('workflow_id', po.workflow_id)
                .order('sequence_order');

              if (actions) {
                totalLevels = actions.length;
                const pendingAction = actions.find(a => a.status === 'pending');
                if (pendingAction) {
                  currentApproverId = pendingAction.approver_id;
                  currentApproverName = (pendingAction.approver as any)?.full_name || 'Unknown';
                }
              }
            }
          }

          const submittedAt = new Date(po.created_at);
          const agingDays = Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));

          pendingItems.push({
            id: po.id,
            documentType: 'purchase_order',
            documentCode: po.code,
            documentTitle: po.title_en,
            initiatorId: po.created_by || '',
            initiatorName: (po.creator as any)?.full_name || 'Unknown',
            currentApproverId,
            currentApproverName,
            approvalLevel,
            totalLevels,
            amount: po.total_amount || 0,
            currency: po.currency || 'AED',
            submittedAt: po.created_at,
            agingDays,
            status: 'submitted',
            workflowId: po.workflow_id
          });
        }
      }

      // Sort by aging (oldest first)
      pendingItems.sort((a, b) => b.agingDays - a.agingDays);

      return pendingItems;
    },
    enabled: !!user
  });
}

export function useCanApproveDocument(documentType: string, documentId: string, workflowId: string | null) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['can-approve', documentType, documentId, user?.id],
    queryFn: async () => {
      // Admins can always approve
      if (isAdmin) return true;

      // For vendors, only admins can approve
      if (documentType === 'vendor') return false;

      // For RFI/RFQ, check if user is assigned buyer
      if (documentType === 'rfi') {
        const { data } = await supabase
          .from('rfis')
          .select('assigned_buyer_id')
          .eq('id', documentId)
          .single();
        return data?.assigned_buyer_id === user?.id;
      }

      if (documentType === 'rfq') {
        const { data } = await supabase
          .from('rfqs')
          .select('assigned_buyer_id')
          .eq('id', documentId)
          .single();
        return data?.assigned_buyer_id === user?.id;
      }

      // For PR/PO with workflow, check if user is current approver
      if (workflowId && (documentType === 'purchase_request' || documentType === 'purchase_order')) {
        const { data: workflow } = await supabase
          .from('approval_workflows')
          .select('current_level')
          .eq('id', workflowId)
          .single();

        if (workflow) {
          const { data: action } = await supabase
            .from('approval_workflow_actions')
            .select('approver_id')
            .eq('workflow_id', workflowId)
            .eq('sequence_order', workflow.current_level)
            .eq('status', 'pending')
            .single();

          return action?.approver_id === user?.id;
        }
      }

      return false;
    },
    enabled: !!user && !!documentId
  });
}
