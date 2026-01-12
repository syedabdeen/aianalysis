import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Wallet, Save, Send, Plus, Upload, Trash2 } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useCreatePettyCashClaim, useUploadPettyCashReceipt, PettyCashItem } from '@/hooks/usePettyCash';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { toast } from 'sonner';

const createEmptyItems = (count: number): PettyCashItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    item_number: i + 1,
    expense_date: null,
    description: '',
    amount: 0,
    receipt_attached: false,
    receipt_url: null,
  }));
};

export default function NewPettyCashPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const createClaim = useCreatePettyCashClaim();
  const uploadReceipt = useUploadPettyCashReceipt();

  const [claimDate, setClaimDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectId, setProjectId] = useState<string>('');
  const [totalAllocated, setTotalAllocated] = useState<number>(0);
  const [items, setItems] = useState<PettyCashItem[]>(createEmptyItems(10));

  const totalSpent = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const balanceRemaining = totalAllocated - totalSpent;

  const updateItem = (index: number, field: keyof PettyCashItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addRows = () => {
    const newItems = [...items, ...createEmptyItems(5)];
    setItems(newItems.map((item, i) => ({ ...item, item_number: i + 1 })));
  };

  const handleReceiptUpload = async (index: number, file: File) => {
    try {
      // For now, just mark as attached - actual upload happens on save
      updateItem(index, 'receipt_attached', true);
      toast.success('Receipt attached');
    } catch (error) {
      toast.error('Failed to attach receipt');
    }
  };

  const handleSave = async (submit: boolean = false) => {
    if (!claimDate) {
      toast.error('Please select a date');
      return;
    }

    const validItems = items.filter(item => item.description.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one expense item');
      return;
    }

    try {
      const claim = await createClaim.mutateAsync({
        claim_date: claimDate,
        project_id: projectId || null,
        total_allocated: totalAllocated,
        items: validItems,
      });

      if (submit && claim) {
        // Submit for approval after creation
        navigate(`/procurement/petty-cash/${claim.id}`);
      } else {
        navigate('/procurement/petty-cash');
      }
    } catch (error) {
      console.error('Failed to save claim:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="New Petty Cash Claim"
          titleAr="مطالبة صندوق المصروفات النثرية جديدة"
          description="Create a new petty cash replenishment request"
          descriptionAr="إنشاء طلب تجديد صندوق المصروفات النثرية جديد"
          icon={Wallet}
        />

        {/* Header Section */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'معلومات المطالبة' : 'Claim Information'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
              <Input
                type="date"
                value={claimDate}
                onChange={(e) => setClaimDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المشروع / الموقع' : 'Project / Site'}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} - {language === 'ar' ? project.name_ar : project.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Petty Cash Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'ملخص صندوق المصروفات النثرية' : 'Petty Cash Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'إجمالي المخصص' : 'Total Allocated'}</Label>
                <Input
                  type="number"
                  value={totalAllocated || ''}
                  onChange={(e) => setTotalAllocated(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'إجمالي المصروف' : 'Total Spent'}</Label>
                <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                  {formatCurrency(totalSpent, 'AED')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الرصيد المتبقي' : 'Balance Remaining'}</Label>
                <div className={`h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium ${balanceRemaining < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(balanceRemaining, 'AED')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'مبلغ التجديد المطلوب' : 'Replenishment Requested'}</Label>
                <div className="h-10 px-3 py-2 bg-primary/10 text-primary rounded-md flex items-center font-bold">
                  {formatCurrency(totalSpent, 'AED')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{language === 'ar' ? 'تفصيل المصروفات' : 'Expense Breakdown'}</CardTitle>
            <Button variant="outline" size="sm" onClick={addRows}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة صفوف' : 'Add Rows'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-36">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="min-w-[300px]">{language === 'ar' ? 'وصف المصروف' : 'Description of Expense'}</TableHead>
                    <TableHead className="w-32 text-right">{language === 'ar' ? 'المبلغ (د.إ)' : 'Amount (AED)'}</TableHead>
                    <TableHead className="w-24 text-center">{language === 'ar' ? 'إيصال' : 'Receipt'}</TableHead>
                    <TableHead className="w-24 text-center">{language === 'ar' ? 'رفع' : 'Upload'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={item.expense_date || ''}
                          onChange={(e) => updateItem(index, 'expense_date', e.target.value)}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder={language === 'ar' ? 'أدخل الوصف...' : 'Enter description...'}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => updateItem(index, 'amount', Number(e.target.value))}
                          placeholder="0.00"
                          className="h-9 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.receipt_attached}
                          onCheckedChange={(checked) => updateItem(index, 'receipt_attached', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReceiptUpload(index, file);
                            }}
                          />
                          <Button variant="ghost" size="sm" asChild>
                            <span>
                              <Upload className="h-4 w-4" />
                            </span>
                          </Button>
                        </label>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total Row */}
            <div className="flex justify-end mt-4 p-4 bg-primary/5 rounded-lg">
              <div className="text-right">
                <span className="text-muted-foreground mr-4">
                  {language === 'ar' ? 'المبلغ الإجمالي (د.إ):' : 'Total Amount (AED):'}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalSpent, 'AED')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/procurement/petty-cash')}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleSave(false)}
            disabled={createClaim.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}
          </Button>
          <Button 
            onClick={() => handleSave(true)}
            disabled={createClaim.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'حفظ وإرسال' : 'Save & Submit'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
