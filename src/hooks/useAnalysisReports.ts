import { useState, useEffect, useCallback } from 'react';

export interface StoredReport {
  id: string;
  sequenceNumber: string;
  type: 'market' | 'offer';
  title: string;
  createdAt: string;
  analysisData: any;
  inputSummary: string;
}

interface ReportCounters {
  market: { [year: string]: number };
  offer: { [year: string]: number };
}

const REPORTS_STORAGE_KEY = 'ai_analyzer_reports';
const COUNTERS_STORAGE_KEY = 'ai_analyzer_report_counters';

export function useAnalysisReports() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [counters, setCounters] = useState<ReportCounters>({ market: {}, offer: {} });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load reports and counters from localStorage
  useEffect(() => {
    try {
      const savedReports = localStorage.getItem(REPORTS_STORAGE_KEY);
      const savedCounters = localStorage.getItem(COUNTERS_STORAGE_KEY);
      
      if (savedReports) {
        setReports(JSON.parse(savedReports));
      }
      if (savedCounters) {
        setCounters(JSON.parse(savedCounters));
      }
    } catch (e) {
      console.error('Failed to load reports:', e);
    }
    setIsLoaded(true);
  }, []);

  // Generate next sequence number
  const generateSequenceNumber = useCallback((type: 'market' | 'offer'): string => {
    const year = new Date().getFullYear().toString();
    const prefix = type === 'market' ? 'MA' : 'OA';
    
    const currentCount = counters[type][year] || 0;
    const nextCount = currentCount + 1;
    
    // Update counters
    const newCounters = {
      ...counters,
      [type]: {
        ...counters[type],
        [year]: nextCount,
      },
    };
    setCounters(newCounters);
    localStorage.setItem(COUNTERS_STORAGE_KEY, JSON.stringify(newCounters));
    
    // Format: MA-2026-0001 or OA-2026-0001
    return `${prefix}-${year}-${nextCount.toString().padStart(4, '0')}`;
  }, [counters]);

  // Save a new report
  const saveReport = useCallback((
    type: 'market' | 'offer',
    title: string,
    analysisData: any,
    inputSummary: string
  ): StoredReport => {
    const sequenceNumber = generateSequenceNumber(type);
    
    const newReport: StoredReport = {
      id: crypto.randomUUID(),
      sequenceNumber,
      type,
      title,
      createdAt: new Date().toISOString(),
      analysisData,
      inputSummary,
    };
    
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
    
    return newReport;
  }, [reports, generateSequenceNumber]);

  // Delete a report
  const deleteReport = useCallback((id: string) => {
    const updatedReports = reports.filter(r => r.id !== id);
    setReports(updatedReports);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
  }, [reports]);

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
    isLoaded,
    saveReport,
    deleteReport,
    getReportsByType,
    getReportById,
    marketReportsCount,
    offerReportsCount,
  };
}
