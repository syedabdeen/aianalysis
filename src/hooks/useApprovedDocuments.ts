import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ApprovedDocumentItem {
  id: string;
  documentType: 'vendor' | 'rfi' | 'rfq' | 'purchase_request' | 'purchase_order';
  documentCode: string;
  documentTitle: string;
  initiatorId: string;
  initiatorName: string;
  finalApproverId: string | null;
  finalApproverName: string | null;
  amount: number;
  currency: string;
  approvedAt: string | null;
  status: string;
  remarks: string | null;
}

export function useApprovedDocuments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['approved-documents', user?.id],
    queryFn: async () => {
      const approvedItems: ApprovedDocumentItem[] = [];

      // 1. Approved Vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select(`
          id, code, company_name_en, status, created_at, created_by,
          creator:profiles!vendors_created_by_fkey(full_name)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      if (vendors) {
        vendors.forEach(v => {
          approvedItems.push({
            id: v.id,
            documentType: 'vendor',
            documentCode: v.code || 'VND-NEW',
            documentTitle: v.company_name_en || 'Vendor',
            initiatorId: v.created_by || '',
            initiatorName: (v.creator as any)?.full_name || 'Unknown',
            finalApproverId: null,
            finalApproverName: 'Admin',
            amount: 0,
            currency: 'AED',
            approvedAt: v.created_at,
            status: 'approved',
            remarks: null
          });
        });
      }

      // 2. Approved RFQs (selected vendor)
      const { data: rfqs } = await supabase
        .from('rfqs')
        .select(`
          id, code, title_en, status, currency, created_at, created_by, updated_at,
          creator:profiles!rfqs_created_by_fkey(full_name)
        `)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (rfqs) {
        rfqs.forEach((q: any) => {
          approvedItems.push({
            id: q.id,
            documentType: 'rfq',
            documentCode: q.code,
            documentTitle: q.title_en,
            initiatorId: q.created_by || '',
            initiatorName: q.creator?.full_name || 'Unknown',
            finalApproverId: null,
            finalApproverName: null,
            amount: 0,
            currency: q.currency || 'AED',
            approvedAt: q.updated_at,
            status: 'completed',
            remarks: null
          });
        });
      }

      // 3. Approved Purchase Requests
      const { data: prs } = await supabase
        .from('purchase_requests')
        .select(`
          id, code, title_en, status, total_amount, currency, created_at, created_by, approved_at, approved_by,
          creator:profiles!purchase_requests_created_by_fkey(full_name),
          approver:profiles!purchase_requests_approved_by_fkey(full_name)
        `)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(50);

      if (prs) {
        prs.forEach((pr: any) => {
          approvedItems.push({
            id: pr.id,
            documentType: 'purchase_request',
            documentCode: pr.code,
            documentTitle: pr.title_en,
            initiatorId: pr.created_by || '',
            initiatorName: pr.creator?.full_name || 'Unknown',
            finalApproverId: pr.approved_by,
            finalApproverName: pr.approver?.full_name || null,
            amount: pr.total_amount || 0,
            currency: pr.currency || 'AED',
            approvedAt: pr.approved_at,
            status: 'approved',
            remarks: null
          });
        });
      }

      // 4. Approved/Issued Purchase Orders
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`
          id, code, title_en, status, total_amount, currency, created_at, created_by, approved_at, approved_by, issued_at,
          creator:profiles!purchase_orders_created_by_fkey(full_name),
          approver:profiles!purchase_orders_approved_by_fkey(full_name)
        `)
        .in('status', ['approved', 'completed'])
        .order('approved_at', { ascending: false })
        .limit(50);

      if (pos) {
        pos.forEach((po: any) => {
          approvedItems.push({
            id: po.id,
            documentType: 'purchase_order',
            documentCode: po.code,
            documentTitle: po.title_en,
            initiatorId: po.created_by || '',
            initiatorName: po.creator?.full_name || 'Unknown',
            finalApproverId: po.approved_by,
            finalApproverName: po.approver?.full_name || null,
            amount: po.total_amount || 0,
            currency: po.currency || 'AED',
            approvedAt: po.approved_at || po.issued_at,
            status: 'approved',
            remarks: null
          });
        });
      }

      // Sort by approval date (most recent first)
      approvedItems.sort((a, b) => {
        const dateA = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
        const dateB = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
        return dateB - dateA;
      });

      return approvedItems;
    },
    enabled: !!user
  });
}