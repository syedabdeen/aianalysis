import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserApprovers, useDeleteUserApprover, UserApprover } from '@/hooks/useUserApprovers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Pencil, Trash2, User, CheckCircle2, XCircle } from 'lucide-react';

const MODULE_LABELS: Record<string, { en: string; ar: string }> = {
  purchase_request: { en: 'PR', ar: 'ط.ش' },
  purchase_order: { en: 'PO', ar: 'أ.ش' },
  rfq: { en: 'RFQ', ar: 'ط.ع.أ' },
  project: { en: 'Project', ar: 'مشروع' },
  contracts: { en: 'Contracts', ar: 'عقود' },
  payments: { en: 'Payments', ar: 'مدفوعات' },
};

interface UserApproversTableProps {
  onEdit: (approver: UserApprover) => void;
}

export const UserApproversTable: React.FC<UserApproversTableProps> = ({ onEdit }) => {
  const { language } = useLanguage();
  const { data: approvers, isLoading } = useUserApprovers();
  const deleteApprover = useDeleteUserApprover();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatAmount = (amount: number | null) => {
    if (amount === null) return language === 'ar' ? 'بدون حد' : 'Unlimited';
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
              <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
              <TableHead>{language === 'ar' ? 'الوحدات' : 'Modules'}</TableHead>
              <TableHead>{language === 'ar' ? 'الحد الأقصى' : 'Max Amount'}</TableHead>
              <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvers?.map((approver) => (
              <TableRow key={approver.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{approver.user?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{approver.user?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-primary/10">
                    {approver.approver_role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {approver.modules.map((mod) => (
                      <Badge key={mod} variant="secondary" className="text-xs">
                        {language === 'ar' ? MODULE_LABELS[mod]?.ar : MODULE_LABELS[mod]?.en || mod}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatAmount(approver.max_approval_amount)}</span>
                </TableCell>
                <TableCell>
                  {approver.is_active ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'معطل' : 'Inactive'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(approver)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(approver.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'حذف' : 'Remove'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!approvers || approvers.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد معتمدون' : 'No approvers configured'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'إزالة المعتمد' : 'Remove Approver'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'هل أنت متأكد من إزالة صلاحيات الموافقة لهذا المستخدم؟'
                : 'Are you sure you want to remove approval permissions for this user?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteApprover.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'ar' ? 'إزالة' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
