import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface VendorData {
  id: string;
  vendor?: {
    code: string;
    company_name_en: string;
    company_name_ar: string;
  };
  quotation_received: boolean;
  total_amount?: number | null;
  delivery_days?: number | null;
  validity_days?: number | null;
  payment_terms?: string | null;
  warranty_terms?: string | null;
  technical_score?: number | null;
  commercial_score?: number | null;
  is_recommended?: boolean | null;
  prices?: Array<{
    rfq_item_id: string;
    unit_price: number;
    total_price: number;
  }>;
}

interface ItemData {
  id: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

interface RFQData {
  code: string;
  title_en: string;
  title_ar: string;
  description?: string;
  submission_deadline?: string;
  created_at: string;
}

interface RFQExportButtonProps {
  rfq: RFQData;
  vendors: VendorData[];
  items: ItemData[];
  analysis?: any;
  buyerName?: string;
}

export const RFQExportButton: React.FC<RFQExportButtonProps> = ({
  rfq,
  vendors,
  items,
  analysis,
  buyerName,
}) => {
  const { language } = useLanguage();
  const { companySettings } = useCompanySettings();
  const [isExporting, setIsExporting] = useState(false);

  const receivedVendors = vendors.filter(v => v.quotation_received);

  const generateCSV = () => {
    const companyHeader = companySettings
      ? `${companySettings.company_name_en}\n${companySettings.address_en || ''}\n\n`
      : '';

    let csv = companyHeader;
    csv += `RFQ COMPARATIVE STATEMENT\n`;
    csv += `RFQ Reference,${rfq.code}\n`;
    csv += `Title,${rfq.title_en}\n`;
    csv += `Buyer,${buyerName || 'N/A'}\n`;
    csv += `Date,${format(new Date(rfq.created_at), 'yyyy-MM-dd')}\n`;
    csv += `Deadline,${rfq.submission_deadline ? format(new Date(rfq.submission_deadline), 'yyyy-MM-dd') : 'N/A'}\n\n`;

    // Vendors summary
    csv += `=== VENDORS SUMMARY ===\n`;
    csv += `Vendor Code,Vendor Name,Total Amount,Delivery Days,Payment Terms,Technical Score,Commercial Score\n`;
    receivedVendors.forEach(v => {
      csv += `${v.vendor?.code || ''},"${v.vendor?.company_name_en || ''}",${v.total_amount || 0},${v.delivery_days || 'N/A'},"${v.payment_terms || 'N/A'}",${v.technical_score || 'N/A'},${v.commercial_score || 'N/A'}\n`;
    });
    csv += '\n';

    // Item-wise comparison
    csv += `=== ITEM-WISE PRICE COMPARISON ===\n`;
    csv += `Item No,Description,Qty,Unit`;
    receivedVendors.forEach(v => {
      csv += `,${v.vendor.code} Unit Price,${v.vendor.code} Total`;
    });
    csv += '\n';

    items.forEach(item => {
      csv += `${item.item_number},"${item.description_en}",${item.quantity},${item.unit}`;
      receivedVendors.forEach(v => {
        const price = v.prices?.find(p => p.rfq_item_id === item.id);
        csv += `,${price?.unit_price || 0},${price?.total_price || 0}`;
      });
      csv += '\n';
    });
    csv += '\n';

    // Totals row
    csv += `TOTAL,,,`;
    receivedVendors.forEach(v => {
      csv += `,,${v.total_amount || 0}`;
    });
    csv += '\n\n';

    // AI Recommendation if available
    if (analysis?.recommendation) {
      csv += `=== AI RECOMMENDATION ===\n`;
      csv += `Recommended Vendor,${analysis.recommendation.recommendedVendor || 'N/A'}\n`;
      csv += `Confidence Score,${analysis.recommendation.confidenceScore || 'N/A'}%\n`;
      csv += `Justification,"${analysis.recommendation.justification || 'N/A'}"\n`;
    }

    return csv;
  };

  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const csv = generateCSV();
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${rfq.code}_Comparison_${format(new Date(), 'yyyy-MM-dd')}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل التصدير' : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for comparison table
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Company Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(companySettings?.company_name_en || 'Company', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Report Title
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('RFQ COMPARATIVE STATEMENT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      // RFQ Details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RFQ Reference: ${rfq.code}`, 20, yPos);
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 60, yPos);
      yPos += 6;
      doc.text(`Title: ${rfq.title_en}`, 20, yPos);
      yPos += 6;
      doc.text(`Buyer: ${buyerName || 'N/A'}`, 20, yPos);
      yPos += 10;

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;

      // Vendor Summary Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Vendor Summary', 20, yPos);
      yPos += 6;

      // Table headers
      const summaryHeaders = ['Vendor', 'Total Amount', 'Delivery', 'Payment Terms', 'Tech Score', 'Comm Score'];
      const colWidth = (pageWidth - 40) / summaryHeaders.length;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos - 4, pageWidth - 40, 8, 'F');
      doc.setFontSize(9);
      summaryHeaders.forEach((header, idx) => {
        doc.text(header, 20 + idx * colWidth + 2, yPos);
      });
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      receivedVendors.forEach(v => {
        doc.text(v.vendor.code.substring(0, 15), 20 + 0 * colWidth + 2, yPos);
        doc.text((v.total_amount || 0).toLocaleString(), 20 + 1 * colWidth + 2, yPos);
        doc.text(`${v.delivery_days || '-'} days`, 20 + 2 * colWidth + 2, yPos);
        doc.text((v.payment_terms || '-').substring(0, 15), 20 + 3 * colWidth + 2, yPos);
        doc.text(`${v.technical_score || '-'}`, 20 + 4 * colWidth + 2, yPos);
        doc.text(`${v.commercial_score || '-'}`, 20 + 5 * colWidth + 2, yPos);
        yPos += 6;
      });
      yPos += 8;

      // Item Price Comparison
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Item-wise Price Comparison', 20, yPos);
      yPos += 6;

      // Dynamic columns based on vendors
      const itemColCount = 3 + receivedVendors.length; // Item#, Description, Qty + vendor prices
      const itemColWidth = (pageWidth - 40) / itemColCount;

      // Headers
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos - 4, pageWidth - 40, 8, 'F');
      doc.setFontSize(8);
      doc.text('#', 20 + 2, yPos);
      doc.text('Description', 20 + itemColWidth + 2, yPos);
      doc.text('Qty', 20 + 2 * itemColWidth + 2, yPos);
      receivedVendors.forEach((v, idx) => {
        doc.text(v.vendor.code.substring(0, 10), 20 + (3 + idx) * itemColWidth + 2, yPos);
      });
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      items.forEach(item => {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${item.item_number}`, 20 + 2, yPos);
        const desc = item.description_en.length > 30 ? item.description_en.substring(0, 30) + '...' : item.description_en;
        doc.text(desc, 20 + itemColWidth + 2, yPos);
        doc.text(`${item.quantity}`, 20 + 2 * itemColWidth + 2, yPos);
        receivedVendors.forEach((v, idx) => {
          const price = v.prices?.find(p => p.rfq_item_id === item.id);
          doc.text((price?.total_price || 0).toLocaleString(), 20 + (3 + idx) * itemColWidth + 2, yPos);
        });
        yPos += 5;
      });
      yPos += 5;

      // Totals
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', 20 + itemColWidth + 2, yPos);
      receivedVendors.forEach((v, idx) => {
        doc.text((v.total_amount || 0).toLocaleString(), 20 + (3 + idx) * itemColWidth + 2, yPos);
      });
      yPos += 10;

      // AI Recommendation
      if (analysis?.recommendation) {
        if (yPos > 160) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('AI Recommendation', 20, yPos);
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        doc.setFillColor(220, 252, 231);
        doc.rect(20, yPos - 4, pageWidth - 40, 20, 'F');
        doc.text(`Recommended Vendor: ${analysis.recommendation.recommendedVendor || 'N/A'}`, 25, yPos + 2);
        doc.text(`Confidence: ${analysis.recommendation.confidenceScore || 'N/A'}%`, 25, yPos + 8);
        const justification = analysis.recommendation.justification || '';
        const justLines = doc.splitTextToSize(justification, pageWidth - 50);
        yPos += 16;
        doc.text(justLines, 25, yPos);
      }

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`${rfq.code}_Comparison_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(language === 'ar' ? 'فشل التصدير' : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (receivedVendors.length < 2) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {language === 'ar' ? 'تصدير' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={downloadPDF}>
          <FileText className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
