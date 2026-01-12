import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useAnalysisReports } from '@/hooks/useAnalysisReports';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, 
  Search, 
  Upload, 
  FileText, 
  Download, 
  Factory,
  Store,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  X,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Smartphone,
  User,
  FileSpreadsheet,
  Save,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductAnalysis {
  product: {
    name: string;
    category: string;
    description: string;
  };
  specifications: {
    material?: string;
    dimensions?: string;
    power?: string;
    capacity?: string;
    standards?: string[];
    alternatives?: string[];
  };
  manufacturers: Array<{
    name: string;
    country: string;
    address: string;
    website?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    salesPerson?: string;
    department?: string;
    rating?: number;
    isRegional: boolean;
  }>;
  suppliers: Array<{
    name: string;
    city: string;
    address: string;
    website?: string;
    contactPerson?: string;
    salesPerson?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    department?: string;
    isLocal: boolean;
  }>;
  marketSummary: {
    priceRange: { min: number; max: number; currency: string };
    availability: 'high' | 'medium' | 'low';
    leadTime: string;
    recommendation: string;
    risks: string[];
  };
}

export default function MarketAnalysisPage() {
  const { language, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();
  const { saveReport } = useAnalysisReports();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for view mode from navigation state
  const viewReport = location.state?.viewReport;

  const [inputType, setInputType] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [specsInput, setSpecsInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Handle viewing saved report
  useEffect(() => {
    if (viewReport?.analysisData) {
      setAnalysis(viewReport.analysisData);
      setActiveTab('product');
      setIsViewMode(true);
      setIsSaved(true);
    }
  }, [viewReport]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const startAnalysis = async () => {
    if (inputType === 'text' && !textInput.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى إدخال وصف المنتج' 
          : 'Please enter a product description',
        variant: 'destructive',
      });
      return;
    }

    if (inputType === 'image' && !imageFile) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى تحميل صورة المنتج' 
          : 'Please upload a product image',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      let imageBase64 = null;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      }

      setAnalysisProgress(20);

      const { data, error } = await supabase.functions.invoke('ai-market-analysis', {
        body: {
          inputType,
          textDescription: textInput,
          technicalSpecs: specsInput,
          imageData: imageBase64,
          companySettings: {
            name: settings.company_name_en,
            region: settings.region || 'middle_east',
            country: settings.country || 'UAE',
            currency: settings.default_currency || 'AED',
          },
        },
      });

      if (error) throw error;

      setAnalysisProgress(80);
      setAnalysis(data.analysis);
      setAnalysisProgress(100);
      setActiveTab('product');
      setIsSaved(false);
      setShowSaveDialog(true);

      toast({
        title: language === 'ar' ? 'تم التحليل بنجاح' : 'Analysis Complete',
        description: language === 'ar' 
          ? 'تم تحليل المنتج بنجاح' 
          : 'Product analysis completed successfully',
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في التحليل' : 'Analysis Error',
        description: error.message || 'Failed to analyze product',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveReport = () => {
    if (!analysis) return;
    
    const manufacturers = analysis.manufacturers?.length || 0;
    const suppliers = analysis.suppliers?.length || 0;
    const inputSummary = `${manufacturers} Manufacturers, ${suppliers} Suppliers`;
    
    const saved = saveReport(
      'market',
      analysis.product?.name || textInput || 'Market Analysis',
      analysis,
      inputSummary
    );
    
    setIsSaved(true);
    setShowSaveDialog(false);
    
    toast({
      title: language === 'ar' ? 'تم الحفظ' : 'Report Saved',
      description: `${language === 'ar' ? 'تم حفظ التقرير برقم' : 'Report saved as'} ${saved.sequenceNumber}`,
    });
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
    if (!analysis) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: 'Please allow popups to download the report',
        variant: 'destructive',
      });
      return;
    }

    const reportHTML = generatePDFReport();
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

  const downloadExcel = () => {
    if (!analysis) return;

    // Generate CSV data
    let csv = 'Market Analysis Report\n\n';
    csv += 'Product Information\n';
    csv += `Name,${analysis.product.name}\n`;
    csv += `Category,${analysis.product.category}\n`;
    csv += `Description,${analysis.product.description}\n\n`;

    csv += 'Specifications\n';
    if (analysis.specifications.material) csv += `Material,${analysis.specifications.material}\n`;
    if (analysis.specifications.dimensions) csv += `Dimensions,${analysis.specifications.dimensions}\n`;
    if (analysis.specifications.power) csv += `Power,${analysis.specifications.power}\n`;
    if (analysis.specifications.capacity) csv += `Capacity,${analysis.specifications.capacity}\n`;
    csv += '\n';

    csv += 'Manufacturers\n';
    csv += 'Name,Country,Email,Phone,Type\n';
    analysis.manufacturers.forEach(m => {
      csv += `"${m.name}","${m.country}","${m.email || ''}","${m.phone || ''}","${m.isRegional ? 'Regional' : 'Global'}"\n`;
    });
    csv += '\n';

    csv += 'Suppliers\n';
    csv += 'Name,City,Contact Person,Email,Phone,Type\n';
    analysis.suppliers.forEach(s => {
      csv += `"${s.name}","${s.city}","${s.contactPerson || ''}","${s.email || ''}","${s.phone || ''}","${s.isLocal ? 'Local' : 'Regional'}"\n`;
    });
    csv += '\n';

    csv += 'Market Summary\n';
    csv += `Price Range,${analysis.marketSummary.priceRange.currency} ${analysis.marketSummary.priceRange.min} - ${analysis.marketSummary.priceRange.max}\n`;
    csv += `Availability,${analysis.marketSummary.availability}\n`;
    csv += `Lead Time,${analysis.marketSummary.leadTime}\n`;
    csv += `Recommendation,${analysis.marketSummary.recommendation}\n`;

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `market-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: language === 'ar' ? 'تم التنزيل' : 'Downloaded',
      description: language === 'ar' ? 'تم تنزيل ملف Excel' : 'Excel file downloaded',
    });
  };

  const generatePDFReport = () => {
    if (!analysis) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Market Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-height: 60px; }
          .company-info { text-align: right; }
          h1 { color: #1a365d; margin-bottom: 10px; }
          h2 { color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px; }
          .section { margin-bottom: 30px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
          .label { font-weight: bold; color: #4a5568; margin-bottom: 5px; }
          .value { color: #1a202c; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          th { background: #f7fafc; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
          .badge-green { background: #c6f6d5; color: #22543d; }
          .badge-yellow { background: #fefcbf; color: #744210; }
          .badge-red { background: #fed7d7; color: #742a2a; }
          .recommendation { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin-top: 20px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${settings.logo_url ? `<img src="${settings.logo_url}" class="logo" alt="Company Logo" />` : ''}
            <h1>${settings.company_name_en || 'Company Name'}</h1>
          </div>
          <div class="company-info">
            <p>${settings.address_en || ''}</p>
            <p>${settings.phone || ''} | ${settings.email || ''}</p>
            <p>Region: ${settings.region || 'N/A'}</p>
          </div>
        </div>

        <h1 style="text-align: center;">Market Analysis Report</h1>
        <p style="text-align: center; color: #718096;">
          Generated on: ${new Date().toLocaleDateString()}
        </p>

        <div class="section">
          <h2>Product Information</h2>
          <div class="grid">
            <div class="card">
              <div class="label">Product Name</div>
              <div class="value">${analysis.product.name}</div>
            </div>
            <div class="card">
              <div class="label">Category</div>
              <div class="value">${analysis.product.category}</div>
            </div>
          </div>
          <p style="margin-top: 15px;">${analysis.product.description}</p>
        </div>

        <div class="section">
          <h2>Technical Specifications</h2>
          <div class="grid">
            ${analysis.specifications.material ? `<div class="card"><div class="label">Material</div><div class="value">${analysis.specifications.material}</div></div>` : ''}
            ${analysis.specifications.dimensions ? `<div class="card"><div class="label">Dimensions</div><div class="value">${analysis.specifications.dimensions}</div></div>` : ''}
            ${analysis.specifications.power ? `<div class="card"><div class="label">Power</div><div class="value">${analysis.specifications.power}</div></div>` : ''}
            ${analysis.specifications.capacity ? `<div class="card"><div class="label">Capacity</div><div class="value">${analysis.specifications.capacity}</div></div>` : ''}
          </div>
          ${analysis.specifications.standards?.length ? `<p><strong>Standards:</strong> ${analysis.specifications.standards.join(', ')}</p>` : ''}
        </div>

        <div class="section">
          <h2>Manufacturers (${analysis.manufacturers.length})</h2>
          <table>
            <thead>
              <tr><th>Name</th><th>Country</th><th>Contact</th><th>Type</th></tr>
            </thead>
            <tbody>
              ${analysis.manufacturers.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td>${m.country}</td>
                  <td>${m.email || m.phone || 'N/A'}</td>
                  <td>${m.isRegional ? 'Regional' : 'Global'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Suppliers (${analysis.suppliers.length})</h2>
          <table>
            <thead>
              <tr><th>Name</th><th>City</th><th>Contact</th><th>Type</th></tr>
            </thead>
            <tbody>
              ${analysis.suppliers.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td>${s.city}</td>
                  <td>${s.contactPerson || s.phone || 'N/A'}</td>
                  <td>${s.isLocal ? 'Local' : 'Regional'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Market Summary</h2>
          <div class="grid">
            <div class="card">
              <div class="label">Price Range</div>
              <div class="value">${analysis.marketSummary.priceRange.currency} ${analysis.marketSummary.priceRange.min.toLocaleString()} - ${analysis.marketSummary.priceRange.max.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="label">Availability</div>
              <div class="value"><span class="badge badge-${analysis.marketSummary.availability === 'high' ? 'green' : analysis.marketSummary.availability === 'medium' ? 'yellow' : 'red'}">${analysis.marketSummary.availability.toUpperCase()}</span></div>
            </div>
            <div class="card">
              <div class="label">Lead Time</div>
              <div class="value">${analysis.marketSummary.leadTime}</div>
            </div>
          </div>
          <div class="recommendation">
            <strong>AI Recommendation:</strong><br/>
            ${analysis.marketSummary.recommendation}
          </div>
          ${analysis.marketSummary.risks.length ? `
            <div style="margin-top: 15px;">
              <strong>Risk Notes:</strong>
              <ul>${analysis.marketSummary.risks.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  };

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'high':
        return <Badge className="bg-green-500">High Availability</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Medium Availability</Badge>;
      case 'low':
        return <Badge className="bg-red-500">Low Availability</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    setIsViewMode(false);
    setIsSaved(false);
    setActiveTab('input');
    setTextInput('');
    setSpecsInput('');
    setImageFile(null);
    setImagePreview(null);
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {language === 'ar' ? 'تحليل السوق بالذكاء الاصطناعي' : 'AI Market Analysis'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'تعرف على المنتجات واعثر على المصنعين والموردين في منطقتك' 
                  : 'Identify products and find manufacturers & suppliers in your region'}
              </p>
            </div>
          </div>
          {analysis && (
            <div className="flex gap-2">
              {!isSaved && !isViewMode && (
                <Button onClick={handleSaveReport} variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              )}
              <Button onClick={downloadExcel} variant="outline" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={downloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="input" className="py-2">
              <Search className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'البحث' : 'Search'}
            </TabsTrigger>
            <TabsTrigger value="product" disabled={!analysis} className="py-2">
              <FileText className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'المنتج' : 'Product'}
            </TabsTrigger>
            <TabsTrigger value="manufacturers" disabled={!analysis} className="py-2">
              <Factory className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'المصنعين' : 'Manufacturers'}
            </TabsTrigger>
            <TabsTrigger value="suppliers" disabled={!analysis} className="py-2">
              <Store className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'الموردين' : 'Suppliers'}
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'طريقة الإدخال' : 'Input Method'}</CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'اختر طريقة البحث عن المنتج' 
                    : 'Choose how to search for the product'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    variant={inputType === 'text' ? 'default' : 'outline'}
                    onClick={() => setInputType('text')}
                    className="flex-1 h-20"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-6 w-6" />
                      <span>{language === 'ar' ? 'وصف نصي' : 'Text Description'}</span>
                    </div>
                  </Button>
                  <Button
                    variant={inputType === 'image' ? 'default' : 'outline'}
                    onClick={() => setInputType('image')}
                    className="flex-1 h-20"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-6 w-6" />
                      <span>{language === 'ar' ? 'صورة المنتج' : 'Product Image'}</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {inputType === 'text' && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'وصف المنتج' : 'Product Description'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder={language === 'ar' 
                      ? 'أدخل وصف المنتج الذي تبحث عنه...' 
                      : 'Enter the product description you are looking for...'}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <Textarea
                    placeholder={language === 'ar' 
                      ? 'المواصفات الفنية (اختياري)...' 
                      : 'Technical specifications (optional)...'}
                    value={specsInput}
                    onChange={(e) => setSpecsInput(e.target.value)}
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            )}

            {inputType === 'image' && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'تحميل صورة المنتج' : 'Upload Product Image'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {!imagePreview ? (
                    <label className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors block">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {language === 'ar' 
                          ? 'انقر أو اسحب صورة المنتج هنا' 
                          : 'Click or drag product image here'}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="max-h-64 rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card>
                <CardContent className="py-8">
                  <div className="space-y-4 text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <div>
                      <p className="font-medium">
                        {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'البحث عن المصنعين والموردين' 
                          : 'Searching for manufacturers and suppliers'}
                      </p>
                    </div>
                    <Progress value={analysisProgress} className="max-w-xs mx-auto" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={startAnalysis}
              disabled={isAnalyzing || (inputType === 'text' && !textInput.trim()) || (inputType === 'image' && !imageFile)}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'بدء التحليل' : 'Start Analysis'}
                </>
              )}
            </Button>
          </TabsContent>

          {/* Product Tab */}
          <TabsContent value="product" className="space-y-4">
            {analysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'معلومات المنتج' : 'Product Information'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {language === 'ar' ? 'اسم المنتج' : 'Product Name'}
                        </label>
                        <p className="text-lg font-semibold">{analysis.product.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {language === 'ar' ? 'الفئة' : 'Category'}
                        </label>
                        <p className="text-lg">{analysis.product.category}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {language === 'ar' ? 'الوصف' : 'Description'}
                      </label>
                      <p className="mt-1">{analysis.product.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {analysis.specifications.material && (
                        <div className="p-3 bg-muted rounded-lg">
                          <label className="text-sm font-medium text-muted-foreground">Material</label>
                          <p>{analysis.specifications.material}</p>
                        </div>
                      )}
                      {analysis.specifications.dimensions && (
                        <div className="p-3 bg-muted rounded-lg">
                          <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                          <p>{analysis.specifications.dimensions}</p>
                        </div>
                      )}
                      {analysis.specifications.power && (
                        <div className="p-3 bg-muted rounded-lg">
                          <label className="text-sm font-medium text-muted-foreground">Power</label>
                          <p>{analysis.specifications.power}</p>
                        </div>
                      )}
                      {analysis.specifications.capacity && (
                        <div className="p-3 bg-muted rounded-lg">
                          <label className="text-sm font-medium text-muted-foreground">Capacity</label>
                          <p>{analysis.specifications.capacity}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'ملخص السوق' : 'Market Summary'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <label className="text-sm text-muted-foreground">Price Range</label>
                        <p className="font-semibold">
                          {analysis.marketSummary.priceRange.currency} {analysis.marketSummary.priceRange.min.toLocaleString()} - {analysis.marketSummary.priceRange.max.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <label className="text-sm text-muted-foreground">Availability</label>
                        <div className="mt-1">{getAvailabilityBadge(analysis.marketSummary.availability)}</div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <label className="text-sm text-muted-foreground">Lead Time</label>
                        <p className="font-semibold">{analysis.marketSummary.leadTime}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-sm font-medium">AI Recommendation</label>
                          <p className="mt-1">{analysis.marketSummary.recommendation}</p>
                        </div>
                      </div>
                    </div>
                    {analysis.marketSummary.risks.length > 0 && (
                      <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div>
                            <label className="text-sm font-medium">Risk Notes</label>
                            <ul className="mt-1 list-disc list-inside text-sm">
                              {analysis.marketSummary.risks.map((risk, idx) => (
                                <li key={idx}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Manufacturers Tab */}
          <TabsContent value="manufacturers" className="space-y-4">
            {analysis && (
              <div className="grid gap-4">
                {analysis.manufacturers.map((manufacturer, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Factory className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{manufacturer.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4" />
                              <span>{manufacturer.country}</span>
                              <Badge variant={manufacturer.isRegional ? 'default' : 'outline'} className="ml-2">
                                {manufacturer.isRegional ? 'Regional' : 'Global'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
                        {manufacturer.address && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{manufacturer.address}</span>
                          </div>
                        )}
                        {manufacturer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{manufacturer.email}</span>
                          </div>
                        )}
                        {manufacturer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{manufacturer.phone}</span>
                          </div>
                        )}
                        {manufacturer.mobile && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span>{manufacturer.mobile}</span>
                          </div>
                        )}
                        {manufacturer.salesPerson && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{manufacturer.salesPerson}</span>
                          </div>
                        )}
                        {manufacturer.website && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {manufacturer.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-4">
            {analysis && (
              <div className="grid gap-4">
                {analysis.suppliers.map((supplier, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{supplier.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4" />
                              <span>{supplier.city}</span>
                              <Badge variant={supplier.isLocal ? 'default' : 'outline'} className="ml-2">
                                {supplier.isLocal ? 'Local' : 'Regional'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
                        {supplier.address && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.address}</span>
                          </div>
                        )}
                        {supplier.contactPerson && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.contactPerson}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.mobile && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.mobile}</span>
                          </div>
                        )}
                        {supplier.website && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {supplier.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AnalyzerLayout>
  );
}
