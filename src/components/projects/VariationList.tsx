import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectVariations, useCreateVariation, useApproveVariation } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { VariationFormData, VariationType } from '@/types/project';

interface VariationListProps {
  projectId: string;
}

const typeIcons: Record<VariationType, React.ElementType> = {
  addition: TrendingUp,
  deduction: TrendingDown,
  scope_change: RefreshCw,
};

const typeColors: Record<VariationType, string> = {
  addition: 'text-green-600',
  deduction: 'text-red-600',
  scope_change: 'text-blue-600',
};

const typeLabels: Record<VariationType, { en: string; ar: string }> = {
  addition: { en: 'Addition', ar: 'إضافة' },
  deduction: { en: 'Deduction', ar: 'خصم' },
  scope_change: { en: 'Scope Change', ar: 'تغيير النطاق' },
};

export function VariationList({ projectId }: VariationListProps) {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { data: variations, isLoading } = useProjectVariations(projectId);
  const createVariation = useCreateVariation();
  const approveVariation = useApproveVariation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isFinanceManager, setIsFinanceManager] = useState(false);
  const [formData, setFormData] = useState<VariationFormData>({
    description_en: '',
    description_ar: '',
    variation_type: 'addition',
    amount: 0,
    justification: '',
  });

  // Check if user is Finance Manager (has manager role)
  useEffect(() => {
    const checkFinanceRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      // Finance Manager can add variations (manager role)
      setIsFinanceManager(data?.role === 'manager' || data?.role === 'admin');
    };
    checkFinanceRole();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVariation.mutateAsync({ projectId, data: formData });
    setIsOpen(false);
    setFormData({ description_en: '', description_ar: '', variation_type: 'addition', amount: 0, justification: '' });
  };

  const handleApprove = async (id: string, approved: boolean) => {
    await approveVariation.mutateAsync({ id, approved });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined });
  };

  const formatAmount = (amount: number, type: VariationType) => {
    const prefix = type === 'deduction' ? '-' : '+';
    return `${prefix} ${new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE').format(amount)} AED`;
  };

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{language === 'ar' ? 'التغييرات' : 'Variations'}</CardTitle>
        {isFinanceManager ? (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {language === 'ar' ? 'إضافة تغيير' : 'Add Variation'}
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة تغيير جديد' : 'Add New Variation'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                  <Input
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Input
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    required
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                  <Select
                    value={formData.variation_type}
                    onValueChange={(v) => setFormData({ ...formData, variation_type: v as VariationType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="addition">{language === 'ar' ? 'إضافة' : 'Addition'}</SelectItem>
                      <SelectItem value="deduction">{language === 'ar' ? 'خصم' : 'Deduction'}</SelectItem>
                      <SelectItem value="scope_change">{language === 'ar' ? 'تغيير النطاق' : 'Scope Change'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المبرر' : 'Justification'}</Label>
                <Textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={createVariation.isPending}>
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4" />
            {language === 'ar' ? 'فقط المدير المالي يمكنه إضافة التغييرات' : 'Only Finance Manager can add variations'}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {variations?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === 'ar' ? 'لا توجد تغييرات' : 'No variations yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {variations?.map((variation) => {
              const Icon = typeIcons[variation.variation_type];
              return (
                <div
                  key={variation.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-muted ${typeColors[variation.variation_type]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{variation.variation_code}</span>
                        <Badge variant={
                          variation.status === 'approved' ? 'default' :
                          variation.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {variation.status === 'approved' ? (language === 'ar' ? 'معتمد' : 'Approved') :
                           variation.status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                           (language === 'ar' ? 'معلق' : 'Pending')}
                        </Badge>
                      </div>
                      <p className="font-medium">
                        {language === 'ar' ? variation.description_ar : variation.description_en}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(variation.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${typeColors[variation.variation_type]}`}>
                      {formatAmount(variation.amount, variation.variation_type)}
                    </span>
                    {isAdmin && variation.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600"
                          onClick={() => handleApprove(variation.id, true)}
                          disabled={approveVariation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleApprove(variation.id, false)}
                          disabled={approveVariation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
