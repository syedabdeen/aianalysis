import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ApprovalActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (comments?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  mode: 'approve' | 'reject';
  documentType: string;
  documentCode: string;
  isLoading?: boolean;
}

export function ApprovalActionsDialog({
  isOpen,
  onClose,
  onApprove,
  onReject,
  mode,
  documentType,
  documentCode,
  isLoading = false,
}: ApprovalActionsDialogProps) {
  const { language } = useLanguage();
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  const handleConfirm = async () => {
    if (mode === 'approve') {
      await onApprove(comments || undefined);
    } else {
      if (!reason.trim()) return;
      await onReject(reason);
    }
    setReason('');
    setComments('');
    onClose();
  };

  const getTitle = () => {
    if (mode === 'approve') {
      return language === 'ar' ? `الموافقة على ${documentCode}` : `Approve ${documentCode}`;
    }
    return language === 'ar' ? `رفض ${documentCode}` : `Reject ${documentCode}`;
  };

  const getDescription = () => {
    if (mode === 'approve') {
      return language === 'ar'
        ? 'هل أنت متأكد من الموافقة على هذا المستند؟ يمكنك إضافة تعليق اختياري.'
        : 'Are you sure you want to approve this document? You can add an optional comment.';
    }
    return language === 'ar'
      ? 'يرجى تقديم سبب الرفض. سيتم إخطار مقدم الطلب وإعادة المستند للتعديل.'
      : 'Please provide a reason for rejection. The requester will be notified and the document will be returned for revision.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'approve' ? (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)'}</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  language === 'ar' ? 'أدخل تعليقك هنا...' : 'Enter your comment here...'
                }
                rows={3}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-destructive">
                {language === 'ar' ? 'سبب الرفض *' : 'Rejection Reason *'}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'أدخل سبب الرفض هنا... (إلزامي)'
                    : 'Enter rejection reason here... (required)'
                }
                rows={4}
                className="border-destructive/50 focus:border-destructive"
              />
              {!reason.trim() && (
                <p className="text-xs text-destructive">
                  {language === 'ar' ? 'سبب الرفض مطلوب' : 'Rejection reason is required'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          {mode === 'approve' ? (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تأكيد الموافقة' : 'Confirm Approval'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!reason.trim() || isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
