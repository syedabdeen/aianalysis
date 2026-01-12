import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, Send, CheckCircle, XCircle, CreditCard, FileText, 
  Download, ArrowLeft, Clock, User, Calendar, Building2, AlertTriangle
} from 'lucide-react';
import { 
  usePettyCashClaim, 
  useSubmitPettyCashClaim, 
  useApprovePettyCashClaim, 
  useRejectPettyCashClaim,
  useMarkPettyCashPaid 
} from '@/hooks/usePettyCash';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  draft: { label: 'Draft', labelAr: 'مسودة', variant: 'secondary' as const, icon: FileText },
  pending_gm_approval: { label: 'Pending GM Approval', labelAr: 'في انتظار موافقة المدير العام', variant: 'outline' as const, icon: Clock },
  approved_pending_payment: { label: 'Approved - Pending Payment', labelAr: 'معتمد - في انتظار الدفع', variant: 'default' as const, icon: CheckCircle },
  paid: { label: 'Paid', labelAr: 'مدفوع', variant: 'default' as const, icon: CreditCard },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', variant: 'destructive' as const, icon: XCircle },
};

export default function PettyCashDetailPage() {
  const { id } = useParams();
  const { language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const { data: claim, isLoading } = usePettyCashClaim(id);
  const submitClaim = useSubmitPettyCashClaim();
  const approveClaim = useApprovePettyCashClaim();
  const rejectClaim = useRejectPettyCashClaim();
  const markPaid = useMarkPettyCashPaid();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentReference, setPaymentReference] = useState('');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!claim) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Claim not found</h2>
          <Button onClick={() => navigate('/procurement/petty-cash')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const config = statusConfig[claim.status];
  const StatusIcon = config.icon;

  const canSubmit = claim.status === 'draft' && claim.created_by === user?.id;
  const canApprove = claim.status === 'pending_gm_approval' && isAdmin;
  const canMarkPaid = claim.status === 'approved_pending_payment' && isAdmin;

  const handleSubmit = async () => {
    await submitClaim.mutateAsync(claim.id);
  };

  const handleApprove = async () => {
    await approveClaim.mutateAsync(claim.id);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    await rejectClaim.mutateAsync({ id: claim.id, reason: rejectionReason });
    setShowRejectDialog(false);
  };

  const handleMarkPaid = async () => {
    await markPaid.mutateAsync({
      id: claim.id,
      payment_date: paymentDate,
      payment_reference: paymentReference,
    });
    setShowPaymentDialog(false);
  };

  const handleDownloadPDF = () => {
    // Generate PDF content
    const pdfContent = generatePDFContent();
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PettyCash_${claim.projects?.code || 'NA'}_${format(new Date(claim.claim_date), 'yyyyMMdd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFContent = () => {
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
    .approvals { margin-top: 30px; }
    .approval-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">PETTY CASH REPLENISHMENT REQUEST FORM</div>
    <div>Claim No: ${claim.claim_code}</div>
    <div>Date: ${format(new Date(claim.claim_date), 'dd MMMM yyyy')}</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Project / Site</div>
      <div class="info-value">${claim.projects?.name_en || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Status</div>
      <div class="info-value status-paid">${claim.status === 'paid' ? 'PAID' : claim.status.toUpperCase()}</div>
    </div>
  </div>

  <h3>1. Petty Cash Summary</h3>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Total Petty Cash Allocated</div>
      <div class="info-value">${formatCurrency(claim.total_allocated, claim.currency)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Total Spent / Claimed</div>
      <div class="info-value">${formatCurrency(claim.total_spent, claim.currency)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Balance Remaining</div>
      <div class="info-value">${formatCurrency(claim.balance_remaining, claim.currency)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Replenishment Amount Requested</div>
      <div class="info-value">${formatCurrency(claim.replenishment_amount, claim.currency)}</div>
    </div>
  </div>

  <h3>2. Expense Breakdown</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Description of Expense</th>
        <th>Amount (${claim.currency})</th>
        <th>Receipt</th>
      </tr>
    </thead>
    <tbody>
      ${claim.items?.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.expense_date ? format(new Date(item.expense_date), 'dd/MM/yyyy') : '-'}</td>
          <td>${item.description}</td>
          <td style="text-align: right">${formatCurrency(item.amount, claim.currency)}</td>
          <td style="text-align: center">${item.receipt_attached ? 'Yes' : 'No'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3" style="text-align: right"><strong>Total Amount:</strong></td>
        <td style="text-align: right"><strong>${formatCurrency(claim.total_spent, claim.currency)}</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h3>3. Approvals</h3>
  <div class="approvals">
    <div class="approval-item">
      <span><strong>Requested By:</strong></span>
      <span>${claim.creator?.full_name || 'N/A'}</span>
    </div>
    <div class="approval-item">
      <span><strong>Approved By (GM):</strong></span>
      <span>${claim.gm_approver?.full_name || 'Pending'} ${claim.gm_approved_at ? `(${format(new Date(claim.gm_approved_at), 'dd/MM/yyyy')})` : ''}</span>
    </div>
    <div class="approval-item">
      <span><strong>Payment Confirmed By:</strong></span>
      <span>${claim.payer?.full_name || 'Pending'} ${claim.paid_at ? `(${format(new Date(claim.paid_at), 'dd/MM/yyyy')})` : ''}</span>
    </div>
    ${claim.payment_reference ? `
    <div class="approval-item">
      <span><strong>Payment Reference:</strong></span>
      <span>${claim.payment_reference}</span>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={claim.claim_code}
          titleAr={claim.claim_code}
          description="Petty Cash Claim Details"
          descriptionAr="تفاصيل مطالبة صندوق المصروفات النثرية"
          icon={Wallet}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/procurement/petty-cash')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'رجوع' : 'Back'}
              </Button>
              {(claim.status === 'approved_pending_payment' || claim.status === 'paid') && (
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                </Button>
              )}
            </div>
          }
        />

        {/* Status Banner */}
        <Card className={`border-2 ${claim.status === 'rejected' ? 'border-destructive/50 bg-destructive/5' : claim.status === 'paid' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-8 w-8 ${claim.status === 'paid' ? 'text-green-500' : claim.status === 'rejected' ? 'text-destructive' : 'text-primary'}`} />
                <div>
                  <Badge variant={config.variant} className="text-sm">
                    {language === 'ar' ? config.labelAr : config.label}
                  </Badge>
                  {claim.gm_rejection_reason && (
                    <p className="text-sm text-destructive mt-1">
                      {language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'} {claim.gm_rejection_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {canSubmit && (
                  <Button onClick={handleSubmit} disabled={submitClaim.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إرسال للموافقة' : 'Submit for Approval'}
                  </Button>
                )}
                {canApprove && (
                  <>
                    <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'رفض' : 'Reject'}
                    </Button>
                    <Button onClick={handleApprove} disabled={approveClaim.isPending}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'موافقة' : 'Approve'}
                    </Button>
                  </>
                )}
                {canMarkPaid && (
                  <Button onClick={() => setShowPaymentDialog(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تأكيد الدفع' : 'Mark as Paid'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                  <p className="font-medium">{format(new Date(claim.claim_date), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المشروع' : 'Project'}</p>
                  <p className="font-medium">
                    {claim.projects ? (language === 'ar' ? claim.projects.name_ar : claim.projects.name_en) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المنشئ' : 'Created By'}</p>
                  <p className="font-medium">{claim.creator?.full_name || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(claim.total_spent, claim.currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Petty Cash Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'ملخص صندوق المصروفات النثرية' : 'Petty Cash Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المخصص' : 'Total Allocated'}</p>
                <p className="text-xl font-bold">{formatCurrency(claim.total_allocated, claim.currency)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المصروف' : 'Total Spent'}</p>
                <p className="text-xl font-bold">{formatCurrency(claim.total_spent, claim.currency)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الرصيد المتبقي' : 'Balance Remaining'}</p>
                <p className="text-xl font-bold">{formatCurrency(claim.balance_remaining, claim.currency)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مبلغ التجديد' : 'Replenishment Amount'}</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(claim.replenishment_amount, claim.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'تفصيل المصروفات' : 'Expense Breakdown'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'وصف المصروف' : 'Description of Expense'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'المبلغ (د.إ)' : 'Amount (AED)'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'إيصال' : 'Receipt'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claim.items?.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      {item.expense_date ? format(new Date(item.expense_date), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount, claim.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.receipt_attached ? 'default' : 'secondary'}>
                        {item.receipt_attached ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-primary/5 font-bold">
                  <TableCell colSpan={3} className="text-right">
                    {language === 'ar' ? 'المبلغ الإجمالي:' : 'Total Amount:'}
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {formatCurrency(claim.total_spent, claim.currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Approval History */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'سجل الموافقات' : 'Approval History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'طلب بواسطة' : 'Requested By'}</p>
                    <p className="text-sm text-muted-foreground">{claim.creator?.full_name || '-'}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(claim.created_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>

              {claim.gm_approved_at && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {claim.status === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {claim.status === 'rejected' 
                          ? (language === 'ar' ? 'مرفوض بواسطة' : 'Rejected By')
                          : (language === 'ar' ? 'موافقة المدير العام' : 'GM Approved By')
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">{claim.gm_approver?.full_name || '-'}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(claim.gm_approved_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              )}

              {claim.paid_at && (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{language === 'ar' ? 'دفع بواسطة' : 'Payment Confirmed By'}</p>
                      <p className="text-sm text-muted-foreground">{claim.payer?.full_name || '-'}</p>
                      {claim.payment_reference && (
                        <p className="text-xs text-muted-foreground">Ref: {claim.payment_reference}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(claim.paid_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رفض المطالبة' : 'Reject Claim'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' 
                  ? 'سيتم إخطار المنشئ بالرفض مع السبب المذكور.'
                  : 'The initiator will be notified of the rejection with the reason provided.'
                }
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectClaim.isPending}
            >
              {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المبلغ المستحق' : 'Amount Payable'}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(claim.total_spent, claim.currency)}</p>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'مرجع الدفع (اختياري)' : 'Payment Reference (Optional)'}</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={language === 'ar' ? 'رقم الشيك / التحويل...' : 'Cheque / Transfer No...'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleMarkPaid} disabled={markPaid.isPending}>
              <CreditCard className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
