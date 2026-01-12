import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Plus, Pencil, Trash2, Layers } from 'lucide-react';

interface Category {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const MaterialCategoriesManagement: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    code: 'AUTO',
    name_en: '',
    name_ar: '',
    description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('code');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to fetch categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        code: category.code,
        name_en: category.name_en,
        name_ar: category.name_ar,
        description: category.description || '',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({ code: 'AUTO', name_en: '', name_ar: '', description: '', is_active: true });
    }
    setDialogOpen(true);
  };

  // Auto-generate code from name
  const generateCodeFromName = (name: string) => {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    return prefix.length >= 2 ? prefix : 'CAT';
  };

  const handleSave = async () => {
    if (!formData.name_en) {
      toast({
        title: t('common.error'),
        description: 'Please enter category name',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Auto-fill Arabic from English if empty
      const name_ar = formData.name_ar || formData.name_en;
      
      if (editingCategory) {
        const { error } = await supabase
          .from('inventory_categories')
          .update({ ...formData, name_ar })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: 'Category updated successfully',
        });
      } else {
        // Auto-generate code from name using database function
        const { data: codeData } = await supabase.rpc('get_category_code', { _name: formData.name_en });
        const generatedCode = codeData || generateCodeFromName(formData.name_en);
        
        const { error } = await supabase.from('inventory_categories').insert({
          code: generatedCode,
          name_en: formData.name_en,
          name_ar,
          description: formData.description || null,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: 'Category created successfully',
        });
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to save category',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase.from('inventory_categories').delete().eq('id', id);

      if (error) throw error;
      toast({
        title: t('common.success'),
        description: 'Category deleted successfully',
      });
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete category',
        variant: 'destructive',
      });
    }
  };

  const kpiItems: KPIItem[] = [
    {
      title: 'Total Categories',
      titleAr: 'إجمالي الفئات',
      value: categories.length.toString(),
      icon: Layers,
      color: 'primary',
    },
    {
      title: 'Active',
      titleAr: 'نشط',
      value: categories.filter(c => c.is_active).length.toString(),
      icon: Layers,
      color: 'success',
    },
    {
      title: 'Inactive',
      titleAr: 'غير نشط',
      value: categories.filter(c => !c.is_active).length.toString(),
      icon: Layers,
      color: 'warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title="Material Categories"
          titleAr="فئات المواد"
          description="Manage inventory material categories (Global standards pre-loaded)"
          descriptionAr="إدارة فئات مواد المخزون (المعايير العالمية محملة مسبقاً)"
          icon={Layers}
          actions={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {language === 'ar' ? 'إضافة فئة' : 'Add Category'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory 
                      ? (language === 'ar' ? 'تعديل الفئة' : 'Edit Category')
                      : (language === 'ar' ? 'إضافة فئة' : 'Add Category')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? 'Update category information'
                      : 'Add a new material category'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {editingCategory && (
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
                  {!editingCategory && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'سيتم إنشاء الرمز تلقائياً من اسم الفئة'
                        : 'Code will be auto-generated from category name'}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name_en">{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      placeholder="Category name in English"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) =>
                        setFormData({ ...formData, name_ar: e.target.value })
                      }
                      placeholder="اسم الفئة بالعربية"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                      rows={2}
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
            <CardTitle>{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</CardTitle>
            <CardDescription>
              {categories.length} {language === 'ar' ? 'فئات في النظام' : 'categories in the system'}
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
                    <TableHead>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-mono">{cat.code}</TableCell>
                        <TableCell>{cat.name_en}</TableCell>
                        <TableCell dir="rtl">{cat.name_ar}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {cat.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                            {cat.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(cat)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cat.id)}
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

export default MaterialCategoriesManagement;