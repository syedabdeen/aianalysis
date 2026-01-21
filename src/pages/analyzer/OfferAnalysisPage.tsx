import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useAnalysisReports } from '@/hooks/useAnalysisReports';
import { useReportDownloads } from '@/hooks/useReportDownloads';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, FileText, X, Sparkles, Download, FileSpreadsheet,
  Award, AlertTriangle, CheckCircle, TrendingUp, DollarSign,
  Clock, Shield, Loader2, Save, ArrowLeft, Eye, List, RefreshCw
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  generateOfferAnalysisPDF, 
  generateOfferAnalysisExcel,
  getSupplierColumns,
  type ItemComparisonEntry,
  type AnalysisResult
} from '@/lib/exports/offerAnalysisExport';
import { ExtractionWarningBanner } from '@/components/analyzer/ExtractionWarningBanner';
import { ManualQuotationDialog, type ManualQuotationData } from '@/components/analyzer/ManualQuotationDialog';

// Max file size: 2MB per file
const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: any;
}

export default function OfferAnalysisPage() {
  const { language, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();
  const { saveReport, isSaving } = useAnalysisReports();
  const { recordDownload } = useReportDownloads();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const viewReport = location.state?.viewReport;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [itemComparisonMatrix, setItemComparisonMatrix] = useState<ItemComparisonEntry[]>([]);
  const [extractedQuotations, setExtractedQuotations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [savedReportRef, setSavedReportRef] = useState<string>('');
  
  // Manual entry state
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryIndex, setManualEntryIndex] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);

  // Get canonical supplier columns with fallback to extracted quotations for saved reports
  const supplierColumns = analysisResult 
    ? getSupplierColumns(analysisResult, extractedQuotations) 
    : [];

  // Handle viewing saved report
  useEffect(() => {
    if (viewReport?.analysisData) {
      setAnalysisResult(viewReport.analysisData);
      if (viewReport.analysisData?.itemComparisonMatrix) {
        setItemComparisonMatrix(viewReport.analysisData.itemComparisonMatrix);
      }
      if (viewReport.analysisData?.extractedQuotations) {
        setExtractedQuotations(viewReport.analysisData.extractedQuotations);
      }
      // Default to items tab when viewing saved report
      setActiveTab('items');
      setIsViewMode(true);
      setIsSaved(true);
      setSavedReportRef(viewReport.sequenceNumber || '');
    }
  }, [viewReport]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnalyzing) return;
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, [isAnalyzing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnalyzing) return;
    setDragActive(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [isAnalyzing]);

  const handleFiles = (files: File[]) => {
    if (isAnalyzing) return;
    
    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `"${file.name}" exceeds 2MB limit. Please use a smaller file.`,
          variant: 'destructive',
        });
        continue;
      }
      
      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: 'pending',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  const startAnalysis = async () => {
    if (uploadedFiles.length < 1) {
      toast({ title: 'Error', description: 'Please upload at least 1 quotation', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setProgressMessage('Preparing files...');

    try {
      setProgressMessage('Processing documents...');
      const filesData = await Promise.all(uploadedFiles.map(async (uf, index) => {
        setProgressMessage(`Processing file ${index + 1}/${uploadedFiles.length}: ${uf.file.name}`);
        setUploadedFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'processing' } : f
        ));

        const base64 = await fileToBase64(uf.file);
        return { name: uf.file.name, type: uf.file.type, data: base64 };
      }));
      
      setAnalysisProgress(30);
      setProgressMessage('Analyzing quotations with AI...');

      const { data, error } = await supabase.functions.invoke('ai-offer-analysis', {
        body: { files: filesData, companySettings: { name: settings.company_name_en, region: settings.region, currency: settings.default_currency || 'AED' } },
      });

      if (error) {
        if (error.name === 'FunctionsFetchError' || error.message?.includes('Failed to fetch')) {
          throw new Error('Analysis taking longer than expected. Please wait a moment and try again, or use smaller files.');
        }
        if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
          throw new Error('Request timed out. Try uploading fewer files or smaller documents.');
        }
        if (error.message?.includes('JSON') || error.message?.includes('parse')) {
          throw new Error('Error processing AI response. Please try again.');
        }
        throw error;
      }
      
      setAnalysisProgress(80);
      setProgressMessage('Building comparison report...');
      
      if (data.extractedQuotations) {
        setUploadedFiles(prev => prev.map((uf, i) => ({ ...uf, status: 'completed', extractedData: data.extractedQuotations[i] })));
        setExtractedQuotations(data.extractedQuotations);
      }
      if (data.itemComparisonMatrix) {
        setItemComparisonMatrix(data.itemComparisonMatrix);
      }
      setAnalysisResult(data.analysis);
      setAnalysisProgress(100);
      setProgressMessage('Analysis complete!');
      // Default to items tab after analysis
      setActiveTab('items');
      setIsSaved(false);
      setSavedReportRef('');
      
      toast({ title: 'Analysis Complete', description: 'All quotations analyzed successfully' });
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: f.status === 'processing' ? 'error' : f.status })));
      toast({ 
        title: 'Analysis Error', 
        description: error.message || 'Failed to analyze. Try with fewer or smaller files.', 
        variant: 'destructive' 
      });
    } finally {
      setIsAnalyzing(false);
      setProgressMessage('');
    }
  };

  const handleSaveReport = async (): Promise<string | null> => {
    if (!analysisResult) return null;
    
    const inputSummary = `${supplierColumns.length} Vendors compared`;
    
    const dataToSave = {
      ...analysisResult,
      itemComparisonMatrix,
      extractedQuotations,
    };
    
    try {
      // Use descriptive title with vendor count instead of random vendor name
      const vendorCount = extractedQuotations?.length || supplierColumns.length || 0;
      const reportTitle = `Quotation Analysis - ${vendorCount} Vendor${vendorCount !== 1 ? 's' : ''}`;
      
      const saved = await saveReport(
        'offer',
        reportTitle,
        dataToSave,
        inputSummary
      );
      
      setIsSaved(true);
      setSavedReportRef(saved.sequenceNumber);
      
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Report Saved',
        description: `${language === 'ar' ? 'تم حفظ التقرير برقم' : 'Report saved as'} ${saved.sequenceNumber}`,
      });
      
      return saved.sequenceNumber;
    } catch (error: any) {
      console.error('Save report error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Save Failed',
        description: error.message || 'Failed to save report. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Download PDF - auto-saves first if not saved
  const downloadPDF = async () => {
    if (!analysisResult) return;
    
    // Auto-save if not already saved (must succeed before downloading)
    let reportRef = savedReportRef;
    if (!isSaved && !isViewMode) {
      const savedRef = await handleSaveReport();
      if (!savedRef) {
        // Save failed - don't proceed with download
        toast({
          title: language === 'ar' ? 'خطأ' : 'Cannot Download',
          description: language === 'ar' ? 'يجب حفظ التقرير أولاً' : 'Report must be saved first. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      reportRef = savedRef;
    }
    
    const pdfReportRef = reportRef || `OA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    
    await generateOfferAnalysisPDF(
      analysisResult,
      itemComparisonMatrix,
      extractedQuotations,
      pdfReportRef,
      {
        companyName: settings.company_name_en || 'Company Name',
        companyAddress: settings.address_en,
        logoUrl: settings.logo_url,
      }
    );
    
    // Record download for audit trail
    recordDownload.mutate({
      reportType: 'offer_analysis',
      reportName: pdfReportRef,
      fileFormat: 'pdf',
      parameters: { vendorCount: supplierColumns.length },
    });
    
    toast({
      title: language === 'ar' ? 'تم التحميل' : 'PDF Downloaded',
      description: `${language === 'ar' ? 'تم حفظ التقرير برقم' : 'Saved as'} ${pdfReportRef} • ${language === 'ar' ? 'جاري التحميل' : 'Downloading...'}`,
    });
  };

  // Download Excel - auto-saves first if not saved
  const downloadExcel = async () => {
    if (!analysisResult) return;
    
    // Auto-save if not already saved (must succeed before downloading)
    let reportRef = savedReportRef;
    if (!isSaved && !isViewMode) {
      const savedRef = await handleSaveReport();
      if (!savedRef) {
        // Save failed - don't proceed with download
        toast({
          title: language === 'ar' ? 'خطأ' : 'Cannot Download',
          description: language === 'ar' ? 'يجب حفظ التقرير أولاً' : 'Report must be saved first. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      reportRef = savedRef;
    }
    
    const excelReportRef = reportRef || `OA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    
    generateOfferAnalysisExcel(
      analysisResult,
      itemComparisonMatrix,
      extractedQuotations,
      excelReportRef
    );
    
    // Record download for audit trail
    recordDownload.mutate({
      reportType: 'offer_analysis',
      reportName: excelReportRef,
      fileFormat: 'csv',
      parameters: { vendorCount: supplierColumns.length },
    });
    
    toast({
      title: language === 'ar' ? 'تم التحميل' : 'Excel Downloaded',
      description: `${language === 'ar' ? 'تم حفظ التقرير برقم' : 'Saved as'} ${excelReportRef} • ${language === 'ar' ? 'جاري التحميل' : 'Downloading...'}`,
    });
  };

  const getRecommendationBadge = (rec: string) => {
    const badges: Record<string, JSX.Element> = {
      best_value: <Badge className="bg-green-500"><Award className="h-3 w-3 mr-1" />Best Value</Badge>,
      lowest_price: <Badge className="bg-blue-500"><DollarSign className="h-3 w-3 mr-1" />Lowest Price</Badge>,
      technical_leader: <Badge className="bg-purple-500"><TrendingUp className="h-3 w-3 mr-1" />Technical Leader</Badge>,
    };
    return badges[rec] || <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Review Required</Badge>;
  };

  const handleNewAnalysis = () => {
    setAnalysisResult(null);
    setItemComparisonMatrix([]);
    setExtractedQuotations([]);
    setIsViewMode(false);
    setIsSaved(false);
    setSavedReportRef('');
    setActiveTab('upload');
    setUploadedFiles([]);
    setManualEntryOpen(false);
    setManualEntryIndex(null);
    window.history.replaceState({}, document.title);
  };

  const handleUploadZoneClick = () => {
    if (isAnalyzing) return;
    document.getElementById('file-upload')?.click();
  };

  // Handle retry extraction for a specific supplier (full re-extraction)
  const handleRetryExtraction = async (supplierIndex: number) => {
    if (!uploadedFiles[supplierIndex] || isRetrying) return;
    
    setIsRetrying(true);
    setRetryingIndex(supplierIndex);
    
    try {
      const file = uploadedFiles[supplierIndex].file;
      const base64 = await fileToBase64(file);
      const fileData = { name: file.name, type: file.type, data: base64 };
      
      toast({
        title: language === 'ar' ? 'جاري إعادة المحاولة' : 'Retrying Extraction',
        description: language === 'ar' 
          ? `إعادة استخراج البيانات من ${file.name}`
          : `Re-extracting data from ${file.name}`,
      });
      
      const { data, error } = await supabase.functions.invoke('ai-offer-analysis', {
        body: { 
          files: [fileData], 
          companySettings: { 
            name: settings.company_name_en, 
            region: settings.region, 
            currency: settings.default_currency || 'AED' 
          }
        },
      });
      
      if (error) throw error;
      
      if (data?.extractedQuotations?.[0]) {
        const newQuotation = data.extractedQuotations[0];
        const updated = [...extractedQuotations];
        updated[supplierIndex] = newQuotation;
        setExtractedQuotations(updated);
        
        // Update uploaded file status
        setUploadedFiles(prev => prev.map((uf, i) => 
          i === supplierIndex ? { ...uf, status: 'completed', extractedData: newQuotation } : uf
        ));
        
        // Check if extraction improved
        const hasItems = newQuotation.items?.length > 0;
        const hasTotal = parseFloat(newQuotation.commercial?.total) > 0;
        
        if (hasItems || hasTotal) {
          toast({
            title: language === 'ar' ? 'تم التحسين' : 'Extraction Improved',
            description: language === 'ar' 
              ? `تم استخراج ${newQuotation.items?.length || 0} بند`
              : `Extracted ${newQuotation.items?.length || 0} items`,
          });
          setIsSaved(false); // Mark as unsaved since data changed
        } else {
          toast({
            title: language === 'ar' ? 'لم تتحسن النتائج' : 'No Improvement',
            description: language === 'ar' 
              ? 'يرجى محاولة الإدخال اليدوي'
              : 'Please try manual entry instead',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Retry extraction error:', error);
      toast({
        title: language === 'ar' ? 'فشلت إعادة المحاولة' : 'Retry Failed',
        description: error.message || 'Failed to re-extract data',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
      setRetryingIndex(null);
    }
  };

  // Handle price verification with cross-supplier context
  const handleVerifyPrices = async (supplierIndex: number) => {
    if (!uploadedFiles[supplierIndex] || isRetrying) return;
    
    setIsRetrying(true);
    setRetryingIndex(supplierIndex);
    
    try {
      // Prepare ALL files for cross-supplier context
      const filesData = await Promise.all(uploadedFiles.map(async (uf) => {
        const base64 = await fileToBase64(uf.file);
        return { name: uf.file.name, type: uf.file.type, data: base64 };
      }));
      
      const supplierName = extractedQuotations[supplierIndex]?.supplier?.name || 'Unknown';
      
      toast({
        title: language === 'ar' ? 'جاري تحقق الأسعار' : 'Verifying Prices',
        description: language === 'ar' 
          ? `تحقق أسعار ${supplierName} مع سياق الموردين الآخرين`
          : `Verifying ${supplierName} prices with cross-supplier context`,
      });
      
      const { data, error } = await supabase.functions.invoke('ai-offer-analysis', {
        body: { 
          mode: 'reverify_prices',
          targetSupplierIndex: supplierIndex,
          files: filesData,
          existingQuotations: extractedQuotations,
          companySettings: { 
            name: settings.company_name_en, 
            region: settings.region, 
            currency: settings.default_currency || 'AED' 
          }
        },
      });
      
      if (error) throw error;
      
      console.log('Verification response:', data);
      
      if (data?.verifiedQuotation) {
        const verifiedQuotation = data.verifiedQuotation;
        const wasVerified = data.wasVerified;
        const originalTotal = data.originalTotal;
        const newTotal = data.newTotal;
        
        const updated = [...extractedQuotations];
        updated[supplierIndex] = verifiedQuotation;
        setExtractedQuotations(updated);
        
        // Update uploaded file status
        setUploadedFiles(prev => prev.map((uf, i) => 
          i === supplierIndex ? { ...uf, status: 'completed', extractedData: verifiedQuotation } : uf
        ));
        
        if (wasVerified && newTotal !== originalTotal) {
          toast({
            title: language === 'ar' ? 'تم تصحيح الأسعار' : 'Prices Corrected',
            description: language === 'ar' 
              ? `تم تصحيح الإجمالي من ${originalTotal?.toLocaleString()} إلى ${newTotal?.toLocaleString()}`
              : `Total corrected from ${originalTotal?.toLocaleString()} to ${newTotal?.toLocaleString()}`,
          });
          setIsSaved(false);
        } else {
          toast({
            title: language === 'ar' ? 'لم يتم العثور على تصحيحات' : 'No Corrections Found',
            description: language === 'ar' 
              ? 'تحقق يدوياً أو استخدم الإدخال اليدوي'
              : 'Please verify manually or use manual entry',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Price verification error:', error);
      toast({
        title: language === 'ar' ? 'فشل التحقق' : 'Verification Failed',
        description: error.message || 'Failed to verify prices',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
      setRetryingIndex(null);
    }
  };

  // Handle manual quotation data entry
  const handleManualSave = (data: ManualQuotationData) => {
    if (manualEntryIndex === null) return;
    
    const updated = [...extractedQuotations];
    updated[manualEntryIndex] = {
      supplier: data.supplier,
      quotation: data.quotation,
      commercial: {
        ...data.commercial,
        subtotal: data.commercial.total * 0.95, // Estimate subtotal
        tax: data.commercial.total * 0.05,      // Estimate tax
      },
      items: data.items.map((item, idx) => ({
        itemNo: idx + 1,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      })),
      itemsExtracted: data.items.length,
      pricedItemsCount: data.items.filter(i => i.unitPrice > 0).length,
      technical: { specifications: [], brand: '', model: '', warranty: '', compliance: [], origin: '' },
      _extractionIssue: null, // Clear the issue
      _manualEntry: true,     // Mark as manually entered
    };
    
    setExtractedQuotations(updated);
    setIsSaved(false); // Mark as unsaved
    setManualEntryOpen(false);
    setManualEntryIndex(null);
    
    toast({
      title: language === 'ar' ? 'تم الحفظ' : 'Data Saved',
      description: language === 'ar' 
        ? 'تم حفظ بيانات العرض بنجاح'
        : 'Quotation data saved successfully',
    });
  };

  return (
    <AnalyzerLayout>
      <div className="space-y-6">
        {/* View Mode Banner */}
        {isViewMode && viewReport && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {viewReport.sequenceNumber}
                  </Badge>
                  <span className="font-medium">{viewReport.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'وضع العرض - التقرير المحفوظ' : 'View Mode - Saved Report'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/reports')} className="gap-2">
                <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
                {language === 'ar' ? 'العودة للتقارير' : 'Back to Reports'}
              </Button>
              <Button variant="default" size="sm" onClick={handleNewAnalysis} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {language === 'ar' ? 'تحليل جديد' : 'New Analysis'}
              </Button>
            </div>
          </div>
        )}

        {/* Saved indicator */}
        {isSaved && savedReportRef && !isViewMode && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">
              {language === 'ar' ? `تم حفظ التقرير: ${savedReportRef}` : `Report saved: ${savedReportRef}`}
            </span>
            <Button variant="link" size="sm" onClick={() => navigate('/reports')} className="text-green-700 dark:text-green-400 p-0 h-auto">
              {language === 'ar' ? 'عرض التقارير' : 'View Reports'}
            </Button>
          </div>
        )}

        {/* Extraction Warnings Banner */}
        {analysisResult && extractedQuotations.length > 0 && !isViewMode && (
          <ExtractionWarningBanner
            extractedQuotations={extractedQuotations}
            uploadedFiles={uploadedFiles}
            onRetryExtraction={handleRetryExtraction}
            onVerifyPrices={handleVerifyPrices}
            onManualEntry={(idx) => {
              setManualEntryIndex(idx);
              setManualEntryOpen(true);
            }}
            isRetrying={isRetrying}
            retryingIndex={retryingIndex}
          />
        )}

        {/* Manual Entry Dialog */}
        <ManualQuotationDialog
          open={manualEntryOpen}
          onOpenChange={setManualEntryOpen}
          supplierName={manualEntryIndex !== null ? extractedQuotations[manualEntryIndex]?.supplier?.name || '' : ''}
          fileName={manualEntryIndex !== null ? uploadedFiles[manualEntryIndex]?.file?.name || '' : ''}
          existingData={manualEntryIndex !== null ? extractedQuotations[manualEntryIndex] : undefined}
          defaultCurrency={settings.default_currency || 'AED'}
          onSave={handleManualSave}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{language === 'ar' ? 'تحليل العروض بالذكاء الاصطناعي' : 'AI Offer Analysis'}</h1>
              <p className="text-muted-foreground">{language === 'ar' ? 'قم بتحميل عروض الموردين للمقارنة الذكية' : 'Upload supplier quotations for intelligent comparison'}</p>
            </div>
          </div>
          {analysisResult && (
            <div className="flex gap-2">
              {!isSaved && !isViewMode && (
                <Button onClick={handleSaveReport} variant="outline" className="gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              )}
              <Button onClick={downloadExcel} variant="outline"><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
              <Button onClick={downloadPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" />{language === 'ar' ? 'التحميل' : 'Upload'}</TabsTrigger>
            <TabsTrigger value="items" disabled={!analysisResult}><List className="h-4 w-4 mr-2" />{language === 'ar' ? 'البنود' : 'Items'}</TabsTrigger>
            <TabsTrigger value="technical" disabled={!analysisResult}><Shield className="h-4 w-4 mr-2" />{language === 'ar' ? 'الفنية' : 'Technical'}</TabsTrigger>
            <TabsTrigger value="commercial" disabled={!analysisResult}><DollarSign className="h-4 w-4 mr-2" />{language === 'ar' ? 'التجارية' : 'Commercial'}</TabsTrigger>
            <TabsTrigger value="recommendation" disabled={!analysisResult}><Award className="h-4 w-4 mr-2" />{language === 'ar' ? 'التوصية' : 'Recommendation'}</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div 
                  onDragEnter={handleDrag} 
                  onDragLeave={handleDrag} 
                  onDragOver={handleDrag} 
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                    isAnalyzing 
                      ? 'border-muted bg-muted/20 cursor-not-allowed pointer-events-none' 
                      : dragActive 
                        ? 'border-primary bg-primary/5 cursor-pointer' 
                        : 'border-border hover:border-primary/50 cursor-pointer'
                  )}
                  onClick={handleUploadZoneClick}
                >
                  <Upload className={cn("h-12 w-12 mx-auto mb-4", isAnalyzing ? "text-muted" : "text-muted-foreground")} />
                  <h3 className="font-semibold text-lg mb-2">
                    {isAnalyzing 
                      ? (language === 'ar' ? 'جاري التحليل...' : 'Analyzing...') 
                      : (language === 'ar' ? 'اسحب وأفلت الملفات هنا' : 'Drag and drop files here')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isAnalyzing 
                      ? (language === 'ar' ? 'يرجى الانتظار' : 'Please wait') 
                      : 'PDF, Images, Excel, Word files'}
                  </p>
                  <input 
                    id="file-upload" 
                    type="file" 
                    multiple 
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" 
                    onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} 
                    className="hidden" 
                    disabled={isAnalyzing}
                  />
                </div>
              </CardContent>
            </Card>

            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Uploaded Files <Badge variant="secondary">{uploadedFiles.length}</Badge></CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {uploadedFiles.map((uf) => (
                      <div key={uf.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{uf.file.name}</p>
                          <p className="text-xs text-muted-foreground">{(uf.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFile(uf.id)} 
                          disabled={isAnalyzing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>{progressMessage || 'Analyzing...'}</span>
                  </div>
                  <Progress value={analysisProgress} className="h-2 mt-4" />
                  <p className="text-xs text-muted-foreground mt-2">{analysisProgress}% complete</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button size="lg" onClick={startAnalysis} disabled={uploadedFiles.length < 1 || isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    {language === 'ar' ? 'بدء التحليل' : 'Start Analysis'}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* NEW: Items Tab - Line-by-line item comparison */}
          <TabsContent value="items">
            {itemComparisonMatrix && itemComparisonMatrix.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    {language === 'ar' ? 'مقارنة البنود' : 'Item-wise Comparison'}
                    <Badge variant="secondary">{itemComparisonMatrix.length} items</Badge>
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'مقارنة تفصيلية لكل بند عبر جميع الموردين' 
                      : 'Detailed line-by-line comparison across all suppliers'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="min-w-[800px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12 font-bold">#</TableHead>
                            <TableHead className="min-w-[200px] font-bold">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                            <TableHead className="w-16 font-bold text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                            <TableHead className="w-16 font-bold text-center">{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                            {supplierColumns.map(supplier => (
                              <TableHead key={supplier} className="min-w-[120px] font-bold text-center bg-muted/30">
                                {supplier}
                              </TableHead>
                            ))}
                            <TableHead className="w-24 font-bold text-center bg-green-100 dark:bg-green-900/30">
                              {language === 'ar' ? 'الأقل' : 'Lowest'}
                            </TableHead>
                          </TableRow>
                          {/* Sub-header for Rate/Amount */}
                          <TableRow className="bg-muted/30 text-xs">
                            <TableHead></TableHead>
                            <TableHead></TableHead>
                            <TableHead></TableHead>
                            <TableHead></TableHead>
                            {supplierColumns.map(supplier => (
                              <TableHead key={`${supplier}-subhead`} className="text-center p-1">
                                <div className="flex justify-around text-xs text-muted-foreground">
                                  <span>{language === 'ar' ? 'السعر' : 'Rate'}</span>
                                  <span>{language === 'ar' ? 'المبلغ' : 'Amount'}</span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center text-xs text-muted-foreground">
                              {language === 'ar' ? 'المبلغ' : 'Amount'}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemComparisonMatrix.map((item, idx) => {
                            const qty = item.quantity || 1;
                            return (
                              <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/10' : ''}>
                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{item.item}</TableCell>
                                <TableCell className="text-center">{qty}</TableCell>
                                <TableCell className="text-center">{item.unit || 'EA'}</TableCell>
                                {supplierColumns.map(supplier => {
                                  // Use fuzzy matching to find supplier data
                                  let supplierData = item.suppliers?.[supplier];
                                  if (!supplierData && item.suppliers) {
                                    // Fuzzy match: check for partial name matches
                                    const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    const normalizedTarget = normalizeStr(supplier);
                                    for (const key of Object.keys(item.suppliers)) {
                                      const normalizedKey = normalizeStr(key);
                                      if (normalizedKey.startsWith(normalizedTarget) || normalizedTarget.startsWith(normalizedKey) ||
                                          normalizedKey.includes(normalizedTarget) || normalizedTarget.includes(normalizedKey)) {
                                        supplierData = item.suppliers[key];
                                        break;
                                      }
                                    }
                                  }
                                  
                                  const unitPrice = supplierData?.unitPrice || 0;
                                  const amount = supplierData?.total || (qty * unitPrice);
                                  const isLowest = item.lowestSupplier === supplier && unitPrice > 0;
                                  
                                  return (
                                    <TableCell 
                                      key={supplier} 
                                      className={cn(
                                        "text-center",
                                        isLowest && "bg-green-100 dark:bg-green-900/30 font-semibold"
                                      )}
                                    >
                                      {unitPrice > 0 ? (
                                        <div className="flex justify-around text-sm">
                                          <span>{unitPrice.toLocaleString()}</span>
                                          <span className="text-muted-foreground">{amount.toLocaleString()}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center font-semibold bg-green-50 dark:bg-green-900/20">
                                  {(item.lowestTotal || 0) > 0 ? item.lowestTotal.toLocaleString() : '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد بنود للمقارنة' : 'No items to compare'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="technical">
            {analysisResult?.technicalComparison && (
              <Card>
                <CardHeader><CardTitle>Technical Comparison</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criteria</TableHead>
                        {supplierColumns.map(s => <TableHead key={s}>{s}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.technicalComparison.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.criteria}</TableCell>
                          {supplierColumns.map(s => {
                            const d = row.suppliers[s];
                            return (
                              <TableCell key={s}>
                                {d?.value || '—'} {d?.score && d.score >= 80 && <CheckCircle className="h-4 w-4 text-green-500 inline ml-1" />}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="commercial">
            {analysisResult?.commercialComparison && (
              <Card>
                <CardHeader><CardTitle>Commercial Comparison</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criteria</TableHead>
                        {supplierColumns.map(s => <TableHead key={s}>{s}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.commercialComparison.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.criteria}</TableCell>
                          {supplierColumns.map(s => {
                            const d = row.suppliers[s];
                            return (
                              <TableCell key={s} className={d?.isLowest ? 'text-green-600 font-semibold' : ''}>
                                {d?.value || '—'} {d?.isLowest && <Badge className="bg-green-500 ml-1">Lowest</Badge>}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendation">
            {analysisResult?.ranking && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analysisResult.ranking.map((s, i) => (
                    <Card key={s.supplierName} className={i === 0 ? 'border-primary ring-2 ring-primary/20' : ''}>
                      <CardHeader>
                        <div className="flex justify-between">
                          <CardTitle className="text-lg">{s.supplierName}</CardTitle>
                          <Badge variant="outline">#{i + 1}</Badge>
                        </div>
                        {getRecommendationBadge(s.recommendation)}
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-2xl font-bold text-primary">{s.technicalScore}</p>
                            <p className="text-xs text-muted-foreground">Technical</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-blue-500">{s.commercialScore}</p>
                            <p className="text-xs text-muted-foreground">Commercial</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-500">{s.overallScore}</p>
                            <p className="text-xs text-muted-foreground">Overall</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {analysisResult.summary && (
                  <Card className="bg-gradient-to-r from-primary/5 to-primary/10 mt-4">
                    <CardHeader>
                      <CardTitle><Award className="h-5 w-5 inline mr-2 text-primary" />Recommendation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Lowest Evaluated:</p>
                          <p className="font-semibold text-lg">{analysisResult.summary.lowestEvaluated}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Best Value:</p>
                          <p className="font-semibold text-lg text-green-600">{analysisResult.summary.bestValue}</p>
                        </div>
                      </div>
                      <p className="mt-4 border-t pt-4">{analysisResult.summary.recommendation}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AnalyzerLayout>
  );
}
