import React, { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  X, 
  Sparkles, 
  Download, 
  FileSpreadsheet,
  Award,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Clock,
  Shield,
  Loader2,
  Eye
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: ExtractedQuotation;
}

interface ExtractedQuotation {
  supplier: {
    name: string;
    address: string;
    contact: string;
    email: string;
  };
  quotation: {
    reference: string;
    date: string;
    validityDays: number;
  };
  items: Array<{
    itemNo: number;
    description: string;
    materialCode?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discount?: number;
    vat?: number;
  }>;
  commercial: {
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    deliveryTerms: string;
    paymentTerms: string;
    deliveryDays: number;
  };
  technical: {
    specifications: string[];
    brand?: string;
    model?: string;
    warranty?: string;
    compliance?: string[];
    deviations?: string[];
  };
}

interface AnalysisResult {
  technicalComparison: Array<{
    criteria: string;
    suppliers: Record<string, { value: string; score: number }>;
  }>;
  commercialComparison: Array<{
    criteria: string;
    suppliers: Record<string, { value: string; isLowest?: boolean }>;
  }>;
  ranking: Array<{
    supplierName: string;
    technicalScore: number;
    commercialScore: number;
    overallScore: number;
    recommendation: 'best_value' | 'lowest_price' | 'technical_leader' | 'not_recommended';
    risks: string[];
  }>;
  summary: {
    lowestEvaluated: string;
    bestValue: string;
    recommendation: string;
    notes: string[];
  };
}

