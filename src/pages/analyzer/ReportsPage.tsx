import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useAnalysisReports, StoredReport } from '@/hooks/useAnalysisReports';
import { useReportDownloads } from '@/hooks/useReportDownloads';
import { ReportCard } from '@/components/analyzer/ReportCard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { 
  FileText, 
  Globe, 
  FileSpreadsheet, 
  FolderOpen,
  Plus,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { 
  generateOfferAnalysisPDF, 
  generateOfferAnalysisExcel,
  getSupplierColumns 
} from '@/lib/exports/offerAnalysisExport';

export default function ReportsPage() {
  const { language, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();
  const { 
    getReportsByType, 
    deleteReport,
    isLoading,
    isDeleting,
    marketReportsCount, 
    offerReportsCount,
    refetch
  } = useAnalysisReports();
  const { recordDownload } = useReportDownloads();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Default to offer tab if there are offer reports and no market reports
  const [activeTab, setActiveTab] = useState<'market' | 'offer'>('market');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<StoredReport | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const marketReports = getReportsByType('market');
  const offerReports = getReportsByType('offer');
  const currentReports = activeTab === 'market' ? marketReports : offerReports;

  // Set default tab based on available reports
  useEffect(() => {
    if (offerReportsCount > 0 && marketReportsCount === 0) {
      setActiveTab('offer');
    }
  }, [offerReportsCount, marketReportsCount]);

  const handleView = (report: StoredReport) => {
    const path = report.type === 'market' ? '/market-analysis' : '/offer-analysis';
    navigate(path, { state: { viewReport: report } });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Refreshed',
        description: language === 'ar' ? 'تم تحديث قائمة التقارير' : 'Reports list updated',
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate Market Analysis PDF using jsPDF (direct download)
  const generateMarketPDF = async (report: StoredReport) => {
    const analysis = report.analysisData;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.company_name_en || 'Company', margin, yPos);
    yPos += 8;
    
    if (settings.address_en) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.address_en, margin, yPos);
      yPos += 6;
    }
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MARKET ANALYSIS REPORT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reference: ${report.sequenceNumber}`, margin, yPos);
    doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 12;
    
    // Product Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Product Information', margin, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${analysis?.product?.name || report.title}`, margin, yPos);
    yPos += 5;
    doc.text(`Category: ${analysis?.product?.category || 'N/A'}`, margin, yPos);
    yPos += 5;
    if (analysis?.product?.description) {
      const descLines = doc.splitTextToSize(analysis.product.description, pageWidth - margin * 2);
      doc.text(descLines.slice(0, 3), margin, yPos);
      yPos += Math.min(descLines.length, 3) * 4;
    }
    yPos += 8;
    
    // Manufacturers
    if (analysis?.manufacturers?.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Manufacturers (${analysis.manufacturers.length})`, margin, yPos);
      yPos += 6;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      analysis.manufacturers.slice(0, 10).forEach((m: any, idx: number) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${m.name} - ${m.country} ${m.email ? `| ${m.email}` : ''}`, margin, yPos);
        yPos += 4;
      });
      yPos += 6;
    }
    
    // Suppliers
    if (analysis?.suppliers?.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Suppliers (${analysis.suppliers.length})`, margin, yPos);
      yPos += 6;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      analysis.suppliers.slice(0, 10).forEach((s: any, idx: number) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${s.name} - ${s.city} ${s.email ? `| ${s.email}` : ''}`, margin, yPos);
        yPos += 4;
      });
      yPos += 6;
    }
    
    // Recommendation
    if (analysis?.marketSummary?.recommendation) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendation', margin, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const recLines = doc.splitTextToSize(analysis.marketSummary.recommendation, pageWidth - margin * 2);
      doc.text(recLines.slice(0, 6), margin, yPos);
    }
    
    doc.save(`market-analysis-${report.sequenceNumber}.pdf`);
  };

  const handleDownloadPDF = async (report: StoredReport) => {
    try {
      if (report.type === 'market') {
        await generateMarketPDF(report);
      } else {
        // Use shared Offer Analysis PDF generator
        const analysis = report.analysisData;
        const itemComparisonMatrix = analysis?.itemComparisonMatrix || [];
        const extractedQuotations = analysis?.extractedQuotations || [];
        
        await generateOfferAnalysisPDF(
          analysis,
          itemComparisonMatrix,
          extractedQuotations,
          report.sequenceNumber,
          {
            companyName: settings.company_name_en || 'Company Name',
            companyAddress: settings.address_en,
            logoUrl: settings.logo_url,
          }
        );
      }
      
      // Record download for audit trail
      recordDownload.mutate({
        reportType: report.type === 'market' ? 'market_analysis' : 'offer_analysis',
        reportName: report.sequenceNumber,
        fileFormat: 'pdf',
        parameters: { source: 'reports_center' },
      });
      
      toast({
        title: language === 'ar' ? 'تم التحميل' : 'PDF Downloaded',
        description: `${report.sequenceNumber}.pdf`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إنشاء PDF' : 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadExcel = (report: StoredReport) => {
    try {
      let csv = '';
      const analysis = report.analysisData;
      
      if (report.type === 'market') {
        csv = `Market Analysis Report - ${report.sequenceNumber}\n\n`;
        csv += `Product Name,${analysis?.product?.name || ''}\n`;
        csv += `Category,${analysis?.product?.category || ''}\n\n`;
        csv += 'Manufacturers\nName,Country,Email,Phone,Website,Address,Type\n';
        analysis?.manufacturers?.forEach((m: any) => {
          csv += `"${m.name}","${m.country}","${m.email || ''}","${m.phone || ''}","${m.website || ''}","${m.address || ''}","${m.isRegional ? 'Regional' : 'Global'}"\n`;
        });
        csv += '\nSuppliers\nName,City,Contact Person,Email,Phone,Address,Type\n';
        analysis?.suppliers?.forEach((s: any) => {
          csv += `"${s.name}","${s.city}","${s.contactPerson || ''}","${s.email || ''}","${s.phone || ''}","${s.address || ''}","${s.isLocal ? 'Local' : 'Regional'}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${report.sequenceNumber}.csv`;
        link.click();
      } else {
        // Use shared Offer Analysis Excel generator
        const itemComparisonMatrix = analysis?.itemComparisonMatrix || [];
        const extractedQuotations = analysis?.extractedQuotations || [];
        
        generateOfferAnalysisExcel(
          analysis,
          itemComparisonMatrix,
          extractedQuotations,
          report.sequenceNumber
        );
      }
      
      // Record download for audit trail
      recordDownload.mutate({
        reportType: report.type === 'market' ? 'market_analysis' : 'offer_analysis',
        reportName: report.sequenceNumber,
        fileFormat: 'csv',
        parameters: { source: 'reports_center' },
      });
      
      toast({
        title: language === 'ar' ? 'تم التنزيل' : 'Downloaded',
        description: `${report.sequenceNumber}.csv`,
      });
    } catch (error) {
      console.error('Excel generation error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إنشاء Excel' : 'Failed to generate Excel',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (report: StoredReport) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      try {
        await deleteReport(reportToDelete.id);
        toast({
          title: language === 'ar' ? 'تم الحذف' : 'Deleted',
          description: `${reportToDelete.sequenceNumber} ${language === 'ar' ? 'تم حذفه' : 'has been deleted'}`,
        });
      } catch (error: any) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: error.message || 'Failed to delete report',
          variant: 'destructive',
        });
      }
      setReportToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const EmptyState = ({ type }: { type: 'market' | 'offer' }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-4',
          type === 'market' ? 'bg-blue-500/10' : 'bg-purple-500/10'
        )}>
          <FolderOpen className={cn(
            'w-8 h-8',
            type === 'market' ? 'text-blue-500' : 'text-purple-500'
          )} />
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {language === 'ar' ? 'لا توجد تقارير' : 'No Reports Yet'}
        </h3>
        <p className="text-muted-foreground text-center mb-4 max-w-sm">
          {type === 'market' 
            ? (language === 'ar' 
              ? 'قم بإجراء تحليل السوق لحفظ التقارير هنا' 
              : 'Run a market analysis to save reports here')
            : (language === 'ar' 
              ? 'قم بإجراء تحليل العروض لحفظ التقارير هنا' 
              : 'Run an offer analysis to save reports here')}
        </p>
        <Button 
          onClick={() => navigate(type === 'market' ? '/market-analysis' : '/offer-analysis')}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'تحليل جديد' : 'New Analysis'}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <AnalyzerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {language === 'ar' ? 'مركز التقارير' : 'Reports Center'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'جميع تقارير التحليل المحفوظة' 
                  : 'All saved analysis reports'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'market' | 'offer')}>
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 max-w-md">
            <TabsTrigger value="market" className="gap-2 py-3">
              <Globe className="w-4 h-4" />
              {language === 'ar' ? 'تحليل السوق' : 'Market Analysis'}
              <Badge variant="secondary" className="ml-1">
                {marketReportsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="offer" className="gap-2 py-3">
              <FileSpreadsheet className="w-4 h-4" />
              {language === 'ar' ? 'تحليل العروض' : 'Offer Analysis'}
              <Badge variant="secondary" className="ml-1">
                {offerReportsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="mt-6">
            {marketReports.length === 0 ? (
              <EmptyState type="market" />
            ) : (
              <div className="grid gap-4">
                {marketReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onView={handleView}
                    onDownloadPDF={handleDownloadPDF}
                    onDownloadExcel={handleDownloadExcel}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offer" className="mt-6">
            {offerReports.length === 0 ? (
              <EmptyState type="offer" />
            ) : (
              <div className="grid gap-4">
                {offerReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onView={handleView}
                    onDownloadPDF={handleDownloadPDF}
                    onDownloadExcel={handleDownloadExcel}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف التقرير' : 'Delete Report'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف ${reportToDelete?.sequenceNumber}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete ${reportToDelete?.sequenceNumber}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnalyzerLayout>
  );
}
