import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useApprovalThresholds,
  useDeleteApprovalThreshold,
  ApprovalThreshold,
} from '@/hooks/useUserApprovers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { FileText, ShoppingCart, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ApprovalThresholdDialog } from './ApprovalThresholdDialog';

export const ApprovalThresholdsTable: React.FC = () => {
  const { language } = useLanguage();
  const { data: thresholds, isLoading } = useApprovalThresholds();
  const deleteThreshold = useDeleteApprovalThreshold();

  const [activeTab, setActiveTab] = useState<string>('pr');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedThreshold, setSelectedThreshold] = useState<ApprovalThreshold | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [thresholdToDelete, setThresholdToDelete] = useState<ApprovalThreshold | null>(null);

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '∞';
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const prThresholds = thresholds?.filter((t) => t.module === 'purchase_request') || [];
  const poThresholds = thresholds?.filter((t) => t.module === 'purchase_order') || [];

  const handleAdd = () => {
    setSelectedThreshold(null);
    setDialogOpen(true);
  };

  const handleEdit = (threshold: ApprovalThreshold) => {
    setSelectedThreshold(threshold);
    setDialogOpen(true);
  };

  const handleDeleteClick = (threshold: ApprovalThreshold) => {
    setThresholdToDelete(threshold);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (thresholdToDelete) {
      await deleteThreshold.mutateAsync(thresholdToDelete.id);
      setDeleteDialogOpen(false);
      setThresholdToDelete(null);
    }
  };

  const getDefaultModule = () => {
    return activeTab === 'pr' ? 'purchase_request' : 'purchase_order';
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const ThresholdTable = ({ data }: { data: typeof thresholds }) => (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[80px]">{language === 'ar' ? 'المستوى' : 'Level'}</TableHead>
            <TableHead>{language === 'ar' ? 'النطاق المالي' : 'Value Range'}</TableHead>
            <TableHead>{language === 'ar' ? 'المعتمد' : 'Approver'}</TableHead>
            <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
            <TableHead className="w-[80px]">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((threshold) => (
            <TableRow key={threshold.id} className="hover:bg-muted/20">
              <TableCell>
                <Badge variant="outline" className="bg-primary/10">
                  {threshold.sequence_order}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">
                  {formatAmount(threshold.min_amount)} - {formatAmount(threshold.max_amount)}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {language === 'ar' ? threshold.approver_role_ar : threshold.approver_role}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={threshold.is_active ? 'default' : 'secondary'}>
                  {threshold.is_active
                    ? language === 'ar'
                      ? 'نشط'
                      : 'Active'
                    : language === 'ar'
                    ? 'غير نشط'
                    : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(threshold)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(threshold)}
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
          {(!data || data.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {language === 'ar'
                  ? 'لا توجد حدود موافقة. اضغط على "إضافة حد جديد" للبدء.'
                  : 'No approval thresholds. Click "Add Threshold" to get started.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {language === 'ar' ? 'حدود الموافقة حسب القيمة' : 'Value-Based Approval Thresholds'}
          </CardTitle>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'إضافة حد جديد' : 'Add Threshold'}
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pr" className="gap-2">
                <FileText className="h-4 w-4" />
                {language === 'ar' ? 'طلب الشراء' : 'Purchase Request'}
              </TabsTrigger>
              <TabsTrigger value="po" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {language === 'ar' ? 'أمر الشراء' : 'Purchase Order'}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pr">
              <ThresholdTable data={prThresholds} />
            </TabsContent>
            <TabsContent value="po">
              <ThresholdTable data={poThresholds} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ApprovalThresholdDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        threshold={selectedThreshold}
        defaultModule={getDefaultModule()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف حد الموافقة' : 'Delete Approval Threshold'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'هل أنت متأكد من حذف هذا الحد؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this threshold? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
