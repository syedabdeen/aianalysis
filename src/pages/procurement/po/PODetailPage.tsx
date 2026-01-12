import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseOrder, usePOItems, useIssuePurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrder';
import {
  useApprovalWorkflowStatus,
  useInitiateWorkflow,
  useApproveWorkflowStep,
  useRejectWorkflow,
  useCanUserApprove,
} from '@/hooks/useApprovalWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcurementStatusBadge } from '@/components/procurement/ProcurementStatusBadge';
import { ProcurementTypeBadge } from '@/components/procurement/ProcurementTypeBadge';
import { ApprovalWorkflowPanel } from '@/components/approval/ApprovalWorkflowPanel';
import { ApprovalActionsDialog } from '@/components/approval/ApprovalActionsDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Loader2, FileText, Package, Send, FileDown, Link2, ScrollText, CheckCircle, XCircle, GitBranch, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';
import { toast } from '@/hooks/use-toast';

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, isRTL } = useLanguage();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: po, isLoading, refetch } = usePurchaseOrder(id || '');
  const { data: items } = usePOItems(id || '');
  const issuePO = useIssuePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const [activeTab, setActiveTab] = useState('details');
  const [isExporting, setIsExporting] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalDialogMode, setApprovalDialogMode] = useState<'approve' | 'reject'>('approve');

  // Approval workflow hooks
  const { data: workflow, isLoading: workflowLoading, refetch: refetchWorkflow } = useApprovalWorkflowStatus(id || '', 'purchase_order');
  const initiateWorkflow = useInitiateWorkflow();
  const approveStep = useApproveWorkflowStep();
  const rejectWorkflow = useRejectWorkflow();
  const { data: canApproveData, refetch: refetchCanApprove } = useCanUserApprove(workflow?.id || null);

  // Refetch canApprove when workflow changes
  useEffect(() => {
    if (workflow?.id) {
      refetchCanApprove();
    }
  }, [workflow?.id, refetchCanApprove]);

  // Check if this PO was rejected/returned for rework and show rejection reason
  const isRejectedOrRework = po?.status === 'rejected' || po?.status === 'under_review';
  const rejectionReason = workflow?.actions?.find(a => a.status === 'rejected')?.comments;

  const handleIssuePO = async () => {
    if (!id || !po) return;
    try {
      // Initiate the approval workflow
      const result = await initiateWorkflow.mutateAsync({
        referenceId: id,
        referenceCode: po.code,
        category: 'purchase_order',
        amount: po.total_amount,
        currency: po.currency,
        departmentId: po.department_id,
      });

      if (result.autoApproved) {
        // Auto-approved - directly approve PO
        await updatePO.mutateAsync({ id, data: { status: 'approved' } });
        toast({
          title: language === 'ar' ? 'تمت الموافقة تلقائياً' : 'Auto-Approved',
          description: language === 'ar'
            ? 'تمت الموافقة على أمر الشراء تلقائياً (دون حد الموافقة)'
            : 'Purchase order auto-approved (below approval threshold)',
        });
      } else {
        // Update PO status to submitted (and link the created approval workflow)
        await issuePO.mutateAsync({ id, workflowId: result.workflowId });
        toast({
          title: language === 'ar' ? 'تم الإرسال للموافقة' : 'Submitted for Approval',
          description: language === 'ar'
            ? `تم إرسال أمر الشراء للموافقة (${result.approversCount} موافقين)`
            : `Purchase order submitted for approval (${result.approversCount} approvers)`,
        });
      }

      refetch();
      // Refetch workflow status to update canApprove
      setTimeout(() => {
        refetchWorkflow();
      }, 500);
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إصدار أمر الشراء' : 'Failed to issue purchase order',
        variant: 'destructive',
      });
    }
  };

  const handleInitializeApproval = async () => {
    if (!id || !po) return;
    try {
      const result = await initiateWorkflow.mutateAsync({
        referenceId: id,
        referenceCode: po.code,
        category: 'purchase_order',
        amount: po.total_amount,
        currency: po.currency,
        departmentId: po.department_id,
      });

      if (result.autoApproved) {
        await updatePO.mutateAsync({ id, data: { status: 'approved' } });
        toast({
          title: language === 'ar' ? 'تمت الموافقة تلقائياً' : 'Auto-Approved',
          description: language === 'ar' ? 'تمت الموافقة على أمر الشراء تلقائياً' : 'Purchase order auto-approved',
        });
      } else {
        await updatePO.mutateAsync({ id, data: { workflow_id: result.workflowId } });
        toast({
          title: language === 'ar' ? 'تم بدء سير الموافقة' : 'Approval Started',
          description: language === 'ar'
            ? `تم إنشاء سير موافقة جديد (${result.approversCount} موافقين)`
            : `New approval workflow created (${result.approversCount} approvers)`,
        });
      }

      refetch();
      // Refetch workflow status to update canApprove
      setTimeout(() => {
        refetchWorkflow();
      }, 500);
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في بدء سير الموافقة' : 'Failed to start approval workflow',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (comments?: string) => {
    if (!id || !workflow) return;
    try {
      const result = await approveStep.mutateAsync({
        workflowId: workflow.id,
        actionId: canApproveData?.actionId,
        comments,
      });

      if (result.completed) {
        // All approvals complete - update PO status
        await updatePO.mutateAsync({ id, data: { status: 'approved' } });
        toast({
          title: language === 'ar' ? 'تمت الموافقة' : 'Approved',
          description: language === 'ar' ? 'تمت الموافقة على أمر الشراء' : 'Purchase order approved',
        });
      } else {
        toast({
          title: language === 'ar' ? 'تمت الموافقة' : 'Approved',
          description: language === 'ar'
            ? 'تم تمرير الطلب للموافق التالي'
            : 'Request passed to next approver',
        });
      }

      refetch();
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في الموافقة' : 'Failed to approve',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (reason: string) => {
    if (!id || !workflow) return;
    try {
      await rejectWorkflow.mutateAsync({
        workflowId: workflow.id,
        actionId: canApproveData?.actionId,
        comments: reason,
      });

      // Update PO status to under_review (rework status) - it goes back to the creator
      await updatePO.mutateAsync({ id, data: { status: 'under_review' } });

      toast({
        title: language === 'ar' ? 'تم الإرجاع لإعادة العمل' : 'Returned for Rework',
        description: language === 'ar'
          ? 'تم إرجاع أمر الشراء للمنشئ لإعادة العمل عليه'
          : 'Purchase order returned to initiator for rework',
      });

      refetch();
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في الرفض' : 'Failed to reject',
        variant: 'destructive',
      });
    }
  };

  const handleResubmit = async () => {
    if (!id || !po) return;
    try {
      // Reinitiate the approval workflow
      const result = await initiateWorkflow.mutateAsync({
        referenceId: id,
        referenceCode: po.code,
        category: 'purchase_order',
        amount: po.total_amount,
        currency: po.currency,
        departmentId: po.department_id,
      });

      if (result.autoApproved) {
        await updatePO.mutateAsync({ id, data: { status: 'approved' } });
        toast({
          title: language === 'ar' ? 'تمت الموافقة تلقائياً' : 'Auto-Approved',
          description: language === 'ar'
            ? 'تمت الموافقة على أمر الشراء تلقائياً'
            : 'Purchase order auto-approved',
        });
      } else {
        await updatePO.mutateAsync({ id, data: { status: 'submitted', workflow_id: result.workflowId } });
        toast({
          title: language === 'ar' ? 'تم إعادة الإرسال' : 'Resubmitted',
          description: language === 'ar'
            ? 'تم إعادة إرسال أمر الشراء للموافقة'
            : 'Purchase order resubmitted for approval',
        });
      }

      refetch();
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إعادة الإرسال' : 'Failed to resubmit',
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = async () => {
    if (!id) return;

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { poId: id, language },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate PDF');
      }

      // Create a blob from the HTML and open print dialog
      const htmlContent = data.html;
      const printWindow = window.open('', '_blank');

      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

      toast({
        title: language === 'ar' ? 'تم التصدير' : 'Exported',
        description: language === 'ar' ? 'تم فتح نافذة الطباعة' : 'Print window opened',
      });
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل في تصدير PDF' : 'Failed to export PDF'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!po) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{language === 'ar' ? 'لم يتم العثور على أمر الشراء' : 'Purchase Order not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const canIssue = po.status === 'draft';
  const needsWorkflow = po.status === 'submitted' && !workflow && !workflowLoading;
  const canApprove = po.status === 'submitted' && !!workflow && canApproveData?.canApprove;
  const canResubmit = (po.status === 'rejected' || po.status === 'under_review') && po.created_by === user?.id;
  const isCreator = po.created_by === user?.id;
  const variance = po.pr_total_amount > 0
    ? ((po.total_amount - po.pr_total_amount) / po.pr_total_amount) * 100
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={FileText}
          title={po.code}
          titleAr={po.code}
          description={language === 'ar' ? po.title_ar : po.title_en}
          descriptionAr={po.title_ar}
          actions={
            <div className="flex gap-2">
              {needsWorkflow && isAdmin && (
                <Button
                  variant="outline"
                  onClick={handleInitializeApproval}
                  disabled={initiateWorkflow.isPending}
                >
                  {initiateWorkflow.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GitBranch className="h-4 w-4 mr-2" />
                  )}
                  {language === 'ar' ? 'بدء سير الموافقة' : 'Start Approval Workflow'}
                </Button>
              )}
              {canIssue && (
                <Button onClick={handleIssuePO} disabled={initiateWorkflow.isPending || issuePO.isPending}>
                  {initiateWorkflow.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {language === 'ar' ? 'إرسال للموافقة' : 'Submit for Approval'}
                </Button>
              )}
              {canApprove && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setApprovalDialogMode('reject');
                      setApprovalDialogOpen(true);
                    }}
                    disabled={rejectWorkflow.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setApprovalDialogMode('approve');
                      setApprovalDialogOpen(true);
                    }}
                    disabled={approveStep.isPending}
                  >
                    {approveStep.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {language === 'ar' ? 'موافقة' : 'Approve'}
                  </Button>
                </>
              )}
              {canResubmit && (
                <Button onClick={handleResubmit} disabled={initiateWorkflow.isPending || updatePO.isPending}>
                  {initiateWorkflow.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {language === 'ar' ? 'إعادة الإرسال' : 'Resubmit'}
                </Button>
              )}
              <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
              </Button>
            </div>
          }
        />

        <div className="flex items-center gap-3">
          <ProcurementStatusBadge status={po.status as ProcurementStatus} />
          <ProcurementTypeBadge type={po.procurement_type as ProcurementType} />
          {po.pr && (
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => navigate(`/procurement/pr/${po.pr_id}`)}
            >
              <Link2 className="h-3 w-3 mr-1" />
              {po.pr.code}
            </Badge>
          )}
        </div>

        {/* Rejection Alert - shown to the creator when PO is rejected */}
        {isRejectedOrRework && isCreator && rejectionReason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {language === 'ar' ? 'تم رفض أمر الشراء' : 'Purchase Order Rejected'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <span className="font-medium">
                {language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}
              </span>{' '}
              {rejectionReason}
              <p className="mt-2 text-sm">
                {language === 'ar'
                  ? 'يمكنك تعديل أمر الشراء وإعادة إرساله للموافقة.'
                  : 'You can edit the purchase order and resubmit it for approval.'}
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'التفاصيل' : 'Details'}
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              {language === 'ar' ? 'العناصر' : 'Items'} ({items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-2">
              <ScrollText className="h-4 w-4" />
              {language === 'ar' ? 'الشروط' : 'Terms'}
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2">
              <GitBranch className="h-4 w-4" />
              {language === 'ar' ? 'سير العمل' : 'Workflow'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'معلومات عامة' : 'General Information'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}:</span>
                      <p className="font-medium">
                        {po.delivery_date ? format(new Date(po.delivery_date), 'PPP') : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}:</span>
                      <p className="font-medium">{format(new Date(po.created_at), 'PPP')}</p>
                    </div>
                    {po.issued_at && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ الإصدار' : 'Issued'}:</span>
                        <p className="font-medium">{format(new Date(po.issued_at), 'PPP')}</p>
                      </div>
                    )}
                    {po.project && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'المشروع' : 'Project'}:</span>
                        <p className="font-medium">{language === 'ar' ? po.project.name_ar : po.project.name_en}</p>
                      </div>
                    )}
                    {po.cost_center && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}:</span>
                        <p className="font-medium">{language === 'ar' ? po.cost_center.name_ar : po.cost_center.name_en}</p>
                      </div>
                    )}
                    {po.department && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}:</span>
                        <p className="font-medium">{language === 'ar' ? po.department.name_ar : po.department.name_en}</p>
                      </div>
                    )}
                  </div>
                  {po.description && (
                    <div>
                      <span className="text-muted-foreground text-sm">{language === 'ar' ? 'الوصف' : 'Description'}:</span>
                      <p className="mt-1">{po.description}</p>
                    </div>
                  )}
                  {po.delivery_address && (
                    <div>
                      <span className="text-muted-foreground text-sm">{language === 'ar' ? 'عنوان التسليم' : 'Delivery Address'}:</span>
                      <p className="mt-1">{po.delivery_address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'المورد' : 'Vendor'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{language === 'ar' ? po.vendor?.company_name_ar : po.vendor?.company_name_en}</p>
                      <p className="text-sm text-muted-foreground">{po.vendor?.code}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}:</span>
                        <span className="font-medium">{po.subtotal?.toLocaleString()} {po.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'}:</span>
                        <span className="font-medium">{po.tax_amount?.toLocaleString()} {po.currency}</span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="font-semibold">{language === 'ar' ? 'إجمالي أمر الشراء' : 'PO Total'}:</span>
                        <span className="font-bold text-lg">{po.total_amount?.toLocaleString()} {po.currency}</span>
                      </div>
                      {po.pr_total_amount > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي طلب الشراء' : 'PR Total'}:</span>
                            <span>{po.pr_total_amount?.toLocaleString()} {po.currency}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الفرق' : 'Variance'}:</span>
                            <Badge variant={Math.abs(variance) > 5 ? 'destructive' : 'secondary'}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(2)}%
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'عناصر أمر الشراء' : 'Purchase Order Items'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead className="w-24 text-right">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead className="w-24">{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                      <TableHead className="w-32 text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                      <TableHead className="w-32 text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead className="w-24 text-right">{language === 'ar' ? 'المستلم' : 'Received'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.item_number}</TableCell>
                        <TableCell>
                          <div>
                            <p>{language === 'ar' ? item.description_ar : item.description_en}</p>
                            {item.specifications && (
                              <p className="text-xs text-muted-foreground mt-1">{item.specifications}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{item.unit_price?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{item.total_price?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.received_quantity >= item.quantity ? 'default' : 'outline'}>
                            {item.received_quantity || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!items || items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد عناصر' : 'No items found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {po.payment_terms || (language === 'ar' ? 'لم يتم تحديد شروط الدفع' : 'No payment terms specified')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'شروط التسليم' : 'Delivery Terms'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {po.delivery_terms || (language === 'ar' ? 'لم يتم تحديد شروط التسليم' : 'No delivery terms specified')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {po.terms_conditions && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{po.terms_conditions}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="workflow">
            <ApprovalWorkflowPanel workflow={workflow} isLoading={workflowLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Actions Dialog */}
      <ApprovalActionsDialog
        isOpen={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        mode={approvalDialogMode}
        documentType="Purchase Order"
        documentCode={po.code}
        isLoading={approveStep.isPending || rejectWorkflow.isPending}
      />
    </DashboardLayout>
  );
}
