import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRFQ, useRFQItems, useRFQVendors } from '@/hooks/useRFQ';
import { useIssueRFQ, useTriggerRFQAnalysis } from '@/hooks/useRFQWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcurementStatusBadge } from '@/components/procurement/ProcurementStatusBadge';
import { ProcurementTypeBadge } from '@/components/procurement/ProcurementTypeBadge';
import { QuotationComparisonPanel } from '@/components/procurement/rfq/QuotationComparisonPanel';
import { VendorQuotationForm } from '@/components/procurement/rfq/VendorQuotationForm';
import { RFQExportButton } from '@/components/procurement/rfq/RFQExportButton';
import { ConvertToPRDialog } from '@/components/procurement/rfq/ConvertToPRDialog';
import { AddRFQVendorsDialog } from '@/components/procurement/rfq/AddRFQVendorsDialog';
import { RFQAuditLog } from '@/components/procurement/rfq/RFQAuditLog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  FileText, 
  Users,
  UserPlus,
  Send, 
  BarChart3,
  FileOutput,
  History,
  CheckCircle,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: rfq, isLoading } = useRFQ(id || '');
  const { data: items } = useRFQItems(id || '');
  const { data: vendors } = useRFQVendors(id || '');
  const issueRFQ = useIssueRFQ();
  const triggerAnalysis = useTriggerRFQAnalysis();
  
  const [activeTab, setActiveTab] = useState('details');
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showAddVendorsDialog, setShowAddVendorsDialog] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!rfq) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{language === 'ar' ? 'لم يتم العثور على طلب عرض الأسعار' : 'RFQ not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const receivedQuotations = vendors?.filter(v => v.quotation_received) || [];
  const isCompleted = rfq.status === 'completed';
  const isDraft = rfq.status === 'draft';
  const canIssue = isDraft && (vendors?.length || 0) > 0 && (items?.length || 0) > 0;
  const canAnalyze = receivedQuotations.length >= 2 && !isCompleted;
  const canConvert = receivedQuotations.length >= 1 && !isCompleted;

  const handleIssueRFQ = async () => {
    if (!id) return;
    try {
      await issueRFQ.mutateAsync(id);
      setShowIssueDialog(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!id) return;
    try {
      const result = await triggerAnalysis.mutateAsync(id);
      setAnalysisResult(result);
      setActiveTab('comparison');
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/procurement')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{rfq.code}</h1>
                <ProcurementStatusBadge status={rfq.status as ProcurementStatus} />
                <ProcurementTypeBadge type={rfq.procurement_type as ProcurementType} />
                {isCompleted && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    {language === 'ar' ? 'للقراءة فقط' : 'Read Only'}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {language === 'ar' ? rfq.title_ar : rfq.title_en}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <Button
                variant="outline"
                onClick={() => setShowAddVendorsDialog(true)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة موردين' : 'Add Vendors'}
              </Button>
            )}

            {/* Issue RFQ Button */}
            {isDraft ? (
              <Button 
                onClick={() => setShowIssueDialog(true)} 
                disabled={!canIssue || issueRFQ.isPending}
                title={!canIssue ? (language === 'ar' ? 'يرجى إضافة عناصر وموردين أولاً' : 'Please add items and vendors first') : ''}
              >
                {issueRFQ.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {language === 'ar' ? 'إصدار RFQ' : 'Issue RFQ'}
              </Button>
            ) : (
              <Button variant="outline" disabled className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {language === 'ar' ? 'تم الإصدار' : 'Issued'}
              </Button>
            )}
            
            {/* Analysis Button */}
            {canAnalyze && (
              <Button 
                onClick={handleTriggerAnalysis} 
                disabled={triggerAnalysis.isPending}
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {triggerAnalysis.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                {language === 'ar' ? 'تحليل' : 'ANALYSIS'}
              </Button>
            )}
            
            {/* Convert to PR Button */}
            {canConvert && (
              <Button onClick={() => setShowConvertDialog(true)} variant="outline">
                <FileOutput className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تحويل إلى PR' : 'Convert to PR'}
              </Button>
            )}
            
            {/* Export Button */}
            <RFQExportButton 
              rfq={rfq}
              vendors={vendors || []}
              items={items || []}
              analysis={analysisResult?.analysis}
            />
          </div>
        </div>

        {/* Status Indicators */}
        {receivedQuotations.length >= 2 && rfq.status !== 'completed' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">
                {language === 'ar' 
                  ? 'جاهز للتحليل'
                  : 'Ready for Analysis'}
              </p>
              <p className="text-sm text-green-600">
                {language === 'ar'
                  ? `تم استلام ${receivedQuotations.length} عروض أسعار. يمكنك الآن تشغيل التحليل.`
                  : `${receivedQuotations.length} quotations received. You can now run the analysis.`}
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'التفاصيل' : 'Details'}
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2">
              <Users className="h-4 w-4" />
              {language === 'ar' ? 'الموردون' : 'Vendors'} ({vendors?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {language === 'ar' ? 'المقارنة' : 'Comparison'}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="h-4 w-4" />
              {language === 'ar' ? 'السجل' : 'Audit'}
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
                      <span className="text-muted-foreground">{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}:</span>
                      <p className="font-medium">
                        {rfq.submission_deadline 
                          ? format(new Date(rfq.submission_deadline), 'PPP') 
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'صالح حتى' : 'Valid Until'}:</span>
                      <p className="font-medium">
                        {rfq.valid_until 
                          ? format(new Date(rfq.valid_until), 'PPP') 
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {rfq.description && (
                    <div>
                      <span className="text-muted-foreground text-sm">{language === 'ar' ? 'الوصف' : 'Description'}:</span>
                      <p className="mt-1">{rfq.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'ملخص عروض الأسعار' : 'Quotation Summary'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>{language === 'ar' ? 'الموردون المدعوون' : 'Invited Vendors'}:</span>
                      <Badge variant="secondary">{vendors?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{language === 'ar' ? 'عروض الأسعار المستلمة' : 'Received Quotations'}:</span>
                      <Badge className="bg-green-500/10 text-green-600">{receivedQuotations.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{language === 'ar' ? 'في الانتظار' : 'Pending'}:</span>
                      <Badge variant="outline">{(vendors?.length || 0) - receivedQuotations.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{language === 'ar' ? 'رسائل مرسلة' : 'Emails Sent'}:</span>
                      <Badge variant="outline">
                        {vendors?.filter((v: any) => v.email_sent).length || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'العناصر' : 'Items'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead className="w-24">{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
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
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            {isCompleted ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-8 w-8 mx-auto mb-2" />
                <p>{language === 'ar' 
                  ? 'تم تحويل طلب عرض الأسعار إلى طلب شراء. لا يمكن قبول المزيد من العروض.'
                  : 'RFQ has been converted to PR. No more quotations can be accepted.'}</p>
              </div>
            ) : (vendors?.length || 0) === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {language === 'ar'
                    ? 'لا يوجد موردون مضافون لهذا الطلب بعد.'
                    : 'No vendors have been added to this RFQ yet.'}
                </p>
                {isDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => setShowAddVendorsDialog(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    {language === 'ar' ? 'إضافة موردين' : 'Add Vendors'}
                  </Button>
                )}
              </div>
            ) : (
              vendors?.map((rfqVendor) => (
                <VendorQuotationForm 
                  key={rfqVendor.id} 
                  rfqVendor={rfqVendor} 
                  rfqItems={items || []}
                  rfqId={id || ''}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="comparison">
            <QuotationComparisonPanel 
              rfqId={id || ''} 
              vendors={vendors || []} 
              items={items || []} 
            />
          </TabsContent>

          <TabsContent value="audit">
            <RFQAuditLog rfqId={id || ''} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Issue RFQ Confirmation Dialog */}
      <AlertDialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'إصدار طلب عرض الأسعار' : 'Issue RFQ'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? `سيتم إرسال طلب عرض الأسعار إلى ${vendors?.length || 0} مورد عبر البريد الإلكتروني. هل أنت متأكد؟`
                : `This will send the RFQ to ${vendors?.length || 0} vendor(s) via email. Are you sure?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleIssueRFQ} disabled={issueRFQ.isPending}>
              {issueRFQ.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {language === 'ar' ? 'إصدار' : 'Issue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddRFQVendorsDialog
        open={showAddVendorsDialog}
        onOpenChange={setShowAddVendorsDialog}
        rfqId={id || ''}
        existingVendorIds={vendors?.map((v: any) => v.vendor_id) || []}
      />

      {/* Convert to PR Dialog */}
      <ConvertToPRDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        rfqId={id || ''}
        vendors={vendors || []}
        recommendedVendorCode={analysisResult?.analysis?.recommendation?.recommendedVendor}
      />
    </DashboardLayout>
  );
}
