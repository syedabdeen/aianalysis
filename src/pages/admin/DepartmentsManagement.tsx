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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  created_at: string;
}

const DepartmentsManagement: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('code');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to fetch departments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenDialog = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        code: department.code,
        name_en: department.name_en,
        name_ar: department.name_ar,
        is_active: department.is_active,
      });
    } else {
      setEditingDepartment(null);
      setFormData({ code: 'AUTO', name_en: '', name_ar: '', is_active: true });
    }
    setDialogOpen(true);
  };

  // Auto-generate code from name
  const generateCodeFromName = (name: string) => {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    return prefix.length >= 2 ? prefix : 'DEPT';
  };

  const handleSave = async () => {
    if (!formData.name_en) {
      toast({
        title: t('common.error'),
        description: 'Please enter department name',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Auto-fill Arabic from English if empty
      const name_ar = formData.name_ar || formData.name_en;
      
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update({ ...formData, name_ar })
          .eq('id', editingDepartment.id);

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: 'Department updated successfully',
        });
      } else {
        // Auto-generate code from name using database function
        const { data: codeData } = await supabase.rpc('get_department_code', { _name: formData.name_en });
        const generatedCode = codeData || `${generateCodeFromName(formData.name_en)}-001`;
        
        const { error } = await supabase.from('departments').insert({
          ...formData,
          code: generatedCode,
          name_ar,
        });

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: 'Department created successfully',
        });
      }

      setDialogOpen(false);
      fetchDepartments();
    } catch (error: any) {
      console.error('Error saving department:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to save department',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);

      if (error) throw error;
      toast({
        title: t('common.success'),
        description: 'Department deleted successfully',
      });
      fetchDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete department',
        variant: 'destructive',
      });
    }
  };

  const kpiItems: KPIItem[] = [
    {
      title: 'Total Departments',
      titleAr: 'إجمالي الأقسام',
      value: departments.length.toString(),
      icon: Building2,
      color: 'primary',
    },
    {
      title: 'Active',
      titleAr: 'نشط',
      value: departments.filter(d => d.is_active).length.toString(),
      icon: Building2,
      color: 'success',
    },
    {
      title: 'Inactive',
      titleAr: 'غير نشط',
      value: departments.filter(d => !d.is_active).length.toString(),
      icon: Building2,
      color: 'warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title={t('admin.departmentManagement')}
          titleAr="إدارة الأقسام"
          description="Manage organization departments"
          descriptionAr="إدارة أقسام المنظمة"
          icon={Building2}
          actions={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('admin.addDepartment')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingDepartment ? t('admin.edit') : t('admin.addDepartment')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDepartment
                      ? 'Update department information'
                      : 'Add a new department to the organization'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {editingDepartment && (
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
                  {!editingDepartment && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'سيتم إنشاء الرمز تلقائياً من اسم القسم'
                        : 'Code will be auto-generated from department name'}
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
                      placeholder="Department name in English"
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
                      placeholder="اسم القسم بالعربية"
                      dir="rtl"
                    />
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
            <CardTitle>All Departments</CardTitle>
            <CardDescription>
              {departments.length} departments in the organization
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
                    <TableHead>{t('admin.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-mono">{dept.code}</TableCell>
                        <TableCell>{dept.name_en}</TableCell>
                        <TableCell dir="rtl">{dept.name_ar}</TableCell>
                        <TableCell>
                          <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                            {dept.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(dept)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(dept.id)}
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

export default DepartmentsManagement;
