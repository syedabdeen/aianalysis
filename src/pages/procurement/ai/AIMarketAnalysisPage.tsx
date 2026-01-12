import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  Send
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

export default function AIMarketAnalysisPage() {
  const { language, isRTL } = useLanguage();
  const { companySettings } = useCompany();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [inputType, setInputType] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [specsInput, setSpecsInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');

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
            name: companySettings?.company_name_en,
            region: (companySettings as any)?.region || 'middle_east',
            country: companySettings?.country || 'UAE',
            currency: (companySettings as any)?.default_currency || 'AED',
          },
        },
      });

      if (error) throw error;

      setAnalysisProgress(80);
      setAnalysis(data.analysis);
      setAnalysisProgress(100);
      setActiveTab('product');

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

    // Generate printable HTML report
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: 'Please allow popups to download the report',
        variant: 'destructive',
      });
      return;
    }

    const reportHTML = `
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
            ${companySettings?.logo_url ? `<img src="${companySettings.logo_url}" class="logo" alt="Company Logo" />` : ''}
            <h1>${companySettings?.company_name_en || 'Company Name'}</h1>
          </div>
          <div class="company-info">
            <p>${companySettings?.address_en || ''}</p>
            <p>${companySettings?.phone || ''} | ${companySettings?.email || ''}</p>
            <p>Region: ${(companySettings as any)?.region || 'N/A'}</p>
          </div>
        </div>

        <h1 style="text-align: center;">Market Analysis Report</h1>
        <p style="text-align: center; color: #718096;">
          Generated on: ${new Date().toLocaleDateString()} | Prepared by: ${profile?.full_name || 'N/A'}
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="AI Market Analysis"
          titleAr="تحليل السوق بالذكاء الاصطناعي"
          description="Identify products and find manufacturers & suppliers in your region"
          descriptionAr="تعرف على المنتجات واعثر على المصنعين والموردين في منطقتك"
          icon={Globe}
          actions={
            analysis && (
              <Button onClick={downloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
              </Button>
            )
          }
        />

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
            {/* Input Type Selection */}
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

            {/* Text Input */}
            {inputType === 'text' && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'وصف المنتج' : 'Product Description'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {language === 'ar' ? 'اسم أو وصف المنتج' : 'Product Name or Description'}
                    </label>
                    <Input
                      placeholder={language === 'ar' 
                        ? 'مثال: مضخة غاطسة 3 بوصة' 
                        : 'e.g., 3-inch submersible pump'}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {language === 'ar' ? 'المواصفات الفنية (اختياري)' : 'Technical Specifications (Optional)'}
                    </label>
                    <Textarea
                      placeholder={language === 'ar' 
                        ? 'أدخل أي مواصفات فنية إضافية...' 
                        : 'Enter any additional technical specifications...'}
                      value={specsInput}
                      onChange={(e) => setSpecsInput(e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Image Input */}
            {inputType === 'image' && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'صورة المنتج' : 'Product Image'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Product" 
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
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'انقر لتحميل صورة المنتج' 
                          : 'Click to upload product image'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPEG, PNG supported
                      </p>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
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
                        {language === 'ar' ? 'جاري التحليل...' : 'Analyzing product...'}
                      </span>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {analysisProgress < 30 && (language === 'ar' ? 'تحديد المنتج...' : 'Identifying product...')}
                      {analysisProgress >= 30 && analysisProgress < 60 && (language === 'ar' ? 'البحث عن المصنعين...' : 'Searching manufacturers...')}
                      {analysisProgress >= 60 && analysisProgress < 90 && (language === 'ar' ? 'البحث عن الموردين المحليين...' : 'Finding local suppliers...')}
                      {analysisProgress >= 90 && (language === 'ar' ? 'إنشاء التقرير...' : 'Generating report...')}
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
                disabled={isAnalyzing || (inputType === 'text' && !textInput.trim()) || (inputType === 'image' && !imageFile)}
                className="gap-2"
              >
                <Sparkles className="h-5 w-5" />
                {language === 'ar' ? 'بدء التحليل' : 'Start Analysis'}
              </Button>
            </div>
          </TabsContent>

          {/* Product Tab */}
          <TabsContent value="product" className="space-y-4">
            {analysis?.product && (
              <>
                {/* Product Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      {analysis.product.name}
                    </CardTitle>
                    <Badge variant="outline">{analysis.product.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{analysis.product.description}</p>
                  </CardContent>
                </Card>

                {/* Technical Specifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {analysis.specifications.material && (
                        <div>
                          <p className="text-sm text-muted-foreground">Material</p>
                          <p className="font-medium">{analysis.specifications.material}</p>
                        </div>
                      )}
                      {analysis.specifications.dimensions && (
                        <div>
                          <p className="text-sm text-muted-foreground">Dimensions</p>
                          <p className="font-medium">{analysis.specifications.dimensions}</p>
                        </div>
                      )}
                      {analysis.specifications.power && (
                        <div>
                          <p className="text-sm text-muted-foreground">Power</p>
                          <p className="font-medium">{analysis.specifications.power}</p>
                        </div>
                      )}
                      {analysis.specifications.capacity && (
                        <div>
                          <p className="text-sm text-muted-foreground">Capacity</p>
                          <p className="font-medium">{analysis.specifications.capacity}</p>
                        </div>
                      )}
                    </div>
                    {analysis.specifications.standards && analysis.specifications.standards.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">International Standards</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.specifications.standards.map((std, i) => (
                            <Badge key={i} variant="secondary">{std}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.specifications.alternatives && analysis.specifications.alternatives.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Common Alternatives</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.specifications.alternatives.map((alt, i) => (
                            <Badge key={i} variant="outline">{alt}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Market Summary */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      {language === 'ar' ? 'ملخص السوق' : 'Market Summary'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price Range</p>
                        <p className="text-xl font-bold">
                          {analysis.marketSummary.priceRange.currency} {analysis.marketSummary.priceRange.min.toLocaleString()} - {analysis.marketSummary.priceRange.max.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Availability</p>
                        <div className="mt-1">
                          {getAvailabilityBadge(analysis.marketSummary.availability)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lead Time</p>
                        <p className="font-medium">{analysis.marketSummary.leadTime}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Recommendation</p>
                      <p>{analysis.marketSummary.recommendation}</p>
                    </div>
                    {analysis.marketSummary.risks.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Risk Notes</p>
                        <ul className="space-y-1">
                          {analysis.marketSummary.risks.map((risk, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-amber-600">
                              <AlertTriangle className="h-4 w-4" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Manufacturers Tab */}
          <TabsContent value="manufacturers" className="space-y-4">
            {analysis?.manufacturers && (
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.manufacturers.map((mfr, index) => (
                  <Card key={index} className={mfr.isRegional ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{mfr.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {mfr.country}
                          </CardDescription>
                        </div>
                        {mfr.isRegional && (
                          <Badge className="bg-primary">Regional</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mfr.address && (
                        <p className="text-sm text-muted-foreground">{mfr.address}</p>
                      )}
                      
                      {/* Contact Details */}
                      <div className="space-y-2 pt-2 border-t">
                        {mfr.salesPerson && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{mfr.salesPerson}</span>
                            {mfr.department && <span className="text-muted-foreground">({mfr.department})</span>}
                          </div>
                        )}
                        {mfr.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${mfr.email}`} className="text-primary hover:underline">{mfr.email}</a>
                          </div>
                        )}
                        {mfr.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${mfr.phone}`} className="hover:underline">{mfr.phone}</a>
                          </div>
                        )}
                        {mfr.mobile && (
                          <div className="flex items-center gap-2 text-sm">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${mfr.mobile}`} className="hover:underline">{mfr.mobile}</a>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        {mfr.website && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={mfr.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </a>
                          </Button>
                        )}
                        {mfr.email && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => {
                              const subject = encodeURIComponent(`Inquiry: ${analysis?.product?.name || 'Product'}`);
                              const body = encodeURIComponent(`Dear ${mfr.salesPerson || 'Sales Team'},\n\nI am writing to inquire about ${analysis?.product?.name || 'your product'}.\n\nPlease provide:\n- Product specifications\n- Pricing and availability\n- Lead time and delivery terms\n\nCompany: ${companySettings?.company_name_en || ''}\nContact: ${profile?.full_name || ''}\nEmail: ${profile?.email || ''}\n\nBest regards`);
                              window.open(`mailto:${mfr.email}?subject=${subject}&body=${body}`, '_blank');
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send Inquiry
                          </Button>
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
            {analysis?.suppliers && (
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.suppliers.map((supplier, index) => (
                  <Card key={index} className={supplier.isLocal ? 'border-green-500' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{supplier.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.city}
                          </CardDescription>
                        </div>
                        {supplier.isLocal && (
                          <Badge className="bg-green-500">Local</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {supplier.address && (
                        <p className="text-sm text-muted-foreground">{supplier.address}</p>
                      )}
                      
                      {/* Contact Details */}
                      <div className="space-y-2 pt-2 border-t">
                        {(supplier.salesPerson || supplier.contactPerson) && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{supplier.salesPerson || supplier.contactPerson}</span>
                            {supplier.department && <span className="text-muted-foreground">({supplier.department})</span>}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                          </div>
                        )}
                        {supplier.mobile && (
                          <div className="flex items-center gap-2 text-sm">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${supplier.mobile}`} className="hover:underline">{supplier.mobile}</a>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        {supplier.website && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </a>
                          </Button>
                        )}
                        {supplier.email && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => {
                              const subject = encodeURIComponent(`Inquiry: ${analysis?.product?.name || 'Product'}`);
                              const body = encodeURIComponent(`Dear ${supplier.salesPerson || supplier.contactPerson || 'Sales Team'},\n\nI am writing to inquire about ${analysis?.product?.name || 'your product'}.\n\nPlease provide:\n- Product specifications\n- Pricing and availability\n- Lead time and delivery terms\n\nCompany: ${companySettings?.company_name_en || ''}\nContact: ${profile?.full_name || ''}\nEmail: ${profile?.email || ''}\n\nBest regards`);
                              window.open(`mailto:${supplier.email}?subject=${subject}&body=${body}`, '_blank');
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send Inquiry
                          </Button>
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
    </DashboardLayout>
  );
}
