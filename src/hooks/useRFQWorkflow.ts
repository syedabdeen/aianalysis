import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Send RFQ emails to vendors
export function useSendRFQEmails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfqId, vendorIds }: { rfqId: string; vendorIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('send-rfq-emails', {
        body: { rfqId, vendorIds },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send emails');

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfq', variables.rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', variables.rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      
      toast({
        title: 'RFQ Emails Sent',
        description: `Successfully sent to ${data.sentCount} vendor(s)${data.failedCount > 0 ? `, ${data.failedCount} failed` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send RFQ emails',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Issue RFQ (update status and send emails)
export function useIssueRFQ() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rfqId: string) => {
      console.log('Starting Issue RFQ process for:', rfqId);
      
      // First verify RFQ has vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('rfq_vendors')
        .select('id, vendor_id')
        .eq('rfq_id', rfqId);

      if (vendorsError) {
        console.error('Error fetching vendors:', vendorsError);
        throw vendorsError;
      }
      if (!vendors || vendors.length === 0) {
        throw new Error('Please add at least one vendor before issuing the RFQ');
      }
      console.log('Vendors found:', vendors.length);

      // Verify RFQ has items
      const { data: items, error: itemsError } = await supabase
        .from('rfq_items')
        .select('id')
        .eq('rfq_id', rfqId);

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        throw itemsError;
      }
      if (!items || items.length === 0) {
        throw new Error('Please add at least one item before issuing the RFQ');
      }
      console.log('Items found:', items.length);

      // Call the send-rfq-emails edge function directly
      console.log('Calling send-rfq-emails edge function...');
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-rfq-emails', {
        body: { rfqId },
      });

      console.log('Edge function response:', { emailData, emailError });

      if (emailError) {
        console.error('Edge function error:', emailError);
        throw new Error(emailError.message || 'Failed to send RFQ emails');
      }
      
      if (!emailData?.success) {
        throw new Error(emailData?.error || 'Failed to send emails');
      }

      // Log audit
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('rfq_audit_logs').insert({
        rfq_id: rfqId,
        action: 'rfq_issued',
        action_details: {
          vendors_count: vendors.length,
          items_count: items.length,
          emails_sent: emailData.sentCount
        },
        performed_by: user.user?.id
      });

      return emailData;
    },
    onSuccess: (data, rfqId) => {
      queryClient.invalidateQueries({ queryKey: ['rfq', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      toast({
        title: 'RFQ Issued Successfully',
        description: `Emails sent to ${data.sentCount} vendor(s)${data.failedCount > 0 ? `, ${data.failedCount} failed` : ''}`,
      });
    },
    onError: (error: Error) => {
      console.error('Issue RFQ error:', error);
      toast({
        title: 'Failed to issue RFQ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Trigger RFQ Analysis
export function useTriggerRFQAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rfqId: string) => {
      // Get current user
      const { data: user } = await supabase.auth.getUser();

      // Update RFQ with analysis trigger info
      await supabase
        .from('rfqs')
        .update({
          analysis_triggered_at: new Date().toISOString(),
          analysis_triggered_by: user.user?.id,
          status: 'under_review'
        })
        .eq('id', rfqId);

      // Run the comparison
      const { data, error } = await supabase.functions.invoke('compare-quotations', {
        body: { rfqId },
      });

      if (error) throw error;

      // Log audit
      await supabase.from('rfq_audit_logs').insert({
        rfq_id: rfqId,
        action: 'analysis_triggered',
        action_details: {
          has_recommendation: !!data.analysis?.recommendation,
          vendors_compared: data.comparison?.vendors?.length || 0
        },
        performed_by: user.user?.id
      });

      return data;
    },
    onSuccess: (_, rfqId) => {
      queryClient.invalidateQueries({ queryKey: ['rfq', rfqId] });
      toast({
        title: 'Analysis Complete',
        description: 'AI comparison and recommendation generated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Convert RFQ to Purchase Request
export function useConvertRFQToPR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfqId, selectedVendorId, nonRecommendedJustification }: { 
      rfqId: string; 
      selectedVendorId: string;
      nonRecommendedJustification?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      // Get RFQ details
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .select('*')
        .eq('id', rfqId)
        .single();

      if (rfqError) throw rfqError;

      // Get selected vendor's quotation
      const { data: rfqVendor, error: vendorError } = await supabase
        .from('rfq_vendors')
        .select(`
          *,
          vendor:vendors(id, company_name_en, company_name_ar, code)
        `)
        .eq('rfq_id', rfqId)
        .eq('vendor_id', selectedVendorId)
        .single();

      if (vendorError) throw vendorError;

      // Get vendor prices
      const { data: prices } = await supabase
        .from('rfq_vendor_prices')
        .select('*')
        .eq('rfq_vendor_id', rfqVendor.id);

      // Get RFQ items
      const { data: rfqItems } = await supabase
        .from('rfq_items')
        .select('*')
        .eq('rfq_id', rfqId);

      // Generate PR code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'PR' });
      
      if (codeError) throw codeError;

      // Create Purchase Request
      const { data: pr, error: prError } = await supabase
        .from('purchase_requests')
        .insert({
          code: codeResult,
          rfq_id_linked: rfqId,
          title_en: rfq.title_en,
          title_ar: rfq.title_ar,
          description: rfq.description,
          procurement_type: rfq.procurement_type,
          project_id: rfq.project_id,
          cost_center_id: rfq.cost_center_id,
          department_id: rfq.department_id,
          vendor_id: selectedVendorId,
          subtotal: rfqVendor.total_amount || 0,
          total_amount: rfqVendor.total_amount || 0,
          currency: rfqVendor.currency || 'AED',
          requested_by: user.user?.id,
          created_by: user.user?.id,
          non_recommended_justification: nonRecommendedJustification || null
        })
        .select()
        .single();

      if (prError) throw prError;

      // Create PR items with prices from vendor quotation
      if (rfqItems && rfqItems.length > 0) {
        const prItems = rfqItems.map((item) => {
          const price = prices?.find(p => p.rfq_item_id === item.id);
          return {
            pr_id: pr.id,
            rfq_item_id: item.id,
            item_number: item.item_number,
            description_en: item.description_en,
            description_ar: item.description_ar,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
            unit_price: price?.unit_price || 0,
            total_price: price?.total_price || 0
          };
        });

        await supabase.from('purchase_request_items').insert(prItems);
      }

      // Update RFQ status
      await supabase
        .from('rfqs')
        .update({
          status: 'completed',
          converted_to_pr_at: new Date().toISOString(),
          converted_to_pr_by: user.user?.id
        })
        .eq('id', rfqId);

      // Mark vendor as selected
      await supabase
        .from('rfq_vendors')
        .update({ is_selected: false })
        .eq('rfq_id', rfqId);

      await supabase
        .from('rfq_vendors')
        .update({ is_selected: true })
        .eq('id', rfqVendor.id);

      // Log audit
      await supabase.from('rfq_audit_logs').insert({
        rfq_id: rfqId,
        action: 'converted_to_pr',
        action_details: {
          pr_id: pr.id,
          pr_code: pr.code,
          selected_vendor_id: selectedVendorId,
          selected_vendor_code: rfqVendor.vendor?.code,
          total_amount: rfqVendor.total_amount,
          non_recommended_justification: nonRecommendedJustification || null
        },
        performed_by: user.user?.id
      });

      return pr;
    },
    onSuccess: (pr, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: ['rfq', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({
        title: 'Purchase Request Created',
        description: `PR ${pr.code} has been created from this RFQ`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create Purchase Request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch RFQ audit logs
export function useRFQAuditLogs(rfqId: string) {
  return {
    queryKey: ['rfq-audit-logs', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_audit_logs')
        .select(`
          *,
          performed_by_profile:profiles!rfq_audit_logs_performed_by_fkey(full_name, email)
        `)
        .eq('rfq_id', rfqId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!rfqId
  };
}

// Mark quotation received and check for notifications
export function useMarkQuotationReceived() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      rfqVendorId, 
      rfqId, 
      quotationData 
    }: { 
      rfqVendorId: string; 
      rfqId: string; 
      quotationData: any 
    }) => {
      // Update vendor quotation
      const { error: updateError } = await supabase
        .from('rfq_vendors')
        .update({
          ...quotationData,
          quotation_received: true,
          quotation_date: new Date().toISOString(),
          vendor_response_date: new Date().toISOString()
        })
        .eq('id', rfqVendorId);

      if (updateError) throw updateError;

      // Get current user
      const { data: user } = await supabase.auth.getUser();

      // Log audit
      await supabase.from('rfq_audit_logs').insert({
        rfq_id: rfqId,
        action: 'quotation_received',
        action_details: {
          rfq_vendor_id: rfqVendorId,
          total_amount: quotationData.total_amount
        },
        performed_by: user.user?.id
      });

      // Check if we need to send notification (2+ quotes received)
      const { data: vendors } = await supabase
        .from('rfq_vendors')
        .select('quotation_received')
        .eq('rfq_id', rfqId);

      const quotesReceived = vendors?.filter(v => v.quotation_received).length || 0;

      // Check if notification already sent
      const { data: rfq } = await supabase
        .from('rfqs')
        .select('quotes_ready_notification_sent')
        .eq('id', rfqId)
        .single();

      if (quotesReceived >= 2 && !rfq?.quotes_ready_notification_sent) {
        // Update RFQ status to under_review when quotes are ready
        await supabase
          .from('rfqs')
          .update({
            status: 'under_review',
            quotes_ready_notification_sent: true
          })
          .eq('id', rfqId);
      }

      return { quotesReceived };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfq', variables.rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', variables.rfqId] });
      
      if (data.quotesReceived >= 2) {
        toast({
          title: 'Ready for Analysis',
          description: `${data.quotesReceived} quotations received. You can now run the analysis.`,
        });
      } else {
        toast({
          title: 'Quotation Saved',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save quotation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}