import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useAnalysisReports, StoredReport } from '@/hooks/useAnalysisReports';
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
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { language, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();
  const { 
    getReportsByType, 
    deleteReport,
    isLoading,
    isDeleting,
    marketReportsCount, 
    offerReportsCount 
  } = useAnalysisReports();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'market' | 'offer'>('market');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<StoredReport | null>(null);

  const marketReports = getReportsByType('market');
  const offerReports = getReportsByType('offer');
  const currentReports = activeTab === 'market' ? marketReports : offerReports;

  const handleView = (report: StoredReport) => {
    // Navigate to the appropriate analysis page with the report data
    const path = report.type === 'market' ? '/market-analysis' : '/offer-analysis';
    navigate(path, { state: { viewReport: report } });
  };

  const generateMarketPDFHTML = (report: StoredReport) => {
    const analysis = report.analysisData;
    return `<!DOCTYPE html><html><head><title>Market Analysis - ${report.sequenceNumber}</title>
      <style>body{font-family:Arial;padding:40px;max-width:1100px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:30px}.logo{max-height:60px}h1{color:#1a365d}h2{color:#2d3748;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-top:30px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f7fafc}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;background:#e2e8f0}.recommendation{background:#ebf8ff;border-left:4px solid #3182ce;padding:15px;margin-top:20px}a{color:#3182ce;text-decoration:none}</style></head>
      <body><div class="header"><div>${settings.logo_url?`<img src="${settings.logo_url}" class="logo"/>`:''}<h1>${settings.company_name_en||'Company'}</h1></div><div style="text-align:right"><p>${settings.address_en||''}</p><p>${settings.phone||''}</p></div></div>
      <h1 style="text-align:center">Market Analysis Report</h1>
      <p style="text-align:center;color:#718096">Reference: ${report.sequenceNumber} | Generated: ${new Date(report.createdAt).toLocaleDateString()}</p>
      <h2>Product: ${analysis?.product?.name || report.title}</h2>
      <p>${analysis?.product?.description || ''}</p>
      <h2>Manufacturers (${analysis?.manufacturers?.length || 0})</h2>
      <table><thead><tr><th>Name</th><th>Country</th><th>Email</th><th>Phone</th><th>Website</th><th>Type</th></tr></thead>
      <tbody>${analysis?.manufacturers?.map((m:any)=>`<tr><td>${m.name}</td><td>${m.country}</td><td>${m.email||'N/A'}</td><td>${m.phone||'N/A'}</td><td>${m.website?`<a href="${m.website}">${m.website}</a>`:'N/A'}</td><td>${m.isRegional?'Regional':'Global'}</td></tr>`).join('')||''}</tbody></table>
      <h2>Suppliers (${analysis?.suppliers?.length || 0})</h2>
      <table><thead><tr><th>Name</th><th>City</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Type</th></tr></thead>
      <tbody>${analysis?.suppliers?.map((s:any)=>`<tr><td>${s.name}</td><td>${s.city}</td><td>${s.contactPerson||'N/A'}</td><td>${s.email||'N/A'}</td><td>${s.phone||'N/A'}</td><td>${s.isLocal?'Local':'Regional'}</td></tr>`).join('')||''}</tbody></table>
      ${analysis?.marketSummary ? `<div class="recommendation"><strong>Recommendation:</strong><br/>${analysis.marketSummary.recommendation}</div>` : ''}
      </body></html>`;
  };

  const generateOfferPDFHTML = (report: StoredReport) => {
    const analysis = report.analysisData;
    const suppliers = Object.keys(analysis?.commercialComparison?.[0]?.suppliers || {});
    return `<!DOCTYPE html><html><head><title>Offer Analysis - ${report.sequenceNumber}</title>
      <style>body{font-family:Arial;padding:40px;max-width:1100px;margin:0 auto}.header{border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:30px}h1{color:#1a365d}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f7fafc}.lowest{background:#c6f6d5}.recommendation{background:#ebf8ff;border-left:4px solid #3182ce;padding:15px;margin-top:20px}</style></head>
      <body><div class="header">${settings.logo_url?`<img src="${settings.logo_url}" style="max-height:60px"/>`:''}<h1>${settings.company_name_en||'Company'}</h1><p>${settings.address_en||''}</p></div>
      <h1 style="text-align:center">Quotation Comparative Analysis</h1>
      <p style="text-align:center;color:#718096">Reference: ${report.sequenceNumber} | Generated: ${new Date(report.createdAt).toLocaleDateString()}</p>
      <h2>Commercial Comparison</h2>
      <table><thead><tr><th>Criteria</th>${suppliers.map(n=>`<th>${n}</th>`).join('')}</tr></thead>
      <tbody>${analysis?.commercialComparison?.map((row:any)=>`<tr><td><strong>${row.criteria}</strong></td>${suppliers.map(name=>{const val=row.suppliers[name];return`<td class="${val?.isLowest?'lowest':''}">${val?.value||'N/A'}</td>`;}).join('')}</tr>`).join('')||''}</tbody></table>
      ${analysis?.summary ? `<div class="recommendation"><p><strong>Best Value:</strong> ${analysis.summary.bestValue}</p><p><strong>Lowest Price:</strong> ${analysis.summary.lowestEvaluated}</p><p><strong>Recommendation:</strong> ${analysis.summary.recommendation}</p></div>` : ''}
      </body></html>`;
  };

  const handleDownloadPDF = (report: StoredReport) => {
    const html = report.type === 'market' 
      ? generateMarketPDFHTML(report) 
      : generateOfferPDFHTML(report);
    
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => w.print();
    }
    
    toast({
      title: language === 'ar' ? 'تم الفتح' : 'Report Opened',
      description: language === 'ar' ? 'استخدم خيار الطباعة لحفظ PDF' : 'Use print dialog to save as PDF',
    });
  };

  const handleDownloadExcel = (report: StoredReport) => {
    let csv = '';
    const analysis = report.analysisData;
    
    if (report.type === 'market') {
      csv = `Market Analysis Report - ${report.sequenceNumber}\n\n`;
      csv += `Product Name,${analysis?.product?.name || ''}\n`;
      csv += `Category,${analysis?.product?.category || ''}\n\n`;
      csv += 'Manufacturers\nName,Country,Email,Phone,Website,Address,Type\n';
      analysis?.manufacturers?.forEach((m:any) => {
        csv += `"${m.name}","${m.country}","${m.email||''}","${m.phone||''}","${m.website||''}","${m.address||''}","${m.isRegional?'Regional':'Global'}"\n`;
      });
      csv += '\nSuppliers\nName,City,Contact Person,Email,Phone,Address,Type\n';
      analysis?.suppliers?.forEach((s:any) => {
        csv += `"${s.name}","${s.city}","${s.contactPerson||''}","${s.email||''}","${s.phone||''}","${s.address||''}","${s.isLocal?'Local':'Regional'}"\n`;
      });
    } else {
      csv = `Offer Analysis Report - ${report.sequenceNumber}\n\nCommercial Comparison\n`;
      const suppliers = Object.keys(analysis?.commercialComparison?.[0]?.suppliers || {});
      csv += `Criteria,${suppliers.join(',')}\n`;
      analysis?.commercialComparison?.forEach((row:any) => {
        csv += `"${row.criteria}",${suppliers.map(s => `"${row.suppliers[s]?.value || 'N/A'}"`).join(',')}\n`;
      });
      csv += `\nRecommendation\nBest Value,${analysis?.summary?.bestValue || ''}\nLowest Price,${analysis?.summary?.lowestEvaluated || ''}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${report.sequenceNumber}.csv`;
    link.click();
    
    toast({
      title: language === 'ar' ? 'تم التنزيل' : 'Downloaded',
      description: `${report.sequenceNumber}.csv`,
    });
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
