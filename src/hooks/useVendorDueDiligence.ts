import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DueDiligenceReport {
  id?: string;
  vendor_id?: string;
  vendor_name: string;
  companyOverview: {
    summary: string;
    businessDescription: string;
    yearsFounded: string;
    industry: string;
  };
  businessStatus: {
    operationalStatus: string;
    estimatedYearsInBusiness: string;
    registrationStatus: string;
  };
  globalPresence: {
    headquarters: string;
    countries: string[];
    internationalOperations: string;
  };
  riskAssessment: {
    overallRiskLevel: string;
    riskFactors: string[];
    complianceConcerns: string[];
    recommendations: string[];
  };
  financialIndicators: {
    estimatedRevenue: string;
    financialHealth: string;
    creditRating: string;
  };
  marketReputation: {
    industryStanding: string;
    customerFeedback: string;
    awards: string[];
  };
  contactInformation: {
    website: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  keyPersonnel: Array<{
    name: string;
    position: string;
  }>;
  analysisDate: string;
  confidenceLevel: string;
  dataDisclaimer: string;
}

export function useVendorDueDiligence() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorName, country, vendorId }: { 
      vendorName: string; 
      country?: string;
      vendorId?: string;
    }): Promise<DueDiligenceReport> => {
      const { data, error } = await supabase.functions.invoke('vendor-due-diligence', {
        body: { vendorName, country }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate report');

      const report = data.report as DueDiligenceReport;

      // Save report to database if vendorId is provided
      if (vendorId) {
        const { data: userData } = await supabase.auth.getUser();
        
        const { error: saveError } = await supabase
          .from('vendor_due_diligence_reports')
          .insert({
            vendor_id: vendorId,
            vendor_name: vendorName,
            report_data: report as any,
            generated_by: userData.user?.id
          });

        if (saveError) {
          console.error('Failed to save report:', saveError);
        }
      }

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-due-diligence-reports'] });
      toast({
        title: 'Due Diligence Complete',
        description: 'AI analysis has been generated successfully.',
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

export function useVendorDueDiligenceReports(vendorId?: string) {
  return useQuery({
    queryKey: ['vendor-due-diligence-reports', vendorId],
    queryFn: async () => {
      let query = supabase
        .from('vendor_due_diligence_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllDueDiligenceReports() {
  return useQuery({
    queryKey: ['all-due-diligence-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_due_diligence_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
