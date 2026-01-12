import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Eye, Download, FileText } from 'lucide-react';
import { usePettyCashClaims } from '@/hooks/usePettyCash';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export const ApprovedPettyCashPanel: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: claims, isLoading } = usePettyCashClaims();

  // Filter only paid claims
  const paidClaims = claims?.filter(c => c.status === 'paid') || [];

  const handleDownloadPDF = (claim: any) => {
    const pdfContent = generatePDFContent(claim);
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PettyCash_${claim.projects?.code || 'NA'}_${format(new Date(claim.claim_date), 'yyyyMMdd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFContent = (claim: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Petty Cash Claim - ${claim.claim_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-item { padding: 10px; background: #f5f5f5; border-radius: 4px; }
    .info-label { font-size: 12px; color: #666; }
    .info-value { font-size: 16px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f5f5f5; }
    .total-row { background: #e8f5e9; font-weight: bold; }
    .status-paid { color: #2e7d32; font-weight: bold; font-size: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">PETTY CASH REPLENISHMENT REQUEST FORM</div>
    <div>Claim No: ${claim.claim_code}</div>
    <div>Date: ${format(new Date(claim.claim_date), 'dd MMMM yyyy')}</div>
    <div class="status-paid">STATUS: PAID</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Project / Site</div>
      <div class="info-value">${claim.projects?.name_en || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Total Amount</div>
      <div class="info-value">${formatCurrency(claim.total_spent, claim.currency)}</div>
    </div>
  </div>

  <h3>Approvals</h3>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Requested By</div>
      <div class="info-value">${claim.creator?.full_name || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Approved By (GM)</div>
      <div class="info-value">${claim.gm_approver?.full_name || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Payment Confirmed By</div>
      <div class="info-value">${claim.payer?.full_name || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Payment Date</div>
      <div class="info-value">${claim.payment_date ? format(new Date(claim.payment_date), 'dd/MM/yyyy') : 'N/A'}</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {language === 'ar' ? 'مطالبات صندوق المصروفات النثرية المعتمدة' : 'Approved Petty Cash Claims'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {language === 'ar' ? 'مطالبات صندوق المصروفات النثرية المعتمدة' : 'Approved Petty Cash Claims'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {paidClaims.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم المطالبة' : 'Claim No.'}</TableHead>
                <TableHead>{language === 'ar' ? 'المشروع' : 'Project'}</TableHead>
                <TableHead>{language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</TableHead>
                <TableHead className="text-right">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{language === 'ar' ? 'دفع بواسطة' : 'Paid By'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-mono font-medium">{claim.claim_code}</TableCell>
                  <TableCell>
                    {claim.projects 
                      ? (language === 'ar' ? claim.projects.name_ar : claim.projects.name_en)
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {claim.payment_date 
                      ? format(new Date(claim.payment_date), 'dd MMM yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(claim.total_spent, claim.currency)}
                  </TableCell>
                  <TableCell>{claim.payer?.full_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/procurement/petty-cash/${claim.id}`)}
                        title={language === 'ar' ? 'عرض' : 'View'}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPDF(claim)}
                        title={language === 'ar' ? 'تحميل' : 'Download'}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'لا توجد مطالبات صندوق المصروفات النثرية مدفوعة بعد'
                : 'No paid petty cash claims yet'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
