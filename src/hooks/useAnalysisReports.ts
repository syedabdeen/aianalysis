import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StoredReport {
  id: string;
  sequenceNumber: string;
  type: 'market' | 'offer';
  title: string;
  createdAt: string;
  analysisData: any;
  inputSummary: string;
}

interface DbReport {
  id: string;
  user_id: string;
  sequence_number: string;
  type: string;
  title: string;
  input_summary: string | null;
  analysis_data: any;
  created_at: string;
  updated_at: string;
}

// Transform database record to StoredReport interface
const transformDbToStoredReport = (dbReport: DbReport): StoredReport => ({
  id: dbReport.id,
  sequenceNumber: dbReport.sequence_number,
  type: dbReport.type as 'market' | 'offer',
  title: dbReport.title,
  createdAt: dbReport.created_at,
  analysisData: dbReport.analysis_data,
  inputSummary: dbReport.input_summary || '',
});

export function useAnalysisReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all reports for the current user
  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['analysis-reports'],
    queryFn: async (): Promise<StoredReport[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        return [];
      }

      return (data as DbReport[]).map(transformDbToStoredReport);
    },
  });

  // Save a new report
  const saveReportMutation = useMutation({
    mutationFn: async ({ 
      type, 
      title, 
      analysisData, 
      inputSummary 
    }: { 
      type: 'market' | 'offer'; 
      title: string; 
      analysisData: any; 
      inputSummary: string;
    }): Promise<StoredReport> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get sequence number from database function
      const { data: sequenceNumber, error: seqError } = await supabase
        .rpc('get_analysis_report_sequence', { _type: type });

      if (seqError) {
        console.error('Error generating sequence:', seqError);
        throw new Error('Failed to generate report number');
      }

      // Insert the report
      const { data, error } = await supabase
        .from('analysis_reports')
        .insert({
          user_id: user.id,
          sequence_number: sequenceNumber,
          type,
          title,
          analysis_data: analysisData,
          input_summary: inputSummary,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving report:', error);
        throw new Error('Failed to save report');
      }

      return transformDbToStoredReport(data as DbReport);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-reports'] });
    },
  });

  // Delete a report
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('analysis_reports')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting report:', error);
        throw new Error('Failed to delete report');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-reports'] });
    },
  });

  // Save report function (async)
  const saveReport = useCallback(async (
    type: 'market' | 'offer',
    title: string,
    analysisData: any,
    inputSummary: string
  ): Promise<StoredReport> => {
    return saveReportMutation.mutateAsync({ type, title, analysisData, inputSummary });
  }, [saveReportMutation]);

  // Delete report function (async)
  const deleteReport = useCallback(async (id: string): Promise<void> => {
    return deleteReportMutation.mutateAsync(id);
  }, [deleteReportMutation]);

  // Get reports by type
  const getReportsByType = useCallback((type: 'market' | 'offer'): StoredReport[] => {
    return reports.filter(r => r.type === type);
  }, [reports]);

  // Get a single report by ID
  const getReportById = useCallback((id: string): StoredReport | undefined => {
    return reports.find(r => r.id === id);
  }, [reports]);

  // Get report counts
  const marketReportsCount = reports.filter(r => r.type === 'market').length;
  const offerReportsCount = reports.filter(r => r.type === 'offer').length;

  return {
    reports,
    isLoading,
    isLoaded: !isLoading,
    saveReport,
    deleteReport,
    getReportsByType,
    getReportById,
    marketReportsCount,
    offerReportsCount,
    isSaving: saveReportMutation.isPending,
    isDeleting: deleteReportMutation.isPending,
    refetch,
  };
}
