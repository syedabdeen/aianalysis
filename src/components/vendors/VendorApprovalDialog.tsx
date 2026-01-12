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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { VendorStatus } from '@/types/vendor';
import { useVendorDocuments } from '@/hooks/useDocumentUpload';
import { DOCUMENT_CLASSIFICATIONS } from '@/types/document';
import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Ban, FileText, Brain, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

interface VendorApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  currentStatus: VendorStatus;
  onConfirm: (newStatus: VendorStatus, notes?: string) => void;
  isLoading?: boolean;
}

export function VendorApprovalDialog({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  currentStatus,
  onConfirm,
  isLoading,
}: VendorApprovalDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [selectedStatus, setSelectedStatus] = useState<VendorStatus>(
    currentStatus === 'pending' ? 'approved' : currentStatus
  );
  const [notes, setNotes] = useState('');

  // Fetch vendor documents for review
  const { data: documents = [], isLoading: docsLoading } = useVendorDocuments(vendorId);

  const statusOptions: { value: VendorStatus; labelEn: string; labelAr: string; icon: typeof CheckCircle; className: string }[] = [
    { value: 'approved', labelEn: 'Approve', labelAr: 'اعتماد', icon: CheckCircle, className: 'text-emerald-600' },
    { value: 'suspended', labelEn: 'Suspend', labelAr: 'تعليق', icon: AlertTriangle, className: 'text-amber-600' },
    { value: 'blacklisted', labelEn: 'Blacklist', labelAr: 'حظر', icon: Ban, className: 'text-red-600' },
  ];

  const handleConfirm = () => {
    onConfirm(selectedStatus, notes || undefined);
    setNotes('');
  };

  // Calculate document stats
  const verifiedDocs = documents.filter(d => d.is_verified).length;
  const extractedDocs = documents.filter(d => d.extraction_status === 'completed').length;
  const avgConfidence = documents.length > 0
    ? Math.round(documents.reduce((sum, d) => sum + (d.ai_confidence_score || 0), 0) / documents.length)
    : 0;

  const getClassificationLabel = (classification: string | null) => {
    const found = DOCUMENT_CLASSIFICATIONS.find(c => c.value === classification);
    return found ? (isRTL ? found.labelAr : found.labelEn) : classification || 'Unknown';
  };

  const getConfidenceBadge = (score: number | null) => {
    if (!score) return null;
    const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="text-xs">
        {score}%
      </Badge>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRTL ? 'تحديث حالة المورد' : 'Update Vendor Status'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRTL
              ? `اختر الحالة الجديدة للمورد: ${vendorName}`
              : `Choose the new status for vendor: ${vendorName}`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Tabs defaultValue="action" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="action">
              <CheckCircle className="h-4 w-4 me-2" />
              {isRTL ? 'الإجراء' : 'Action'}
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 me-2" />
              {isRTL ? 'المستندات' : 'Documents'} ({documents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="action" className="space-y-4 py-4">
            <RadioGroup value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as VendorStatus)}>
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <div key={opt.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value} className={`flex items-center gap-2 cursor-pointer ${opt.className}`}>
                      <Icon className="h-4 w-4" />
                      {isRTL ? opt.labelAr : opt.labelEn}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            <div className="space-y-2">
              <Label>{isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRTL ? 'أضف ملاحظات...' : 'Add notes...'}
                rows={3}
              />
            </div>

            {/* Document Summary */}
            {documents.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      {isRTL ? 'ملخص المستندات' : 'Document Summary'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{documents.length}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'المستندات' : 'Documents'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{verifiedDocs}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'مُتحقق' : 'Verified'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{avgConfidence}%</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'ثقة AI' : 'AI Confidence'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="py-4 overflow-hidden">
            <ScrollArea className="h-[300px]">
              {docsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{isRTL ? 'لا توجد مستندات' : 'No documents uploaded'}</p>
                </div>
              ) : (
                <div className="space-y-3 pe-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="bg-card">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{doc.file_name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {getClassificationLabel(doc.classification)}
                              </Badge>
                              {getConfidenceBadge(doc.ai_confidence_score)}
                              {doc.is_verified ? (
                                <Badge variant="default" className="text-xs bg-emerald-600">
                                  <ShieldCheck className="h-3 w-3 me-1" />
                                  {isRTL ? 'مُتحقق' : 'Verified'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <ShieldAlert className="h-3 w-3 me-1" />
                                  {isRTL ? 'غير مُتحقق' : 'Unverified'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {doc.extraction_status === 'completed' && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <Brain className="h-3 w-3 me-1" />
                              {isRTL ? 'مُستخرج' : 'Extracted'}
                            </Badge>
                          )}
                        </div>

                        {/* Show extracted fields summary */}
                        {doc.extracted_data && (doc.extracted_data as any).extracted_fields?.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">
                              {isRTL ? 'البيانات المستخرجة:' : 'Extracted Data:'}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(doc.extracted_data as any).extracted_fields.slice(0, 4).map((field: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {field.key}: {String(field.value).slice(0, 20)}...
                                </Badge>
                              ))}
                              {(doc.extracted_data as any).extracted_fields.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(doc.extracted_data as any).extracted_fields.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading
              ? (isRTL ? 'جاري التحديث...' : 'Updating...')
              : (isRTL ? 'تأكيد' : 'Confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