export default function AIOfferAnalysisPage() {
  const { language, isRTL } = useLanguage();
  const { companySettings } = useCompany();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);

  const acceptedFormats = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.txt';

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (file.type.includes('image')) return <Eye className="h-8 w-8 text-blue-500" />;
    if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) 
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length < 1) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى تحميل عرض واحد على الأقل للتحليل' 
          : 'Please upload at least 1 quotation to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Convert files to base64
      const filePromises = uploadedFiles.map(async (uf) => {
        const base64 = await fileToBase64(uf.file);
        return {
          name: uf.file.name,
          type: uf.file.type,
          data: base64,
        };
      });

      const filesData = await Promise.all(filePromises);
      setAnalysisProgress(20);

      // Call AI analysis edge function
      const { data, error } = await supabase.functions.invoke('ai-offer-analysis', {
        body: {
          files: filesData,
          companySettings: {
            name: companySettings?.company_name_en,
            region: (companySettings as any)?.region,
            currency: (companySettings as any)?.default_currency || 'AED',
          },
        },
      });

      if (error) throw error;

      setAnalysisProgress(80);

      // Update files with extracted data
      if (data.extractedQuotations) {
        setUploadedFiles(prev => prev.map((uf, index) => ({
          ...uf,
          status: 'completed',
          extractedData: data.extractedQuotations[index],
        })));
      }

      setAnalysisResult(data.analysis);
      setAnalysisProgress(100);
      setActiveTab('technical');

      toast({
        title: language === 'ar' ? 'تم التحليل بنجاح' : 'Analysis Complete',
        description: language === 'ar' 
          ? 'تم تحليل جميع العروض بنجاح' 
          : 'All quotations have been analyzed successfully',
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في التحليل' : 'Analysis Error',
        description: error.message || 'Failed to analyze quotations',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const downloadPDF = () => {
    if (!analysisResult) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: 'Please allow popups to download the report',
        variant: 'destructive',
      });
      return;
    }

    const quotations = uploadedFiles.filter(f => f.extractedData).map(f => f.extractedData!);
    const supplierNames = quotations.map(q => q.supplier.name);

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Offer Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 1100px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-height: 60px; }
          .company-info { text-align: right; }
          h1 { color: #1a365d; margin-bottom: 10px; }
          h2 { color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px; }
          .section { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background: #f7fafc; font-weight: bold; }
          .lowest { background: #c6f6d5; }
          .best-value { background: #bee3f8; }
          .recommendation-box { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin-top: 20px; }
          .risk-box { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin-top: 10px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${companySettings?.logo_url ? `<img src="${companySettings.logo_url}" class="logo" alt="Logo" />` : ''}
            <h1>${companySettings?.company_name_en || 'Company Name'}</h1>
          </div>
          <div class="company-info">
            <p>${companySettings?.address_en || ''}</p>
            <p>${companySettings?.phone || ''} | ${companySettings?.email || ''}</p>
          </div>
        </div>

        <h1 style="text-align: center;">Quotation Comparative Analysis Report</h1>
        <p style="text-align: center; color: #718096;">
          Generated on: ${new Date().toLocaleDateString()} | Prepared by: ${profile?.full_name || 'N/A'}
        </p>

        <div class="section">
          <h2>Suppliers Analyzed</h2>
          <table>
            <thead><tr><th>#</th><th>Supplier</th><th>Reference</th><th>Date</th><th>Validity</th></tr></thead>
            <tbody>
              ${quotations.map((q, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${q.supplier.name}</td>
                  <td>${q.quotation.reference}</td>
                  <td>${q.quotation.date}</td>
                  <td>${q.quotation.validityDays} days</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Commercial Comparison</h2>
          <table>
            <thead>
              <tr>
                <th>Criteria</th>
                ${supplierNames.map(n => `<th>${n}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${analysisResult.commercialComparison.map(row => `
                <tr>
                  <td><strong>${row.criteria}</strong></td>
                  ${supplierNames.map(name => {
                    const val = row.suppliers[name];
                    return `<td class="${val?.isLowest ? 'lowest' : ''}">${val?.value || 'N/A'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Technical Comparison</h2>
          <table>
            <thead>
              <tr>
                <th>Criteria</th>
                ${supplierNames.map(n => `<th>${n}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${analysisResult.technicalComparison.map(row => `
                <tr>
                  <td><strong>${row.criteria}</strong></td>
                  ${supplierNames.map(name => {
                    const val = row.suppliers[name];
                    return `<td>${val?.value || 'N/A'} ${val?.score ? `(${val.score}/10)` : ''}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>AI Recommendation</h2>
          <div class="recommendation-box">
            <p><strong>Best Value Supplier:</strong> ${analysisResult.summary.bestValue}</p>
            <p><strong>Lowest Price:</strong> ${analysisResult.summary.lowestEvaluated}</p>
            <p><strong>Recommendation:</strong> ${analysisResult.summary.recommendation}</p>
          </div>
          ${analysisResult.summary.notes?.length ? `
            <div class="risk-box">
              <strong>Notes:</strong>
              <ul>${analysisResult.summary.notes.map(n => `<li>${n}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>Ranking Summary</h2>
          <table>
            <thead><tr><th>Rank</th><th>Supplier</th><th>Overall Score</th><th>Recommendation</th></tr></thead>
            <tbody>
              ${analysisResult.ranking.map((r, i) => `
                <tr class="${r.recommendation === 'best_value' ? 'best-value' : ''}">
                  <td>${i + 1}</td>
                  <td>${r.supplierName}</td>
                  <td>${r.overallScore}/100</td>
                  <td>${r.recommendation.replace('_', ' ').toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    toast({
      title: language === 'ar' ? 'تم الفتح' : 'Report Opened',
      description: language === 'ar' ? 'استخدم خيار الطباعة لحفظ PDF' : 'Use print dialog to save as PDF',
    });
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'best_value':
        return <Badge className="bg-green-500"><Award className="h-3 w-3 mr-1" /> Best Value</Badge>;
      case 'lowest_price':
        return <Badge className="bg-blue-500"><DollarSign className="h-3 w-3 mr-1" /> Lowest Price</Badge>;
      case 'technical_leader':
        return <Badge className="bg-purple-500"><TrendingUp className="h-3 w-3 mr-1" /> Technical Leader</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Review Required</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="AI Offer Analysis"
          titleAr="تحليل العروض بالذكاء الاصطناعي"
          description="Upload supplier quotations for intelligent comparison and analysis"
          descriptionAr="قم بتحميل عروض الموردين للمقارنة والتحليل الذكي"
          icon={Sparkles}
          actions={
            analysisResult && (
              <Button onClick={downloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
              </Button>
            )
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="upload" className="py-2">
              <Upload className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'التحميل' : 'Upload'}
            </TabsTrigger>
            <TabsTrigger value="technical" disabled={!analysisResult} className="py-2">
              <Shield className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'المقارنة الفنية' : 'Technical'}
            </TabsTrigger>
            <TabsTrigger value="commercial" disabled={!analysisResult} className="py-2">
              <DollarSign className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'المقارنة التجارية' : 'Commercial'}
            </TabsTrigger>
            <TabsTrigger value="recommendation" disabled={!analysisResult} className="py-2">
              <Award className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'التوصية' : 'Recommendation'}
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            {/* Drop Zone */}
            <Card>
              <CardContent className="p-6">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    {language === 'ar' ? 'اسحب وأفلت الملفات هنا' : 'Drag and drop files here'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'ar' 
                      ? 'أو انقر للاختيار من جهازك' 
                      : 'or click to browse from your device'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'الصيغ المدعومة: PDF, صور, Excel, Word, نصوص' 
                      : 'Supported: PDF, Images, Excel, Word, Text files'}
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept={acceptedFormats}
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === 'ar' ? 'الملفات المحملة' : 'Uploaded Files'}
                    <Badge variant="secondary" className="ml-2">{uploadedFiles.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {uploadedFiles.map((uf) => (
                      <div
                        key={uf.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                      >
                        {uf.preview ? (
                          <img src={uf.preview} alt="" className="h-12 w-12 object-cover rounded" />
                        ) : (
                          getFileIcon(uf.file)
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{uf.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uf.file.size / 1024).toFixed(1)} KB
                          </p>
                          {uf.status === 'completed' && (
                            <Badge variant="outline" className="text-green-600 mt-1">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Extracted
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(uf.id)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Progress */}
            {isAnalyzing && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-medium">
                        {language === 'ar' ? 'جاري التحليل...' : 'Analyzing quotations...'}
                      </span>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {analysisProgress < 30 && (language === 'ar' ? 'استخراج البيانات من الملفات...' : 'Extracting data from files...')}
                      {analysisProgress >= 30 && analysisProgress < 60 && (language === 'ar' ? 'تحليل المواصفات الفنية...' : 'Analyzing technical specifications...')}
                      {analysisProgress >= 60 && analysisProgress < 90 && (language === 'ar' ? 'مقارنة الأسعار والشروط...' : 'Comparing prices and terms...')}
                      {analysisProgress >= 90 && (language === 'ar' ? 'إنشاء التوصيات...' : 'Generating recommendations...')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start Analysis Button */}
            <div className="flex justify-center">
              <Button 
                size="lg" 
                onClick={startAnalysis}
                disabled={uploadedFiles.length < 2 || isAnalyzing}
                className="gap-2"
              >
                <Sparkles className="h-5 w-5" />
                {language === 'ar' ? 'بدء التحليل' : 'Start Analysis'}
              </Button>
            </div>

            {uploadedFiles.length > 0 && uploadedFiles.length < 2 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' 
                    ? 'يرجى تحميل عرضين على الأقل للمقارنة' 
                    : 'Please upload at least 2 quotations to compare'}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Technical Comparison Tab */}
          <TabsContent value="technical" className="space-y-4">
            {analysisResult?.technicalComparison && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'المقارنة الفنية' : 'Technical Comparison'}</CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'مقارنة المواصفات الفنية والامتثال' 
                      : 'Compare technical specifications and compliance'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المعيار' : 'Criteria'}</TableHead>
                        {Object.keys(analysisResult.technicalComparison[0]?.suppliers || {}).map(supplier => (
                          <TableHead key={supplier}>{supplier}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.technicalComparison.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.criteria}</TableCell>
                          {Object.entries(row.suppliers).map(([supplier, data]) => (
                            <TableCell key={supplier}>
                              <div className="flex items-center gap-2">
                                <span>{data.value}</span>
                                {data.score >= 80 && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {data.score < 50 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Commercial Comparison Tab */}
          <TabsContent value="commercial" className="space-y-4">
            {analysisResult?.commercialComparison && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'المقارنة التجارية' : 'Commercial Comparison'}</CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'مقارنة الأسعار وشروط الدفع والتسليم' 
                      : 'Compare prices, payment terms, and delivery'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المعيار' : 'Criteria'}</TableHead>
                        {Object.keys(analysisResult.commercialComparison[0]?.suppliers || {}).map(supplier => (
                          <TableHead key={supplier}>{supplier}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.commercialComparison.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.criteria}</TableCell>
                          {Object.entries(row.suppliers).map(([supplier, data]) => (
                            <TableCell key={supplier}>
                              <div className="flex items-center gap-2">
                                <span className={data.isLowest ? 'text-green-600 font-semibold' : ''}>
                                  {data.value}
                                </span>
                                {data.isLowest && <Badge className="bg-green-500">Lowest</Badge>}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recommendation Tab */}
          <TabsContent value="recommendation" className="space-y-4">
            {analysisResult?.ranking && (
              <>
                {/* Ranking Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analysisResult.ranking.map((supplier, index) => (
                    <Card key={supplier.supplierName} className={index === 0 ? 'border-primary ring-2 ring-primary/20' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{supplier.supplierName}</CardTitle>
                          <Badge variant="outline">#{index + 1}</Badge>
                        </div>
                        {getRecommendationBadge(supplier.recommendation)}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-2xl font-bold text-primary">{supplier.technicalScore}</p>
                            <p className="text-xs text-muted-foreground">Technical</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-blue-500">{supplier.commercialScore}</p>
                            <p className="text-xs text-muted-foreground">Commercial</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-500">{supplier.overallScore}</p>
                            <p className="text-xs text-muted-foreground">Overall</p>
                          </div>
                        </div>
                        {supplier.risks.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Risk Notes:</p>
                            {supplier.risks.map((risk, i) => (
                              <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {risk}
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Summary Card */}
                {analysisResult.summary && (
                  <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        {language === 'ar' ? 'ملخص التوصية' : 'Recommendation Summary'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'أقل سعر مقيم:' : 'Lowest Evaluated:'}
                          </p>
                          <p className="font-semibold text-lg">{analysisResult.summary.lowestEvaluated}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'أفضل قيمة:' : 'Best Value:'}
                          </p>
                          <p className="font-semibold text-lg text-green-600">{analysisResult.summary.bestValue}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          {language === 'ar' ? 'التوصية:' : 'Recommendation:'}
                        </p>
                        <p className="text-base">{analysisResult.summary.recommendation}</p>
                      </div>
                      {analysisResult.summary.notes.length > 0 && (
                        <div className="border-t pt-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            {language === 'ar' ? 'ملاحظات:' : 'Notes:'}
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {analysisResult.summary.notes.map((note, i) => (
                              <li key={i} className="text-sm">{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
