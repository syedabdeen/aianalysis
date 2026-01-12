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
import { extractTextFromPDF, isPDF } from '@/lib/pdfTextExtractor';
import { 
  Upload, FileText, X, Sparkles, Download, FileSpreadsheet,
  Award, AlertTriangle, CheckCircle, TrendingUp, DollarSign,
  Clock, Shield, Loader2, Save, ArrowLeft, Eye
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
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
      // Process files - extract PDF text client-side to reduce payload
      setProgressMessage('Extracting document content...');
      const filesData = await Promise.all(uploadedFiles.map(async (uf, index) => {
        setProgressMessage(`Processing file ${index + 1}/${uploadedFiles.length}: ${uf.file.name}`);
        setUploadedFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'processing' } : f
        ));

        if (isPDF(uf.file)) {
          // Extract text from PDF client-side (much smaller payload)
          try {
            const text = await extractTextFromPDF(uf.file);
            return { name: uf.file.name, type: uf.file.type, text };
          } catch (err) {
            console.error('PDF extraction failed, falling back to base64:', err);
            // Fallback to base64 if text extraction fails
            return { name: uf.file.name, type: uf.file.type, data: await fileToBase64(uf.file) };
          }
        } else if (uf.file.type.startsWith('image/')) {
          // Images still need base64 for vision API
          return { name: uf.file.name, type: uf.file.type, data: await fileToBase64(uf.file) };
        } else {
          // Other files - try to read as text or base64
          return { name: uf.file.name, type: uf.file.type, data: await fileToBase64(uf.file) };
        }
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
    const quotations = uploadedFiles.filter(f => f.extractedData).map(f => f.extractedData);
    const supplierNames = quotations.map((q: any) => q?.supplier?.name || 'Unknown');
    
    const html = `<!DOCTYPE html><html><head><title>Comparative Analysis</title><style>body{font-family:Arial;padding:40px;max-width:1100px;margin:0 auto}.header{border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:30px}h1{color:#1a365d}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f7fafc}.lowest{background:#c6f6d5}.best-value{background:#bee3f8}</style></head><body><div class="header">${settings.logo_url?`<img src="${settings.logo_url}" style="max-height:60px"/>`:''}<h1>${settings.company_name_en||'Company'}</h1><p>${settings.address_en||''}</p></div><h1 style="text-align:center">Quotation Comparative Analysis</h1><p style="text-align:center;color:#718096">Generated: ${new Date().toLocaleDateString()}</p><h2>Commercial Comparison</h2><table><thead><tr><th>Criteria</th>${supplierNames.map((n:string)=>`<th>${n}</th>`).join('')}</tr></thead><tbody>${analysisResult.commercialComparison.map(row=>`<tr><td><strong>${row.criteria}</strong></td>${supplierNames.map((name:string)=>{const val=row.suppliers[name];return`<td class="${val?.isLowest?'lowest':''}">${val?.value||'N/A'}</td>`;}).join('')}</tr>`).join('')}</tbody></table><h2>AI Recommendation</h2><div style="background:#ebf8ff;border-left:4px solid #3182ce;padding:15px"><p><strong>Best Value:</strong> ${analysisResult.summary.bestValue}</p><p><strong>Lowest Price:</strong> ${analysisResult.summary.lowestEvaluated}</p><p><strong>Recommendation:</strong> ${analysisResult.summary.recommendation}</p></div></body></html>`;
    
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
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
