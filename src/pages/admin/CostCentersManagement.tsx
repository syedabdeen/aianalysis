import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Landmark } from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
}

interface CostCenter {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  department_id: string | null;
  is_active: boolean;
  departments?: Department;
}

const CostCentersManagement: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    department_id: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [costCentersRes, departmentsRes] = await Promise.all([
        supabase
          .from('cost_centers')
          .select(`
            *,
            departments (id, code, name_en, name_ar)
          `)
          .order('code'),
        supabase.from('departments').select('*').eq('is_active', true).order('code'),
      ]);

      if (costCentersRes.error) throw costCentersRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      setCostCenters(costCentersRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to fetch cost centers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (costCenter?: CostCenter) => {
    if (costCenter) {
      setEditingCostCenter(costCenter);
      setFormData({
        code: costCenter.code,
        name_en: costCenter.name_en,
        name_ar: costCenter.name_ar,
        department_id: costCenter.department_id || '',
        is_active: costCenter.is_active,
      });
    } else {
      setEditingCostCenter(null);
      setFormData({ code: 'AUTO', name_en: '', name_ar: '', department_id: '', is_active: true });
    }
    setDialogOpen(true);
  };

  // Auto-generate code from name
  const generateCodeFromName = (name: string) => {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    return prefix.length >= 2 ? `CC-${prefix}` : 'CC-GEN';
  };

  const handleSave = async () => {
    if (!formData.name_en) {
      toast({
        title: t('common.error'),
        description: 'Please enter cost center name',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Auto-fill Arabic from English if empty
      const name_ar = formData.name_ar || formData.name_en;
      
      const dataToSave = {
        name_en: formData.name_en,
        name_ar,
        department_id: formData.department_id || null,
        is_active: formData.is_active,
      };

      if (editingCostCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update({ ...dataToSave, code: formData.code })
          .eq('id', editingCostCenter.id);

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: 'Cost center updated successfully',
        });
      } else {
        // Auto-generate code from name using database function
        const { data: codeData } = await supabase.rpc('get_cost_center_code', { _name: formData.name_en });
        const generatedCode = codeData || generateCodeFromName(formData.name_en);
        
        const { error } = await supabase.from('cost_centers').insert({
          ...dataToSave,
          code: generatedCode,
        });

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: 'Cost center created successfully',
        });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving cost center:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to save cost center',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost center?')) return;

    try {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id);

      if (error) throw error;
      toast({
        title: t('common.success'),
        description: 'Cost center deleted successfully',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting cost center:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete cost center',
        variant: 'destructive',
      });
    }
  };

  const kpiItems: KPIItem[] = [
    {
      title: 'Total Cost Centers',
      titleAr: 'إجمالي مراكز التكلفة',
      value: costCenters.length.toString(),
      icon: Landmark,
      color: 'primary',
    },
    {
      title: 'Active',
      titleAr: 'نشط',
      value: costCenters.filter(c => c.is_active).length.toString(),
      icon: Landmark,
      color: 'success',
    },
    {
      title: 'Inactive',
      titleAr: 'غير نشط',
      value: costCenters.filter(c => !c.is_active).length.toString(),
      icon: Landmark,
      color: 'warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title={t('admin.costCenterManagement')}
          titleAr="إدارة مراكز التكلفة"
          description="Manage cost centers and their department associations"
          descriptionAr="إدارة مراكز التكلفة وارتباطاتها بالأقسام"
          icon={Landmark}
          actions={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('admin.addCostCenter')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCostCenter ? t('admin.edit') : t('admin.addCostCenter')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCostCenter
                      ? 'Update cost center information'
                      : 'Add a new cost center'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {editingCostCenter && (
                    <div className="space-y-2">
                      <Label htmlFor="code">{t('admin.code')}</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        disabled
                        className="font-mono bg-muted"
                      />
                    </div>
                  )}
                  {!editingCostCenter && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'سيتم إنشاء الرمز تلقائياً من اسم مركز التكلفة'
                        : 'Code will be auto-generated from cost center name'}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name_en">{t('admin.nameEn')}</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      placeholder="Cost center name in English"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">{t('admin.nameAr')}</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) =>
                        setFormData({ ...formData, name_ar: e.target.value })
                      }
                      placeholder="اسم مركز التكلفة بالعربية"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">{t('admin.department')}</Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, department_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {language === 'ar' ? dept.name_ar : dept.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">{t('admin.active')}</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('admin.cancel')}
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('admin.save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <ModuleKPIDashboard items={kpiItems} />

        <Card>
          <CardHeader>
            <CardTitle>All Cost Centers</CardTitle>
            <CardDescription>
              {costCenters.length} cost centers configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.code')}</TableHead>
                    <TableHead>{t('admin.nameEn')}</TableHead>
                    <TableHead>{t('admin.nameAr')}</TableHead>
                    <TableHead>{t('admin.department')}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    costCenters.map((cc) => (
                      <TableRow key={cc.id}>
                        <TableCell className="font-mono">{cc.code}</TableCell>
                        <TableCell>{cc.name_en}</TableCell>
                        <TableCell dir="rtl">{cc.name_ar}</TableCell>
                        <TableCell>
                          {cc.departments
                            ? language === 'ar'
                              ? cc.departments.name_ar
                              : cc.departments.name_en
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cc.is_active ? 'default' : 'secondary'}>
                            {cc.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(cc)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cc.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CostCentersManagement;
