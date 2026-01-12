import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReportDownloads } from "@/hooks/useReportDownloads";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  [key: string]: unknown;
}

interface EnhancedReportExportButtonProps {
  reportType: 'procurement' | 'budget' | 'vendor' | 'inventory';
  reportName: string;
  data: ReportData | null;
  dateRange: { from: Date; to: Date };
}

export function EnhancedReportExportButton({
  reportType,
  reportName,
  data,
  dateRange,
}: EnhancedReportExportButtonProps) {
  const { language } = useLanguage();
  const { companySettings } = useCompanySettings();
  const { downloads, recordDownload } = useReportDownloads();
  const [isExporting, setIsExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const getChartContainerId = () => `${reportType}-charts-container`;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const generateDetailedCSV = () => {
    if (!data) return '';
    
    const companyHeader = companySettings
      ? `${companySettings.company_name_en}\n${companySettings.address_en || ""}\n${companySettings.trade_license_number || ""}\n\n`
      : "";

    const reportHeader = `${reportName}\nPeriod: ${format(dateRange.from, "yyyy-MM-dd")} to ${format(dateRange.to, "yyyy-MM-dd")}\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\n\n`;

    let csvContent = companyHeader + reportHeader;
    const d = data as Record<string, unknown>;

    switch (reportType) {
      case 'procurement': {
        csvContent += "=== KEY METRICS ===\n";
        csvContent += `Total RFIs,${d.totalRFIs || 0}\n`;
        csvContent += `Total RFQs,${d.totalRFQs || 0}\n`;
        csvContent += `Total PRs,${d.totalPRs || 0}\n`;
        csvContent += `Total POs,${d.totalPOs || 0}\n\n`;
        
        const rates = d.conversionRates as Record<string, number> || {};
        csvContent += "=== CONVERSION RATES ===\n";
        csvContent += `RFI to RFQ,${(rates.rfiToRfq || 0).toFixed(1)}%\n`;
        csvContent += `RFQ to PR,${(rates.rfqToPr || 0).toFixed(1)}%\n`;
        csvContent += `PR to PO,${(rates.prToPo || 0).toFixed(1)}%\n\n`;
        
        csvContent += "=== STATUS DISTRIBUTION ===\n";
        csvContent += "Status,RFIs,RFQs,PRs,POs\n";
        const rfiByStatus = (d.rfiByStatus || []) as Array<{status: string; count: number}>;
        const rfqByStatus = (d.rfqByStatus || []) as Array<{status: string; count: number}>;
        const prByStatus = (d.prByStatus || []) as Array<{status: string; count: number}>;
        const poByStatus = (d.poByStatus || []) as Array<{status: string; count: number}>;
        ['draft', 'submitted', 'pending', 'approved', 'rejected', 'completed'].forEach(status => {
          const rfis = rfiByStatus.find(s => s.status === status)?.count || 0;
          const rfqs = rfqByStatus.find(s => s.status === status)?.count || 0;
          const prs = prByStatus.find(s => s.status === status)?.count || 0;
          const pos = poByStatus.find(s => s.status === status)?.count || 0;
          csvContent += `${status},${rfis},${rfqs},${prs},${pos}\n`;
        });
        
        const byType = (d.byType || []) as Array<{type: string; count: number}>;
        if (byType.length > 0) {
          csvContent += "\n=== BY PROCUREMENT TYPE ===\n";
          csvContent += "Type,Count\n";
          byType.forEach(t => {
            csvContent += `${t.type},${t.count}\n`;
          });
        }
        break;
      }
      
      case 'budget': {
        csvContent += "=== BUDGET OVERVIEW ===\n";
        csvContent += `Original Budget,${d.totalOriginalBudget || 0}\n`;
        csvContent += `Revised Budget,${d.totalRevisedBudget || 0}\n`;
        csvContent += `Total Committed,${d.totalCommitted || 0}\n`;
        csvContent += `Total Consumed,${d.totalConsumed || 0}\n`;
        csvContent += `Available Budget,${d.availableBudget || 0}\n`;
        csvContent += `Utilization Rate,${((d.utilizationPercentage as number) || 0).toFixed(1)}%\n\n`;
        
        const healthData = (d.projectsByHealth || []) as Array<{health: string; count: number}>;
        csvContent += "=== PROJECT HEALTH ===\n";
        csvContent += "Status,Count\n";
        healthData.forEach(h => {
          csvContent += `${h.health},${h.count}\n`;
        });
        
        const topProjects = (d.topProjectsBySpend || []) as Array<{name: string; consumed: number; budget: number}>;
        if (topProjects.length > 0) {
          csvContent += "\n=== TOP PROJECTS BY SPEND ===\n";
          csvContent += "Project,Consumed,Budget\n";
          topProjects.forEach(p => {
            csvContent += `"${p.name}",${p.consumed},${p.budget}\n`;
          });
        }
        break;
      }
      
      case 'vendor': {
        csvContent += "=== VENDOR OVERVIEW ===\n";
        csvContent += `Total Vendors,${d.totalVendors || 0}\n`;
        csvContent += `Avg Delivery Days,${d.avgDeliveryDays || 0}\n`;
        const quotMetrics = d.quotationMetrics as Record<string, number> || {};
        csvContent += `Total Quotations,${quotMetrics.totalQuotations || 0}\n`;
        csvContent += `Selection Rate,${(quotMetrics.selectionRate || 0).toFixed(1)}%\n\n`;
        
        const vendorByStatus = (d.byStatus || []) as Array<{status: string; count: number}>;
        csvContent += "=== VENDORS BY STATUS ===\n";
        csvContent += "Status,Count\n";
        vendorByStatus.forEach(s => {
          csvContent += `${s.status},${s.count}\n`;
        });
        
        const topBySpend = (d.topBySpend || []) as Array<{name: string; totalSpend: number; poCount: number}>;
        if (topBySpend.length > 0) {
          csvContent += "\n=== TOP VENDORS BY SPEND ===\n";
          csvContent += "Vendor,Total Spend,PO Count\n";
          topBySpend.forEach(v => {
            csvContent += `"${v.name}",${v.totalSpend},${v.poCount}\n`;
          });
        }
        break;
      }
      
      case 'inventory': {
        const lowStockItems = (d.lowStockItems || []) as Array<{name: string; currentStock: number; minLevel: number; unit: string}>;
        csvContent += "=== INVENTORY OVERVIEW ===\n";
        csvContent += `Total Items,${d.totalItems || 0}\n`;
        csvContent += `Total Value,${d.totalValue || 0}\n`;
        csvContent += `Low Stock Items,${lowStockItems.length}\n\n`;
        
        const stockStatus = (d.byStockStatus || []) as Array<{status: string; count: number}>;
        csvContent += "=== STOCK STATUS ===\n";
        csvContent += "Status,Count\n";
        stockStatus.forEach(s => {
          csvContent += `${s.status},${s.count}\n`;
        });
        
        const byCategory = (d.byCategory || []) as Array<{category: string; count: number; value: number}>;
        if (byCategory.length > 0) {
          csvContent += "\n=== BY CATEGORY ===\n";
          csvContent += "Category,Count,Value\n";
          byCategory.forEach(c => {
            csvContent += `"${c.category}",${c.count},${c.value}\n`;
          });
        }
        
        if (lowStockItems.length > 0) {
          csvContent += "\n=== LOW STOCK ITEMS ===\n";
          csvContent += "Item Name,Current Stock,Min Level,Unit\n";
          lowStockItems.forEach(item => {
            csvContent += `"${item.name}",${item.currentStock},${item.minLevel},${item.unit}\n`;
          });
        }
        break;
      }
    }

    return csvContent;
  };

  const downloadCSV = async () => {
    if (!data) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    
    setIsExporting(true);
    try {
      const csv = generateDetailedCSV();
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${reportName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await recordDownload.mutateAsync({
        reportType,
        reportName,
        fileFormat: "csv",
        parameters: { dateRange },
      });
      
      toast.success(language === 'ar' ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في تصدير التقرير' : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExcel = async () => {
    if (!data) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    
    setIsExporting(true);
    try {
      const csv = generateDetailedCSV();
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${reportName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xls`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await recordDownload.mutateAsync({
        reportType,
        reportName,
        fileFormat: "excel",
        parameters: { dateRange },
      });
      
      toast.success(language === 'ar' ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في تصدير التقرير' : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPDF = async () => {
    if (!data) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    
    setIsExporting(true);
    toast.info(language === 'ar' ? 'جاري إنشاء التقرير...' : 'Generating report...', { duration: 2000 });
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;
      
      // Company Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(companySettings?.company_name_en || 'Company Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      if (companySettings?.address_en) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(companySettings.address_en, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      
      if (companySettings?.trade_license_number) {
        doc.setFontSize(9);
        doc.text(`Trade License: ${companySettings.trade_license_number}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      
      // Separator
      yPos += 3;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;
      
      // Report Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(reportName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;
      
      // Date Range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Period: ${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.setFontSize(8);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      // Add section based on report type
      const d = data as Record<string, unknown>;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Executive Summary', 20, yPos);
      yPos += 2;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.3);
      doc.line(20, yPos, 80, yPos);
      yPos += 6;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Add content based on report type
      switch (reportType) {
        case 'procurement': {
          const total = (d.totalRFIs as number || 0) + (d.totalRFQs as number || 0) + (d.totalPRs as number || 0) + (d.totalPOs as number || 0);
          const summary = `This report provides a comprehensive analysis of procurement activities for the selected period. A total of ${total} documents were processed across all stages of the procurement lifecycle.`;
          const summaryLines = doc.splitTextToSize(summary, 170);
          doc.text(summaryLines, 20, yPos);
          yPos += summaryLines.length * 5 + 10;
          
          doc.setFont('helvetica', 'bold');
          doc.text('Key Metrics:', 20, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Total RFIs: ${d.totalRFIs || 0}`, 25, yPos); yPos += 5;
          doc.text(`Total RFQs: ${d.totalRFQs || 0}`, 25, yPos); yPos += 5;
          doc.text(`Total PRs: ${d.totalPRs || 0}`, 25, yPos); yPos += 5;
          doc.text(`Total POs: ${d.totalPOs || 0}`, 25, yPos);
          break;
        }
        case 'budget': {
          const summary = `Budget analysis shows a total revised budget of ${formatCurrency(d.totalRevisedBudget as number || 0)} with ${((d.utilizationPercentage as number) || 0).toFixed(1)}% utilization. Available budget stands at ${formatCurrency(d.availableBudget as number || 0)}.`;
          const summaryLines = doc.splitTextToSize(summary, 170);
          doc.text(summaryLines, 20, yPos);
          yPos += summaryLines.length * 5 + 10;
          
          doc.setFont('helvetica', 'bold');
          doc.text('Budget Overview:', 20, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Original Budget: ${formatCurrency(d.totalOriginalBudget as number || 0)}`, 25, yPos); yPos += 5;
          doc.text(`Revised Budget: ${formatCurrency(d.totalRevisedBudget as number || 0)}`, 25, yPos); yPos += 5;
          doc.text(`Total Committed: ${formatCurrency(d.totalCommitted as number || 0)}`, 25, yPos); yPos += 5;
          doc.text(`Total Consumed: ${formatCurrency(d.totalConsumed as number || 0)}`, 25, yPos);
          break;
        }
        case 'vendor': {
          const quotMetrics = d.quotationMetrics as Record<string, number> || {};
          const summary = `Vendor performance analysis covers ${d.totalVendors || 0} registered vendors. Average delivery time is ${d.avgDeliveryDays || 0} days with a quotation selection rate of ${(quotMetrics.selectionRate || 0).toFixed(1)}%.`;
          const summaryLines = doc.splitTextToSize(summary, 170);
          doc.text(summaryLines, 20, yPos);
          yPos += summaryLines.length * 5 + 10;
          
          doc.setFont('helvetica', 'bold');
          doc.text('Vendor Overview:', 20, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Total Vendors: ${d.totalVendors || 0}`, 25, yPos); yPos += 5;
          doc.text(`Avg Delivery Days: ${d.avgDeliveryDays || 0} days`, 25, yPos); yPos += 5;
          doc.text(`Total Quotations: ${quotMetrics.totalQuotations || 0}`, 25, yPos);
          break;
        }
        case 'inventory': {
          const lowStockItems = (d.lowStockItems || []) as Array<unknown>;
          const summary = `Inventory report covers ${d.totalItems || 0} items with a total value of ${formatCurrency(d.totalValue as number || 0)}. ${lowStockItems.length} items require attention due to low stock levels.`;
          const summaryLines = doc.splitTextToSize(summary, 170);
          doc.text(summaryLines, 20, yPos);
          yPos += summaryLines.length * 5 + 10;
          
          doc.setFont('helvetica', 'bold');
          doc.text('Inventory Overview:', 20, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Total Items: ${d.totalItems || 0}`, 25, yPos); yPos += 5;
          doc.text(`Total Value: ${formatCurrency(d.totalValue as number || 0)}`, 25, yPos); yPos += 5;
          doc.text(`Low Stock Items: ${lowStockItems.length}`, 25, yPos);
          break;
        }
      }

      // Try to capture charts
      try {
        const chartElement = document.getElementById(getChartContainerId());
        if (chartElement) {
          doc.addPage();
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 64, 175);
          doc.text('Visual Analytics', 20, 15);
          doc.setTextColor(0, 0, 0);

          const canvas = await html2canvas(chartElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          doc.addImage(imgData, 'PNG', 20, 25, imgWidth, Math.min(imgHeight, 200));
        }
      } catch (error) {
        console.error('Failed to capture charts:', error);
      }

      const fileName = `${reportName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
      doc.save(fileName);

      await recordDownload.mutateAsync({
        reportType,
        reportName,
        fileFormat: "pdf",
        parameters: { dateRange },
      });
      
      toast.success(language === 'ar' ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء التقرير' : 'Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredDownloads = downloads?.filter((d) => d.report_type === reportType) || [];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isExporting || !data}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {language === "ar" ? "تصدير التقرير" : "Export Report"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={downloadPDF}>
            <FileText className="h-4 w-4 mr-2" />
            {language === "ar" ? "تقرير PDF مفصل" : "Detailed PDF Report"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={downloadExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {language === "ar" ? "تصدير Excel" : "Export as Excel"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {language === "ar" ? "تصدير CSV" : "Export as CSV"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title={language === 'ar' ? 'سجل التحميلات' : 'Download History'}>
            <History className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "سجل التحميلات" : "Download History"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar"
                ? "سجل التقارير التي تم تحميلها مسبقاً"
                : "History of previously downloaded reports"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            {filteredDownloads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === "ar" ? "لا توجد تحميلات سابقة" : "No previous downloads"}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{download.report_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(download.downloaded_at), "PPP p")}
                      </p>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded uppercase">
                      {download.file_format}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}