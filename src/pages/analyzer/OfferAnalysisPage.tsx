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

interface ItemComparisonEntry {
  item: string;
  quantity: number;           // Unified quantity for the item
  unit: string;               // Unit of measure (EA, MTR, SET, etc.)
  suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit?: string }>;
  lowestSupplier: string;
  lowestTotal: number;        // Lowest line total (qty × unit price)
  averageTotal: number;       // Average line total
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
  const [itemComparisonMatrix, setItemComparisonMatrix] = useState<ItemComparisonEntry[]>([]);
  const [extractedQuotations, setExtractedQuotations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Handle viewing saved report
  useEffect(() => {
    if (viewReport?.analysisData) {
      setAnalysisResult(viewReport.analysisData);
      // Restore item comparison matrix if saved
      if (viewReport.analysisData?.itemComparisonMatrix) {
        setItemComparisonMatrix(viewReport.analysisData.itemComparisonMatrix);
      }
      if (viewReport.analysisData?.extractedQuotations) {
        setExtractedQuotations(viewReport.analysisData.extractedQuotations);
      }
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
        // Handle specific error types with better messages
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

  const handleSaveReport = async () => {
    if (!analysisResult) return;
    
    const suppliers = Object.keys(analysisResult.commercialComparison?.[0]?.suppliers || {});
    const inputSummary = `${suppliers.length} Vendors compared`;
    
    // Include itemComparisonMatrix and extractedQuotations in saved data
    const dataToSave = {
      ...analysisResult,
      itemComparisonMatrix,
      extractedQuotations,
    };
    
    try {
      const saved = await saveReport(
        'offer',
        analysisResult.summary?.bestValue || 'Offer Analysis',
        dataToSave,
        inputSummary
      );
      
      setIsSaved(true);
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Report Saved',
        description: `${language === 'ar' ? 'تم حفظ التقرير برقم' : 'Report saved as'} ${saved.sequenceNumber}`,
      });
      
      // Navigate to home after saving - use /analyzer if on analyzer path
      const homePath = window.location.pathname.startsWith('/analyzer') ? '/analyzer' : '/';
      setTimeout(() => navigate(homePath), 1000);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || 'Failed to save report',
        variant: 'destructive',
      });
    }
  };

  const loadImageForPDF = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const downloadPDF = async () => {
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
    
    // ===== HEADER SECTION WITH LOGO =====
    let logoOffset = 0;
    if (settings.logo_url) {
      try {
        const logoImg = await loadImageForPDF(settings.logo_url);
        if (logoImg) {
          doc.addImage(logoImg, 'JPEG', margin, yPos - 5, 25, 15);
          logoOffset = 30;
        }
      } catch (error) {
        console.warn('Failed to load logo:', error);
      }
    }

    // Company Name (left)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.company_name_en || 'Company Name', margin + logoOffset, yPos);
    
    // Date/Time (right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Time: ${timeStr}`, pageWidth - margin, yPos, { align: 'right' });
    
    // Company Address
    if (settings.address_en) {
      doc.setFontSize(9);
      doc.text(settings.address_en, margin + logoOffset, yPos);
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
    
    // ===== 3. ITEM-WISE PRICE COMPARISON (Global Standard Format with Qty, Unit, Rate, Amount) =====
    if (itemComparisonMatrix && itemComparisonMatrix.length > 0) {
      checkNewPage(60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Item-wise Price Comparison', margin, yPos);
      yPos += 8;
      
      // Column widths: # | Item | Qty | Unit | [Rate | Amount] per vendor | Lowest | Avg
      const colNo = 8;
      const colItem = 38;
      const colQty = 12;
      const colUnit = 10;
      const colLowest = 20;
      const colAvg = 20;
      const fixedColsWidth = colNo + colItem + colQty + colUnit + colLowest + colAvg;
      const availableForVendors = pageWidth - margin * 2 - fixedColsWidth;
      const colVendorWidth = availableForVendors / suppliers.length; // Each vendor: Rate + Amount
      const colRate = colVendorWidth * 0.45;
      const colAmount = colVendorWidth * 0.55;
      
      // ===== HEADER ROW 1: Main columns =====
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      
      let headerX = margin + 1;
      doc.text('#', headerX, yPos);
      headerX += colNo;
      doc.text('Item Description', headerX, yPos);
      headerX += colItem;
      doc.text('Qty', headerX, yPos);
      headerX += colQty;
      doc.text('Unit', headerX, yPos);
      headerX += colUnit;
      
      // Vendor headers (spanning Rate + Amount)
      suppliers.forEach((supplier, i) => {
        const vendorX = margin + colNo + colItem + colQty + colUnit + (i * colVendorWidth);
        doc.text(supplier.substring(0, 14), vendorX + 1, yPos, { maxWidth: colVendorWidth - 2 });
      });
      
      // Lowest header (yellow bg)
      const lowestX = margin + colNo + colItem + colQty + colUnit + (suppliers.length * colVendorWidth);
      doc.setFillColor(255, 255, 200);
      doc.rect(lowestX, yPos - 5, colLowest, rowHeight, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Lowest', lowestX + 1, yPos);
      
      // Avg header (blue bg)
      const avgX = lowestX + colLowest;
      doc.setFillColor(200, 220, 255);
      doc.rect(avgX, yPos - 5, colAvg, rowHeight, 'F');
      doc.text('Avg', avgX + 1, yPos);
      
      yPos += rowHeight;
      
      // ===== HEADER ROW 2: Sub-headers for Rate | Amount per vendor =====
      doc.setFillColor(235, 235, 235);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight - 1, 'F');
      doc.setFontSize(5);
      
      headerX = margin + colNo + colItem + colQty + colUnit;
      suppliers.forEach(() => {
        doc.text('Rate', headerX + 1, yPos);
        doc.text('Amount', headerX + colRate + 1, yPos);
        headerX += colVendorWidth;
      });
      
      // Re-apply Lowest/Avg bg for row 2
      doc.setFillColor(255, 255, 200);
      doc.rect(lowestX, yPos - 5, colLowest, rowHeight - 1, 'F');
      doc.text('(Total)', lowestX + 1, yPos);
      doc.setFillColor(200, 220, 255);
      doc.rect(avgX, yPos - 5, colAvg, rowHeight - 1, 'F');
      doc.text('(Total)', avgX + 1, yPos);
      
      yPos += rowHeight;
      
      // Draw header bottom border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
      
      // ===== DATA ROWS =====
      doc.setFont('helvetica', 'normal');
      itemComparisonMatrix.slice(0, 25).forEach((item, idx) => {
        checkNewPage(rowHeight + 5);
        
        // Alternate row background
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
        }
        
        const qty = item.quantity || 1;
        const unit = item.unit || 'EA';
        
        // Fixed columns
        let xPos = margin + 1;
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text(String(idx + 1), xPos, yPos);
        xPos += colNo;
        doc.text(String(item.item || '').substring(0, 22), xPos, yPos, { maxWidth: colItem - 2 });
        xPos += colItem;
        doc.text(String(qty), xPos, yPos);
        xPos += colQty;
        doc.text(unit, xPos, yPos);
        xPos += colUnit;
        
        // Vendor Rate/Amount columns
        suppliers.forEach((supplier) => {
          const supplierData = item.suppliers?.[supplier];
          const unitPrice = supplierData?.unitPrice || 0;
          const amount = qty * unitPrice;
          const isLowest = item.lowestSupplier === supplier && unitPrice > 0;
          
          // Highlight lowest amount cell in green
          if (isLowest) {
            doc.setFillColor(198, 246, 213);
            doc.rect(xPos, yPos - 5, colVendorWidth, rowHeight, 'F');
            doc.setFont('helvetica', 'bold');
          }
          
          doc.text(unitPrice > 0 ? unitPrice.toLocaleString() : '-', xPos + 1, yPos);
          doc.text(amount > 0 ? amount.toLocaleString() : '-', xPos + colRate + 1, yPos);
          doc.setFont('helvetica', 'normal');
          xPos += colVendorWidth;
        });
        
        // Lowest value (yellow bg) - based on line total
        doc.setFillColor(255, 255, 200);
        doc.rect(lowestX, yPos - 5, colLowest, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text((item.lowestTotal || 0) > 0 ? (item.lowestTotal || 0).toLocaleString() : '-', lowestX + 1, yPos);
        
        // Average value (blue bg) - based on line total
        doc.setFillColor(200, 220, 255);
        doc.rect(avgX, yPos - 5, colAvg, rowHeight, 'F');
        doc.setFont('helvetica', 'normal');
        doc.text((item.averageTotal || 0) > 0 ? Math.round(item.averageTotal || 0).toLocaleString() : '-', avgX + 1, yPos);
        
        yPos += rowHeight;
      });
      
      // Table bottom border
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
      
      // If there are more items, show a note
      if (itemComparisonMatrix.length > 25) {
        yPos += 4;
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(`... and ${itemComparisonMatrix.length - 25} more items (see Excel export for complete list)`, margin, yPos);
      }
      
      yPos += 12;
    }
    
    // ===== 3B. SUBTOTAL / VAT / TOTAL SUMMARY =====
    if (extractedQuotations && extractedQuotations.length > 0) {
      checkNewPage(40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Price Summary (Subtotal, Tax, Total)', margin, yPos);
      yPos += 6;
      
      // Summary table header
      const summaryRows = ['Subtotal', 'Tax/VAT', 'Grand Total'];
      const summaryParamWidth = 35;
      const summaryVendorWidth = (pageWidth - margin * 2 - summaryParamWidth) / suppliers.length;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('', margin + 2, yPos);
      suppliers.forEach((supplier, i) => {
        const xPos = margin + summaryParamWidth + (i * summaryVendorWidth);
        doc.text(supplier.substring(0, 15), xPos + 2, yPos, { maxWidth: summaryVendorWidth - 4 });
      });
      yPos += rowHeight;
      
      // Summary data rows
      doc.setFont('helvetica', 'normal');
      summaryRows.forEach((rowLabel, rowIdx) => {
        checkNewPage(rowHeight + 5);
        
        const isTotal = rowLabel === 'Grand Total';
        if (isTotal) {
          doc.setFillColor(230, 245, 230);
          doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
          doc.setFont('helvetica', 'bold');
        } else if (rowIdx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
        }
        
        doc.setFontSize(7);
        doc.text(rowLabel, margin + 2, yPos);
        
        // Find min total for highlighting
        const totals = extractedQuotations.map(q => q.commercial?.total || 0);
        const minTotal = Math.min(...totals.filter(t => t > 0));
        
        suppliers.forEach((supplier, i) => {
          const q = extractedQuotations.find(eq => eq.supplier?.name === supplier);
          const xPos = margin + summaryParamWidth + (i * summaryVendorWidth);
          let value = 0;
          
          if (rowLabel === 'Subtotal') {
            value = q?.commercial?.subtotal || 0;
          } else if (rowLabel === 'Tax/VAT') {
            value = q?.commercial?.tax || 0;
          } else if (rowLabel === 'Grand Total') {
            value = q?.commercial?.total || 0;
          }
          
          // Highlight lowest total
          if (isTotal && value > 0 && value === minTotal) {
            doc.setFillColor(198, 246, 213);
            doc.rect(xPos, yPos - 5, summaryVendorWidth, rowHeight, 'F');
          }
          
          const currency = q?.commercial?.currency || 'AED';
          doc.text(value > 0 ? `${currency} ${value.toLocaleString()}` : '-', xPos + 2, yPos);
        });
        
        doc.setFont('helvetica', 'normal');
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
    
    // Navigate to home after download - use /analyzer if on analyzer path
    const homePath = window.location.pathname.startsWith('/analyzer') ? '/analyzer' : '/';
    setTimeout(() => navigate(homePath), 1000);
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
    
    // Item-wise Price Comparison with Lowest and Average
    if (itemComparisonMatrix && itemComparisonMatrix.length > 0) {
      csv += '\nITEM-WISE PRICE COMPARISON\n';
      csv += `#,Item Description,Qty,Unit,${suppliers.flatMap(s => [`${s} Rate`, `${s} Amount`]).join(',')},Lowest Total,Average Total\n`;
      itemComparisonMatrix.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const unit = item.unit || 'EA';
        const vendorData = suppliers.flatMap(s => {
          const rate = item.suppliers?.[s]?.unitPrice || 0;
          const amount = qty * rate;
          return [rate > 0 ? rate : '-', amount > 0 ? amount : '-'];
        }).join(',');
        csv += `${idx + 1},"${(item.item || '').replace(/"/g, "'")}",${qty},${unit},${vendorData},${(item.lowestTotal || 0) > 0 ? item.lowestTotal : '-'},${(item.averageTotal || 0) > 0 ? Math.round(item.averageTotal || 0) : '-'}\n`;
      });
    }
    
    // Subtotal / VAT / Total Summary
    if (extractedQuotations && extractedQuotations.length > 0) {
      csv += '\nPRICE SUMMARY\n';
      csv += `Parameter,${suppliers.join(',')}\n`;
      ['Subtotal', 'Tax/VAT', 'Grand Total'].forEach(label => {
        const values = suppliers.map(s => {
          const q = extractedQuotations.find(eq => eq.supplier?.name === s);
          let val = 0;
          if (label === 'Subtotal') val = q?.commercial?.subtotal || 0;
          else if (label === 'Tax/VAT') val = q?.commercial?.tax || 0;
          else val = q?.commercial?.total || 0;
          return val > 0 ? val : '-';
        }).join(',');
        csv += `"${label}",${values}\n`;
      });
    }
    
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
    
    // Navigate to home after download - use /analyzer if on analyzer path
    const homePath = window.location.pathname.startsWith('/analyzer') ? '/analyzer' : '/';
    setTimeout(() => navigate(homePath), 1000);
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
