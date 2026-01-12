import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useAnalysisReports } from '@/hooks/useAnalysisReports';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { 
  Upload, FileText, X, Sparkles, Download, FileSpreadsheet,
  Award, AlertTriangle, CheckCircle, TrendingUp, DollarSign,
  Clock, Shield, Loader2, Save, ArrowLeft, Eye
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Max file size: 2MB per file
const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: any;
}

interface AnalysisResult {
  technicalComparison: Array<{ criteria: string; suppliers: Record<string, { value: string; score?: number }> }>;
  commercialComparison: Array<{ criteria: string; suppliers: Record<string, { value: string; isLowest?: boolean; isFastest?: boolean }> }>;
  itemComparison?: Array<{ item: string; suppliers: Record<string, { unitPrice?: number; total?: number; quantity?: number }>; lowestSupplier?: string }>;
  ranking: Array<{ supplierName: string; technicalScore: number; commercialScore: number; overallScore: number; recommendation: string; risks: string[] }>;
  summary: { lowestEvaluated: string; bestValue: string; recommendation: string; notes: string[] };
}

export default function OfferAnalysisPage() {
  const { language, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();
  const { saveReport } = useAnalysisReports();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for view mode from navigation state
  const viewReport = location.state?.viewReport;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Handle viewing saved report
  useEffect(() => {
    if (viewReport?.analysisData) {
      setAnalysisResult(viewReport.analysisData);
      setActiveTab('technical');
      setIsViewMode(true);
      setIsSaved(true);
    }
  }, [viewReport]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      // Validate file size
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
      // Process files - convert to base64
      setProgressMessage('Processing documents...');
      const filesData = await Promise.all(uploadedFiles.map(async (uf, index) => {
        setProgressMessage(`Processing file ${index + 1}/${uploadedFiles.length}: ${uf.file.name}`);
        setUploadedFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'processing' } : f
        ));

        // Convert all files to base64
        const base64 = await fileToBase64(uf.file);
        return { name: uf.file.name, type: uf.file.type, data: base64 };
      }));
      
      setAnalysisProgress(30);
      setProgressMessage('Analyzing quotations with AI...');

      const { data, error } = await supabase.functions.invoke('ai-offer-analysis', {
        body: { files: filesData, companySettings: { name: settings.company_name_en, region: settings.region, currency: settings.default_currency || 'AED' } },
      });

      if (error) {
        // Handle specific error types
        if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
          throw new Error('Connection timed out. Try uploading fewer or smaller files.');
        }
        throw error;
      }
      
      setAnalysisProgress(80);
      setProgressMessage('Building comparison report...');
      
      if (data.extractedQuotations) {
        setUploadedFiles(prev => prev.map((uf, i) => ({ ...uf, status: 'completed', extractedData: data.extractedQuotations[i] })));
      }
      setAnalysisResult(data.analysis);
      setAnalysisProgress(100);
      setProgressMessage('Analysis complete!');
      setActiveTab('technical');
      setIsSaved(false);
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

  const handleSaveReport = () => {
    if (!analysisResult) return;
    
    const suppliers = Object.keys(analysisResult.commercialComparison?.[0]?.suppliers || {});
    const inputSummary = `${suppliers.length} Vendors compared`;
    
    const saved = saveReport(
      'offer',
      analysisResult.summary?.bestValue || 'Offer Analysis',
      analysisResult,
      inputSummary
    );
    
    setIsSaved(true);
    toast({
      title: language === 'ar' ? 'تم الحفظ' : 'Report Saved',
      description: `${language === 'ar' ? 'تم حفظ التقرير برقم' : 'Report saved as'} ${saved.sequenceNumber}`,
    });
    
    // Navigate to analyzer home after saving
    setTimeout(() => navigate('/analyzer'), 1000);
  };

  const downloadPDF = () => {
    if (!analysisResult) return;
    
    // Use landscape A4 for better table display
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 15;
    
    // Get supplier names
    const suppliers = Object.keys(analysisResult.commercialComparison?.[0]?.suppliers || {});
    
    // Helper function to add new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
        return true;
      }
      return false;
    };
    
    // Generate report reference
    const reportRef = `OA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    // ===== HEADER SECTION =====
    // Company Name (left)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.company_name_en || 'Company Name', margin, yPos);
    
    // Date/Time (right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Time: ${timeStr}`, pageWidth - margin, yPos, { align: 'right' });
    
    // Company Address
    if (settings.address_en) {
      doc.setFontSize(9);
      doc.text(settings.address_en, margin, yPos);
    }
    yPos += 8;
    
    // Line separator
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    // Report Reference
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Report Reference: ${reportRef}`, margin, yPos);
    yPos += 10;
    
    // ===== TITLE =====
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION COMPARATIVE STATEMENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // ===== 1. EXECUTIVE SUMMARY =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Executive Summary', margin, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const summaryText = analysisResult.summary?.recommendation || 'No summary available.';
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
    doc.text(summaryLines.slice(0, 4), margin, yPos);
    yPos += Math.min(summaryLines.length, 4) * 4 + 8;
    
    // ===== 2. COMMERCIAL AND TECHNICAL TERMS =====
    checkNewPage(60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Commercial and Technical Terms', margin, yPos);
    yPos += 8;
    
    // Calculate column widths
    const paramColWidth = 50;
    const vendorColWidth = (pageWidth - margin * 2 - paramColWidth) / suppliers.length;
    const rowHeight = 8;
    
    // Table Header
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Parameter', margin + 2, yPos);
    suppliers.forEach((supplier, i) => {
      const xPos = margin + paramColWidth + (i * vendorColWidth);
      doc.text(supplier.substring(0, 20), xPos + 2, yPos, { maxWidth: vendorColWidth - 4 });
    });
    yPos += rowHeight;
    
    // Draw border under header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
    
    // Combined Commercial + Technical rows
    const allTerms = [
      ...analysisResult.commercialComparison.map(row => ({ ...row, type: 'commercial' })),
      ...analysisResult.technicalComparison.slice(0, 4).map(row => ({ ...row, type: 'technical' }))
    ];
    
    doc.setFont('helvetica', 'normal');
    allTerms.forEach((row, idx) => {
      checkNewPage(rowHeight + 5);
      
      // Alternate row background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
      }
      
      doc.setFontSize(8);
      doc.text(row.criteria, margin + 2, yPos, { maxWidth: paramColWidth - 4 });
      
      suppliers.forEach((supplier, i) => {
        const val = row.suppliers[supplier];
        const xPos = margin + paramColWidth + (i * vendorColWidth);
        
        // Highlight lowest price
        if ((val as any)?.isLowest) {
          doc.setFillColor(198, 246, 213);
          doc.rect(xPos, yPos - 5, vendorColWidth, rowHeight, 'F');
          doc.setFont('helvetica', 'bold');
        }
        
        const displayVal = val?.value || ((val as any)?.score ? `${(val as any).score}/100` : 'N/A');
        doc.text(String(displayVal).substring(0, 25), xPos + 2, yPos, { maxWidth: vendorColWidth - 4 });
        doc.setFont('helvetica', 'normal');
      });
      
      yPos += rowHeight;
    });
    
    // Table border
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 12;
    
    // ===== 3. ITEM-WISE PRICE COMPARISON =====
    if (analysisResult.itemComparison && analysisResult.itemComparison.length > 0) {
      checkNewPage(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Item-wise Price Comparison', margin, yPos);
      yPos += 8;
      
      // Item table header
      const itemColWidth = 60;
      const priceColWidth = (pageWidth - margin * 2 - itemColWidth) / suppliers.length;
      
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Item Description', margin + 2, yPos);
      suppliers.forEach((supplier, i) => {
        const xPos = margin + itemColWidth + (i * priceColWidth);
        doc.text(supplier.substring(0, 15), xPos + 2, yPos, { maxWidth: priceColWidth - 4 });
      });
      yPos += rowHeight;
      
      doc.setFont('helvetica', 'normal');
      analysisResult.itemComparison.slice(0, 10).forEach((item: any, idx: number) => {
        checkNewPage(rowHeight + 5);
        
        if (idx % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
        }
        
        doc.setFontSize(8);
        doc.text(String(item.item || '').substring(0, 30), margin + 2, yPos, { maxWidth: itemColWidth - 4 });
        
        suppliers.forEach((supplier, i) => {
          const val = item.suppliers?.[supplier];
          const xPos = margin + itemColWidth + (i * priceColWidth);
          const isLowest = item.lowestSupplier === supplier;
          
          if (isLowest) {
            doc.setFillColor(198, 246, 213);
            doc.rect(xPos, yPos - 5, priceColWidth, rowHeight, 'F');
            doc.setFont('helvetica', 'bold');
          }
          
          const price = val?.total || val?.unitPrice || 'N/A';
          doc.text(String(price).substring(0, 15), xPos + 2, yPos);
          doc.setFont('helvetica', 'normal');
        });
        
        yPos += rowHeight;
      });
      yPos += 10;
    }
    
    // ===== 4. FINAL RECOMMENDATION =====
    checkNewPage(50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Final Recommendation', margin, yPos);
    yPos += 8;
    
    // Recommendation box
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(49, 130, 206);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos - 3, pageWidth - margin * 2, 35, 'FD');
    
    doc.setFontSize(9);
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Best Value Vendor:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(analysisResult.summary?.bestValue || 'N/A', margin + 50, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Lowest Price Vendor:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(analysisResult.summary?.lowestEvaluated || 'N/A', margin + 50, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Justification:', margin + 5, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const justificationLines = doc.splitTextToSize(
      analysisResult.summary?.recommendation || 'Manual review recommended.',
      pageWidth - margin * 2 - 15
    );
    doc.text(justificationLines.slice(0, 2), margin + 5, yPos);
    
    yPos += 20;
    
    // ===== SIGNATURE BLOCK =====
    checkNewPage(40);
    yPos += 10;
    
    const sigBoxWidth = (pageWidth - margin * 2 - 20) / 3;
    const sigBoxHeight = 25;
    
    doc.setFontSize(8);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    
    // Prepared By
    doc.rect(margin, yPos, sigBoxWidth, sigBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text('Prepared By:', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('Name: _______________', margin + 3, yPos + 12);
    doc.text('Date: _______________', margin + 3, yPos + 18);
    doc.text('Sign: _______________', margin + 3, yPos + 23);
    
    // Verified By
    const verifyX = margin + sigBoxWidth + 10;
    doc.rect(verifyX, yPos, sigBoxWidth, sigBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text('Verified By:', verifyX + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('Name: _______________', verifyX + 3, yPos + 12);
    doc.text('Date: _______________', verifyX + 3, yPos + 18);
    doc.text('Sign: _______________', verifyX + 3, yPos + 23);
    
    // Approved By
    const approveX = margin + (sigBoxWidth + 10) * 2;
    doc.rect(approveX, yPos, sigBoxWidth, sigBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text('Approved By:', approveX + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('Name: _______________', approveX + 3, yPos + 12);
    doc.text('Date: _______________', approveX + 3, yPos + 18);
    doc.text('Sign: _______________', approveX + 3, yPos + 23);
    
    // Save PDF directly (no print dialog)
    doc.save(`quotation-analysis-${reportRef}-${dateStr.replace(/\//g, '-')}.pdf`);
    
    toast({
      title: language === 'ar' ? 'تم التحميل' : 'PDF Downloaded',
      description: language === 'ar' ? 'تم تحميل التقرير بنجاح' : 'Report downloaded successfully',
    });
    
    // Navigate to analyzer home after download
    setTimeout(() => navigate('/analyzer'), 1000);
  };

  const downloadExcel = () => {
    if (!analysisResult) return;
    const reportRef = `OA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    
    let csv = 'QUOTATION COMPARATIVE STATEMENT\n';
    csv += `Report Reference,${reportRef}\n`;
    csv += `Generated,${new Date().toLocaleString()}\n\n`;
    
    const suppliers = Object.keys(analysisResult.commercialComparison[0]?.suppliers || {});
    
    // Commercial Comparison
    csv += 'COMMERCIAL COMPARISON\n';
    csv += `Criteria,${suppliers.join(',')}\n`;
    analysisResult.commercialComparison.forEach(row => {
      csv += `"${row.criteria}",${suppliers.map(s => `"${row.suppliers[s]?.value || 'N/A'}"`).join(',')}\n`;
    });
    
    // Technical Comparison
    csv += '\nTECHNICAL COMPARISON\n';
    csv += `Criteria,${suppliers.join(',')}\n`;
    analysisResult.technicalComparison.forEach(row => {
      csv += `"${row.criteria}",${suppliers.map(s => `"${row.suppliers[s]?.value || 'N/A'} (${row.suppliers[s]?.score || 0})"`).join(',')}\n`;
    });
    
    // Recommendation
    csv += '\nRECOMMENDATION\n';
    csv += `Best Value,"${analysisResult.summary.bestValue}"\n`;
    csv += `Lowest Price,"${analysisResult.summary.lowestEvaluated}"\n`;
    csv += `Recommendation,"${analysisResult.summary.recommendation?.replace(/"/g, "'") || ''}"\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quotation-analysis-${reportRef}.csv`;
    link.click();
    
    toast({
      title: language === 'ar' ? 'تم التحميل' : 'Excel Downloaded',
      description: language === 'ar' ? 'تم تحميل التقرير بنجاح' : 'Report downloaded successfully',
    });
    
    // Navigate to analyzer home after download
    setTimeout(() => navigate('/analyzer'), 1000);
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
    setIsViewMode(false);
    setIsSaved(false);
    setActiveTab('upload');
    setUploadedFiles([]);
    // Clear navigation state
    window.history.replaceState({}, document.title);
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
                <Button onClick={handleSaveReport} variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              )}
              <Button onClick={downloadExcel} variant="outline"><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
              <Button onClick={downloadPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" />{language === 'ar' ? 'التحميل' : 'Upload'}</TabsTrigger>
            <TabsTrigger value="technical" disabled={!analysisResult}><Shield className="h-4 w-4 mr-2" />{language === 'ar' ? 'الفنية' : 'Technical'}</TabsTrigger>
            <TabsTrigger value="commercial" disabled={!analysisResult}><DollarSign className="h-4 w-4 mr-2" />{language === 'ar' ? 'التجارية' : 'Commercial'}</TabsTrigger>
            <TabsTrigger value="recommendation" disabled={!analysisResult}><Award className="h-4 w-4 mr-2" />{language === 'ar' ? 'التوصية' : 'Recommendation'}</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  className={cn('border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors', dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}
                  onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{language === 'ar' ? 'اسحب وأفلت الملفات هنا' : 'Drag and drop files here'}</h3>
                  <p className="text-sm text-muted-foreground">PDF, Images, Excel, Word files</p>
                  <input id="file-upload" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} className="hidden" />
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
                        <Button variant="ghost" size="icon" onClick={() => removeFile(uf.id)}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span>{progressMessage || 'Analyzing...'}</span></div><Progress value={analysisProgress} className="h-2 mt-4" /><p className="text-xs text-muted-foreground mt-2">{analysisProgress}% complete</p></CardContent></Card>}

            <div className="flex justify-center">
              <Button size="lg" onClick={startAnalysis} disabled={uploadedFiles.length < 1 || isAnalyzing}><Sparkles className="h-5 w-5 mr-2" />Start Analysis</Button>
            </div>
          </TabsContent>

          <TabsContent value="technical">
            {analysisResult?.technicalComparison && (
              <Card><CardHeader><CardTitle>Technical Comparison</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Criteria</TableHead>{Object.keys(analysisResult.technicalComparison[0]?.suppliers || {}).map(s => <TableHead key={s}>{s}</TableHead>)}</TableRow></TableHeader>
                <TableBody>{analysisResult.technicalComparison.map((row, i) => <TableRow key={i}><TableCell className="font-medium">{row.criteria}</TableCell>{Object.entries(row.suppliers).map(([s, d]) => <TableCell key={s}>{d.value} {d.score >= 80 && <CheckCircle className="h-4 w-4 text-green-500 inline ml-1" />}</TableCell>)}</TableRow>)}</TableBody></Table>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="commercial">
            {analysisResult?.commercialComparison && (
              <Card><CardHeader><CardTitle>Commercial Comparison</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Criteria</TableHead>{Object.keys(analysisResult.commercialComparison[0]?.suppliers || {}).map(s => <TableHead key={s}>{s}</TableHead>)}</TableRow></TableHeader>
                <TableBody>{analysisResult.commercialComparison.map((row, i) => <TableRow key={i}><TableCell className="font-medium">{row.criteria}</TableCell>{Object.entries(row.suppliers).map(([s, d]) => <TableCell key={s} className={d.isLowest ? 'text-green-600 font-semibold' : ''}>{d.value} {d.isLowest && <Badge className="bg-green-500 ml-1">Lowest</Badge>}</TableCell>)}</TableRow>)}</TableBody></Table>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="recommendation">
            {analysisResult?.ranking && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analysisResult.ranking.map((s, i) => (
                    <Card key={s.supplierName} className={i === 0 ? 'border-primary ring-2 ring-primary/20' : ''}>
                      <CardHeader><div className="flex justify-between"><CardTitle className="text-lg">{s.supplierName}</CardTitle><Badge variant="outline">#{i + 1}</Badge></div>{getRecommendationBadge(s.recommendation)}</CardHeader>
                      <CardContent><div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-2xl font-bold text-primary">{s.technicalScore}</p><p className="text-xs text-muted-foreground">Technical</p></div><div><p className="text-2xl font-bold text-blue-500">{s.commercialScore}</p><p className="text-xs text-muted-foreground">Commercial</p></div><div><p className="text-2xl font-bold text-green-500">{s.overallScore}</p><p className="text-xs text-muted-foreground">Overall</p></div></div></CardContent>
                    </Card>
                  ))}
                </div>
                {analysisResult.summary && (
                  <Card className="bg-gradient-to-r from-primary/5 to-primary/10 mt-4">
                    <CardHeader><CardTitle><Award className="h-5 w-5 inline mr-2 text-primary" />Recommendation Summary</CardTitle></CardHeader>
                    <CardContent><div className="grid md:grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Lowest Evaluated:</p><p className="font-semibold text-lg">{analysisResult.summary.lowestEvaluated}</p></div><div><p className="text-sm text-muted-foreground">Best Value:</p><p className="font-semibold text-lg text-green-600">{analysisResult.summary.bestValue}</p></div></div><p className="mt-4 border-t pt-4">{analysisResult.summary.recommendation}</p></CardContent>
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
