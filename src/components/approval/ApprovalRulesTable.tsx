import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApprovalRules, useDeleteApprovalRule } from '@/hooks/useApprovalMatrix';
import { APPROVAL_CATEGORIES, ApprovalCategory, ApprovalRule } from '@/types/approval';
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
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Users, 
  ChevronDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface ApprovalRulesTableProps {
  onEdit: (rule: ApprovalRule) => void;
  onManageApprovers: (rule: ApprovalRule) => void;
  selectedCategory?: ApprovalCategory;
}

export const ApprovalRulesTable: React.FC<ApprovalRulesTableProps> = ({
  onEdit,
  onManageApprovers,
  selectedCategory,
}) => {
  const { isRTL, language } = useLanguage();
  const { data: rules, isLoading } = useApprovalRules(selectedCategory);
  const deleteRule = useDeleteApprovalRule();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '∞';
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryBadgeColor = (category: ApprovalCategory) => {
    const colors: Record<string, string> = {
      purchase_request: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      purchase_order: 'bg-green-500/20 text-green-400 border-green-500/30',
      contracts: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      capex: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      payments: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      float_cash: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
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
              <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
              <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
              <TableHead>{language === 'ar' ? 'النطاق المالي' : 'Amount Range'}</TableHead>
              <TableHead>{language === 'ar' ? 'الموافقة التلقائية' : 'Auto Approve'}</TableHead>
              <TableHead>{language === 'ar' ? 'المعتمدون' : 'Approvers'}</TableHead>
              <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules?.map((rule) => (
              <TableRow key={rule.id} className="hover:bg-muted/20">
                <TableCell>
                  <div>
                    <p className="font-medium">{language === 'ar' ? rule.name_ar : rule.name_en}</p>
                    <p className="text-xs text-muted-foreground">v{rule.version}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getCategoryBadgeColor(rule.category)}>
                    {language === 'ar' 
                      ? APPROVAL_CATEGORIES[rule.category].label_ar 
                      : APPROVAL_CATEGORIES[rule.category].label_en}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatAmount(rule.min_amount)} - {formatAmount(rule.max_amount)}
                  </span>
                </TableCell>
                <TableCell>
                  {rule.auto_approve_below ? (
                    <span className="text-sm text-green-400">
                      &lt; {formatAmount(rule.auto_approve_below)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageApprovers(rule)}
                    className="gap-1"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{rule.approvers?.length || 0}</span>
                  </Button>
                </TableCell>
                <TableCell>
                  {rule.is_active ? (
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
                    <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                      <DropdownMenuItem onClick={() => onEdit(rule)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageApprovers(rule)}>
                        <Users className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'إدارة المعتمدين' : 'Manage Approvers'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(rule.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!rules || rules.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد قواعد' : 'No rules found'}
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
              {language === 'ar' ? 'حذف القاعدة' : 'Delete Rule'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذه القاعدة؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this rule? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteRule.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
