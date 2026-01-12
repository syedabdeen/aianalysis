import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseRequest, usePRItems, useUpdatePurchaseRequest } from '@/hooks/usePurchaseRequest';
import { useCreatePOFromPR } from '@/hooks/usePurchaseOrder';
import { 
  useApprovalWorkflowStatus, 
  useInitiateWorkflow, 
  useApproveWorkflowStep, 
  useRejectWorkflow,
  useCanUserApprove 
} from '@/hooks/useApprovalWorkflow';
import { useEmail } from '@/hooks/useEmail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcurementStatusBadge } from '@/components/procurement/ProcurementStatusBadge';
import { ProcurementTypeBadge } from '@/components/procurement/ProcurementTypeBadge';
import { ApprovalWorkflowPanel } from '@/components/approval/ApprovalWorkflowPanel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Package, Send, CheckCircle, XCircle, ShoppingCart, Edit, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';
import { toast } from '@/hooks/use-toast';

export default function PRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { data: pr, isLoading, refetch } = usePurchaseRequest(id || '');
  const { data: items } = usePRItems(id || '');
  const updatePR = useUpdatePurchaseRequest();
  const createPO = useCreatePOFromPR();
  const [activeTab, setActiveTab] = useState('details');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Approval workflow hooks
  const { data: workflow, isLoading: workflowLoading, refetch: refetchWorkflow } = useApprovalWorkflowStatus(id || '', 'purchase_request');
  const initiateWorkflow = useInitiateWorkflow();
  const approveStep = useApproveWorkflowStep();
  const rejectWorkflow = useRejectWorkflow();
  const { data: canApproveData, refetch: refetchCanApprove } = useCanUserApprove(workflow?.id || null);
  const { sendEmail } = useEmail();

  // Refetch canApprove when workflow changes
  useEffect(() => {
    if (workflow?.id) {
      refetchCanApprove();
    }
  }, [workflow?.id, refetchCanApprove]);

  const handleSubmit = async () => {
    if (!id || !pr) return;
    try {
      // Initiate the approval workflow
      const result = await initiateWorkflow.mutateAsync({
        referenceId: id,
        referenceCode: pr.code,
        category: 'purchase_request',
        amount: pr.total_amount,
        currency: pr.currency,
        departmentId: pr.department_id,
      });

      if (result.autoApproved) {
        // Auto-approved - directly approve PR
        await updatePR.mutateAsync({ id, data: { status: 'approved' } });
        toast({
          title: language === 'ar' ? 'تمت الموافقة تلقائياً' : 'Auto-Approved',
          description: language === 'ar' 
            ? 'تمت الموافقة على طلب الشراء تلقائياً (دون حد الموافقة)' 
            : 'Purchase request auto-approved (below approval threshold)',
        });
      } else {
        // Update PR status to submitted
        await updatePR.mutateAsync({ id, data: { status: 'submitted' } });
        toast({
          title: language === 'ar' ? 'تم الإرسال' : 'Submitted',
          description: language === 'ar' 
            ? `تم إرسال طلب الشراء للموافقة (${result.approversCount} موافقين)` 
            : `Purchase request submitted for approval (${result.approversCount} approvers)`,
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
        description: language === 'ar' ? 'فشل في إرسال الطلب' : 'Failed to submit request',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async () => {
    if (!id || !workflow) return;
    try {
      const result = await approveStep.mutateAsync({
        workflowId: workflow.id,
        actionId: canApproveData?.actionId,
        comments: undefined,
      });

      if (result.completed) {
        // All approvals complete - update PR status
        await updatePR.mutateAsync({ id, data: { status: 'approved' } });
        toast({
          title: language === 'ar' ? 'تمت الموافقة' : 'Approved',
          description: language === 'ar' ? 'تمت الموافقة على طلب الشراء' : 'Purchase request approved',
        });

        // Send notification email to requester
        if (pr?.created_by) {
          // Email notification would go here
        }
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

  const handleReject = async () => {
    if (!id || !workflow || !rejectReason.trim()) return;
    try {
      await rejectWorkflow.mutateAsync({
        workflowId: workflow.id,
        actionId: canApproveData?.actionId,
        comments: rejectReason,
      });

      await updatePR.mutateAsync({ id, data: { status: 'rejected' } });
      
      toast({
        title: language === 'ar' ? 'تم الرفض' : 'Rejected',
        description: language === 'ar' ? 'تم رفض طلب الشراء' : 'Purchase request rejected',
      });

      setRejectDialogOpen(false);
      setRejectReason('');
      refetch();
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في الرفض' : 'Failed to reject',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePO = async () => {
    if (!id) return;
    try {
      const po = await createPO.mutateAsync(id);
      toast({
        title: language === 'ar' ? 'تم إنشاء أمر الشراء' : 'PO Created',
        description: language === 'ar' ? 'تم إنشاء أمر الشراء بنجاح' : 'Purchase order created successfully',
      });
      navigate(`/procurement/po/${po.id}`);
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إنشاء أمر الشراء' : 'Failed to create purchase order',
        variant: 'destructive',
      });
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

  if (!pr) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{language === 'ar' ? 'لم يتم العثور على طلب الشراء' : 'Purchase Request not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const canEdit = pr.status === 'draft' && !pr.is_locked;
  const canSubmit = pr.status === 'draft';
  const canApprove = pr.status === 'submitted' && canApproveData?.canApprove;
  const canCreatePO = pr.status === 'approved' && pr.vendor_id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={FileText}
          title={pr.code}
          titleAr={pr.code}
          description={language === 'ar' ? pr.title_ar : pr.title_en}
          descriptionAr={pr.title_ar}
          actions={
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" onClick={() => navigate(`/procurement/pr/edit/${id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              )}
              {canSubmit && (
                <Button onClick={handleSubmit} disabled={initiateWorkflow.isPending || updatePR.isPending}>
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
                  <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={rejectWorkflow.isPending}>
                    <XCircle className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button onClick={handleApprove} disabled={approveStep.isPending}>
                    {approveStep.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {language === 'ar' ? 'موافقة' : 'Approve'}
                  </Button>
                </>
              )}
              {canCreatePO && (
                <Button onClick={handleCreatePO} disabled={createPO.isPending}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إنشاء أمر شراء' : 'Create PO'}
                </Button>
              )}
            </div>
          }
        />

        <div className="flex items-center gap-3">
          <ProcurementStatusBadge status={pr.status as ProcurementStatus} />
          <ProcurementTypeBadge type={pr.procurement_type as ProcurementType} />
          {pr.is_locked && (
            <Badge variant="outline" className="border-orange-500 text-orange-500">
              {language === 'ar' ? 'مقفل' : 'Locked'}
            </Badge>
          )}
        </div>

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
                      <span className="text-muted-foreground">{language === 'ar' ? 'التاريخ المطلوب' : 'Required Date'}:</span>
                      <p className="font-medium">
                        {pr.required_date ? format(new Date(pr.required_date), 'PPP') : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}:</span>
                      <p className="font-medium">{format(new Date(pr.created_at), 'PPP')}</p>
                    </div>
                    {pr.project && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'المشروع' : 'Project'}:</span>
                        <p className="font-medium">{language === 'ar' ? pr.project.name_ar : pr.project.name_en}</p>
                      </div>
                    )}
                    {pr.cost_center && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}:</span>
                        <p className="font-medium">{language === 'ar' ? pr.cost_center.name_ar : pr.cost_center.name_en}</p>
                      </div>
                    )}
                    {pr.department && (
                      <div>
                        <span className="text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}:</span>
                        <p className="font-medium">{language === 'ar' ? pr.department.name_ar : pr.department.name_en}</p>
                      </div>
                    )}
                  </div>
                  {pr.description && (
                    <div>
                      <span className="text-muted-foreground text-sm">{language === 'ar' ? 'الوصف' : 'Description'}:</span>
                      <p className="mt-1">{pr.description}</p>
                    </div>
                  )}
                  {pr.justification && (
                    <div>
                      <span className="text-muted-foreground text-sm">{language === 'ar' ? 'المبرر' : 'Justification'}:</span>
                      <p className="mt-1">{pr.justification}</p>
                    </div>
                  )}
                  {pr.delivery_address && (
                    <div>
                      <span className="text-muted-foreground text-sm">{language === 'ar' ? 'عنوان التسليم' : 'Delivery Address'}:</span>
                      <p className="mt-1">{pr.delivery_address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {pr.vendor && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{language === 'ar' ? 'المورد' : 'Vendor'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="font-medium">{language === 'ar' ? pr.vendor.company_name_ar : pr.vendor.company_name_en}</p>
                        <p className="text-sm text-muted-foreground">{pr.vendor.code}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}:</span>
                        <span className="font-medium">{pr.subtotal?.toLocaleString()} {pr.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'}:</span>
                        <span className="font-medium">{pr.tax_amount?.toLocaleString()} {pr.currency}</span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}:</span>
                        <span className="font-bold text-lg">{pr.total_amount?.toLocaleString()} {pr.currency}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'عناصر طلب الشراء' : 'Purchase Request Items'}</CardTitle>
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
                      </TableRow>
                    ))}
                    {(!items || items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد عناصر' : 'No items found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow">
            <ApprovalWorkflowPanel workflow={workflow as any} isLoading={workflowLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رفض طلب الشراء' : 'Reject Purchase Request'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'يرجى تقديم سبب الرفض. سيتم إخطار مقدم الطلب.'
                : 'Please provide a reason for rejection. The requester will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectWorkflow.isPending}
            >
              {rejectWorkflow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
