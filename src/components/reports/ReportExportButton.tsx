import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { ReportTab, DateRange } from '@/types/reports';
import { format } from 'date-fns';

interface ReportExportButtonProps {
  activeTab: ReportTab;
  dateRange: DateRange;
  data: any;
}

export function ReportExportButton({ activeTab, dateRange, data }: ReportExportButtonProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const tabLabels: Record<ReportTab, { en: string; ar: string }> = {
    procurement: { en: 'Procurement Analytics', ar: 'تحليلات المشتريات' },
    budget: { en: 'Budget Analysis', ar: 'تحليل الميزانية' },
    vendor: { en: 'Vendor Performance', ar: 'أداء الموردين' },
    inventory: { en: 'Inventory Reports', ar: 'تقارير المخزون' },
  };

  const exportToCSV = () => {
    if (!data) return;

    setIsExporting(true);
    try {
      let csvContent = '';
      const dateRangeStr = `${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}`;

      // Add header
      csvContent += `${tabLabels[activeTab][language]} Report\n`;
      csvContent += `Date Range: ${dateRangeStr}\n`;
      csvContent += `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n\n`;

      // Export based on tab type
      switch (activeTab) {
        case 'procurement':
          csvContent += 'Document Type,Count\n';
          csvContent += `RFIs,${data.totalRFIs}\n`;
          csvContent += `RFQs,${data.totalRFQs}\n`;
          csvContent += `PRs,${data.totalPRs}\n`;
          csvContent += `POs,${data.totalPOs}\n\n`;
          
          csvContent += 'Status Distribution\n';
          csvContent += 'Status,RFIs,RFQs,PRs,POs\n';
          const statuses = ['draft', 'submitted', 'pending', 'approved', 'rejected', 'completed'];
          statuses.forEach(status => {
            const rfi = data.rfiByStatus?.find((s: any) => s.status === status)?.count || 0;
            const rfq = data.rfqByStatus?.find((s: any) => s.status === status)?.count || 0;
            const pr = data.prByStatus?.find((s: any) => s.status === status)?.count || 0;
            const po = data.poByStatus?.find((s: any) => s.status === status)?.count || 0;
            csvContent += `${status},${rfi},${rfq},${pr},${po}\n`;
          });
          break;

        case 'budget':
          csvContent += 'Budget Summary\n';
          csvContent += `Total Original Budget,${data.totalOriginalBudget}\n`;
          csvContent += `Total Revised Budget,${data.totalRevisedBudget}\n`;
          csvContent += `Total Committed,${data.totalCommitted}\n`;
          csvContent += `Total Consumed,${data.totalConsumed}\n`;
          csvContent += `Available Budget,${data.availableBudget}\n`;
          csvContent += `Utilization %,${data.utilizationPercentage?.toFixed(2)}\n\n`;
          
          csvContent += 'Top Projects by Spend\n';
          csvContent += 'Project,Consumed,Budget\n';
          data.topProjectsBySpend?.forEach((p: any) => {
            csvContent += `"${p.name}",${p.consumed},${p.budget}\n`;
          });
          break;

        case 'vendor':
          csvContent += 'Vendor Summary\n';
          csvContent += `Total Vendors,${data.totalVendors}\n`;
          csvContent += `Avg Delivery Days,${data.avgDeliveryDays}\n`;
          csvContent += `Total Quotations,${data.quotationMetrics?.totalQuotations}\n\n`;
          
          csvContent += 'Vendors by Status\n';
          csvContent += 'Status,Count\n';
          data.byStatus?.forEach((s: any) => {
            csvContent += `${s.status},${s.count}\n`;
          });
          
          csvContent += '\nTop Vendors by Spend\n';
          csvContent += 'Vendor,Total Spend,PO Count\n';
          data.topBySpend?.forEach((v: any) => {
            csvContent += `"${v.name}",${v.totalSpend},${v.poCount}\n`;
          });
          break;

        case 'inventory':
          csvContent += 'Inventory Summary\n';
          csvContent += `Total Items,${data.totalItems}\n`;
          csvContent += `Total Value,${data.totalValue}\n\n`;
          
          csvContent += 'Stock Status\n';
          csvContent += 'Status,Count\n';
          data.byStockStatus?.forEach((s: any) => {
            csvContent += `${s.status},${s.count}\n`;
          });
          
          csvContent += '\nLow Stock Items\n';
          csvContent += 'Item,Current Stock,Min Level,Unit\n';
          data.lowStockItems?.forEach((item: any) => {
            csvContent += `"${item.name}",${item.currentStock},${item.minLevel},${item.unit}\n`;
          });
          break;
      }

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const fileName = `${activeTab}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      toast({
        title: language === 'en' ? 'Export Successful' : 'تم التصدير بنجاح',
        description: language === 'en' ? `${fileName} has been downloaded` : `تم تنزيل ${fileName}`,
      });
    } catch (error) {
      toast({
        title: language === 'en' ? 'Export Failed' : 'فشل التصدير',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting || !data}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {language === 'en' ? 'Export' : 'تصدير'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          {language === 'en' ? 'Export as CSV' : 'تصدير كـ CSV'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 opacity-50">
          <FileText className="h-4 w-4" />
          {language === 'en' ? 'Export as PDF (Coming Soon)' : 'تصدير كـ PDF (قريباً)'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
