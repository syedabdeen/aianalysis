import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { DueDiligenceReport } from '@/hooks/useVendorDueDiligence';
import { 
  Building2, Globe, Shield, DollarSign, Star, Phone, Users, 
  Download, Loader2, AlertTriangle, CheckCircle, XCircle, Info
} from 'lucide-react';
import { format } from 'date-fns';

interface VendorDueDiligenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DueDiligenceReport | null;
  isLoading?: boolean;
  vendorName: string;
}

export function VendorDueDiligenceDialog({ 
  open, 
  onOpenChange, 
  report, 
  isLoading,
  vendorName 
}: VendorDueDiligenceDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    
    // Create PDF content
    const pdfContent = {
      title: `Due Diligence Report - ${vendorName}`,
      date: format(new Date(report.analysisDate), 'dd MMMM yyyy'),
      report: report
    };

    // For now, create a simple downloadable JSON (can be enhanced with PDF generation)
    const blob = new Blob([JSON.stringify(pdfContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendorName.replace(/\s+/g, '_')}_DueDiligenceReport_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {isRTL ? 'جاري تحليل المورد...' : 'Analyzing Vendor...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'يتم إجراء العناية الواجبة بالذكاء الاصطناعي' : 'AI Due Diligence in progress'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {isRTL ? 'تقرير العناية الواجبة' : 'Due Diligence Report'}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              {isRTL ? 'تحميل PDF' : 'Download PDF'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {vendorName} • {format(new Date(report.analysisDate), 'dd MMM yyyy')}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Risk Assessment Banner */}
            <Card className={getRiskColor(report.riskAssessment?.overallRiskLevel)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRiskIcon(report.riskAssessment?.overallRiskLevel)}
                    <div>
                      <p className="font-semibold">
                        {isRTL ? 'مستوى المخاطر' : 'Risk Level'}
                      </p>
                      <p className="text-sm">
                        {report.riskAssessment?.overallRiskLevel || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getRiskColor(report.confidenceLevel)}>
                    {isRTL ? 'مستوى الثقة' : 'Confidence'}: {report.confidenceLevel}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Company Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {isRTL ? 'نظرة عامة على الشركة' : 'Company Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{report.companyOverview?.summary}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isRTL ? 'الصناعة' : 'Industry'}:</span>
                    <span className="ml-2 font-medium">{report.companyOverview?.industry}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isRTL ? 'تأسست' : 'Founded'}:</span>
                    <span className="ml-2 font-medium">{report.companyOverview?.yearsFounded}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Status & Global Presence */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {isRTL ? 'حالة العمل' : 'Business Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'الحالة' : 'Status'}</span>
                    <Badge variant="outline">{report.businessStatus?.operationalStatus}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'سنوات العمل' : 'Years Active'}</span>
                    <span>{report.businessStatus?.estimatedYearsInBusiness}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {isRTL ? 'التواجد العالمي' : 'Global Presence'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'المقر' : 'HQ'}</span>
                    <span>{report.globalPresence?.headquarters}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {report.globalPresence?.countries?.slice(0, 5).map((country, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{country}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Factors */}
            {report.riskAssessment?.riskFactors?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    {isRTL ? 'عوامل الخطر' : 'Risk Factors'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {report.riskAssessment.riskFactors.map((factor, i) => (
                      <li key={i}>{factor}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Financial & Market */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {isRTL ? 'المؤشرات المالية' : 'Financial Indicators'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'الإيرادات' : 'Revenue'}</span>
                    <span>{report.financialIndicators?.estimatedRevenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'الصحة المالية' : 'Health'}</span>
                    <span>{report.financialIndicators?.financialHealth}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    {isRTL ? 'سمعة السوق' : 'Market Reputation'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{report.marketReputation?.industryStanding}</p>
                </CardContent>
              </Card>
            </div>

            {/* Contact & Personnel */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {isRTL ? 'معلومات الاتصال' : 'Contact Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {report.contactInformation?.website && (
                    <div><span className="text-muted-foreground">Website:</span> {report.contactInformation.website}</div>
                  )}
                  {report.contactInformation?.phone && (
                    <div><span className="text-muted-foreground">Phone:</span> {report.contactInformation.phone}</div>
                  )}
                  {report.contactInformation?.address && (
                    <div><span className="text-muted-foreground">Address:</span> {report.contactInformation.address}</div>
                  )}
                </CardContent>
              </Card>

              {report.keyPersonnel?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {isRTL ? 'كبار الموظفين' : 'Key Personnel'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {report.keyPersonnel.slice(0, 3).map((person, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="font-medium">{person.name}</span>
                        <span className="text-muted-foreground">{person.position}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
              <p className="font-medium mb-1">{isRTL ? 'إخلاء المسؤولية' : 'Disclaimer'}</p>
              <p>{report.dataDisclaimer}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
