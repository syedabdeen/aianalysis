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
  technicalComparison: Array<{ criteria: string; suppliers: Record<string, { value: string; score: number }> }>;
  commercialComparison: Array<{ criteria: string; suppliers: Record<string, { value: string; isLowest?: boolean }> }>;
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
  };

  const downloadPDF = () => {
    if (!analysisResult) return;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 20;
    
    // Get supplier names
    const suppliers = Object.keys(analysisResult.commercialComparison?.[0]?.suppliers || {});
    
    // Helper function to add new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };
    
    // Company Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.company_name_en || 'Company', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    if (settings.address_en) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.address_en, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
    }
    
    // Line separator
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Quotation Comparative Analysis', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos += 12;
    
    // Commercial Comparison Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Commercial Comparison', margin, yPos);
    yPos += 8;
    
    // Draw Commercial Table
    const colWidth = (pageWidth - margin * 2) / (suppliers.length + 1);
    const rowHeight = 8;
    
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Criteria', margin + 2, yPos);
    suppliers.forEach((supplier, i) => {
      const xPos = margin + colWidth + (i * colWidth);
      doc.text(supplier.substring(0, 15), xPos + 2, yPos, { maxWidth: colWidth - 4 });
    });
    yPos += rowHeight;
    
    // Table Rows
    doc.setFont('helvetica', 'normal');
    analysisResult.commercialComparison.forEach((row) => {
      checkNewPage(rowHeight + 5);
      
      // Alternate row background
      doc.setFontSize(8);
      doc.text(row.criteria, margin + 2, yPos, { maxWidth: colWidth - 4 });
      
      suppliers.forEach((supplier, i) => {
        const val = row.suppliers[supplier];
        const xPos = margin + colWidth + (i * colWidth);
        
        if (val?.isLowest) {
          doc.setFillColor(200, 246, 213);
          doc.rect(xPos, yPos - 5, colWidth, rowHeight, 'F');
          doc.setFont('helvetica', 'bold');
        }
        
        doc.text(val?.value || 'N/A', xPos + 2, yPos, { maxWidth: colWidth - 4 });
        doc.setFont('helvetica', 'normal');
      });
      
      yPos += rowHeight;
    });
    
    yPos += 10;
    checkNewPage(50);
    
    // Technical Comparison Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Comparison', margin, yPos);
    yPos += 8;
    
    // Technical Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Criteria', margin + 2, yPos);
    suppliers.forEach((supplier, i) => {
      const xPos = margin + colWidth + (i * colWidth);
      doc.text(supplier.substring(0, 15), xPos + 2, yPos, { maxWidth: colWidth - 4 });
    });
    yPos += rowHeight;
    
    // Technical Table Rows
    doc.setFont('helvetica', 'normal');
    analysisResult.technicalComparison.forEach((row) => {
      checkNewPage(rowHeight + 5);
      
      doc.setFontSize(8);
      doc.text(row.criteria, margin + 2, yPos, { maxWidth: colWidth - 4 });
      
      suppliers.forEach((supplier, i) => {
        const val = row.suppliers[supplier];
        const xPos = margin + colWidth + (i * colWidth);
        const displayVal = `${val?.value || 'N/A'} ${val?.score ? `(${val.score})` : ''}`;
        doc.text(displayVal, xPos + 2, yPos, { maxWidth: colWidth - 4 });
      });
      
      yPos += rowHeight;
    });
    
    yPos += 15;
    checkNewPage(60);
    
    // AI Recommendation Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Recommendation Summary', margin, yPos);
    yPos += 10;
    
    // Recommendation Box
    doc.setFillColor(235, 248, 255);
    doc.setDrawColor(49, 130, 206);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 45, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Best Value:', margin + 5, yPos + 3);
    doc.setFont('helvetica', 'normal');
    doc.text(analysisResult.summary.bestValue || 'N/A', margin + 35, yPos + 3);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Lowest Price:', margin + 5, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(analysisResult.summary.lowestEvaluated || 'N/A', margin + 35, yPos + 12);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendation:', margin + 5, yPos + 21);
    doc.setFont('helvetica', 'normal');
    
    // Wrap recommendation text
    const recommendationLines = doc.splitTextToSize(
      analysisResult.summary.recommendation || 'N/A',
      pageWidth - margin * 2 - 10
    );
    doc.text(recommendationLines.slice(0, 2), margin + 5, yPos + 30);
    
    // Save PDF directly (no print dialog)
    doc.save(`offer-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadExcel = () => {
    if (!analysisResult) return;
    let csv = 'Quotation Comparative Analysis\n\nCommercial Comparison\n';
    const suppliers = Object.keys(analysisResult.commercialComparison[0]?.suppliers || {});
    csv += `Criteria,${suppliers.join(',')}\n`;
    analysisResult.commercialComparison.forEach(row => {
      csv += `"${row.criteria}",${suppliers.map(s => `"${row.suppliers[s]?.value || 'N/A'}"`).join(',')}\n`;
    });
    csv += `\nRecommendation\nBest Value,${analysisResult.summary.bestValue}\nLowest Price,${analysisResult.summary.lowestEvaluated}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `offer-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
